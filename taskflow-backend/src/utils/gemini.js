const { GoogleGenerativeAI } = require("@google/generative-ai");

// Candidate models ordered by preference.
// gemini-3.1-flash-lite: newest, high free-tier quota (~1500 RPD).
// gemini-2.5-flash: older but capable, lower free-tier quota (~20 RPD).
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
];

/**
 * Detect if an error is a per-minute rate limit (retryable after a short wait)
 * vs. a per-day quota exhaustion (must fall through to next model).
 */
function parseRateLimitError(errMessage) {
  const lower = (errMessage || "").toLowerCase();
  const isRateLimit = lower.includes("429") || lower.includes("quota") ||
    lower.includes("too many requests") || lower.includes("resourceexhausted");
  if (!isRateLimit) return null;

  // Check if the error mentions per-minute limits (retryable) vs per-day (fatal)
  const isPerMinute = lower.includes("per_minute") || lower.includes("perminute") ||
    lower.includes("requests_per_minute") || lower.includes("rpm");
  const isPerDay = lower.includes("per_day") || lower.includes("perday") ||
    lower.includes("requests_per_day") || lower.includes("rpd");

  // Try to extract a retry delay from the error message
  const retryMatch = errMessage.match(/retry\s*(?:in|after)\s*(\d+(?:\.\d+)?)\s*s/i);
  const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;

  return { isPerMinute, isPerDay, retrySeconds };
}

/**
 * Generate content using Gemini AI with automatic model fallback and rate limit handling.
 * 
 * @param {Object} options
 * @param {string} options.prompt - Prompt text to send to Gemini
 * @param {boolean} [options.jsonMode=false] - Whether to require structured JSON response
 * @returns {Promise<{ text: string, modelUsed: string }>}
 */
async function generateContentWithFallback({ prompt, jsonMode = false }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "mock_key_for_now") {
    throw new Error("Valid GEMINI_API_KEY environment variable is missing.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    // Each model gets up to 2 attempts (retry once on per-minute limit)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[Gemini AI] Attempting generation with model: ${modelName} (attempt ${attempt + 1})`);
        const modelConfig = { model: modelName };
        if (jsonMode) {
          modelConfig.generationConfig = { responseMimeType: "application/json" };
        }

        const model = genAI.getGenerativeModel(modelConfig);
        const result = await model.generateContent(prompt);
        let rawText = result.response.text().trim();

        // Clean up markdown fences if present
        if (rawText.startsWith("```json")) {
          rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (rawText.startsWith("```")) {
          rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        console.log(`[Gemini AI] Successfully generated content using ${modelName}`);
        return { text: rawText, modelUsed: modelName };
      } catch (err) {
        console.warn(`[Gemini AI] Model ${modelName} attempt ${attempt + 1} failed: ${err.message}`);
        lastError = err;

        const rlInfo = parseRateLimitError(err.message);

        if (rlInfo) {
          if (rlInfo.isPerDay) {
            // Daily quota exhausted for this model — skip to next model
            console.warn(`[Gemini AI] Daily quota exhausted for ${modelName}, trying next model.`);
            break;
          }
          if (rlInfo.isPerMinute && attempt === 0) {
            // Per-minute limit — wait and retry this same model once
            const waitSec = Math.min(rlInfo.retrySeconds || 15, 40);
            console.log(`[Gemini AI] Per-minute limit hit for ${modelName}, waiting ${waitSec}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
            continue;
          }
        }

        // For non-rate-limit errors (404 etc.), skip to next model immediately
        break;
      }
    }

    // Brief delay before trying next candidate model in fallback chain
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // If all models in the fallback array failed:
  console.error("[Gemini AI] All models failed. Last error details:", lastError?.message);
  
  const errLower = (lastError?.message || "").toLowerCase();
  if (errLower.includes("429") || errLower.includes("quota") || errLower.includes("too many requests") || errLower.includes("resourceexhausted")) {
    throw new Error("Gemini AI API rate limit reached across all models. Please wait a minute and try again.");
  }

  throw new Error("Unable to connect to Gemini AI services right now. Please try again shortly.");
}

module.exports = {
  generateContentWithFallback,
};

