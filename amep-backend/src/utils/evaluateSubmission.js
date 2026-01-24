/**
 * Central evaluation engine
 * Judge0-ready with mock fallback
 */

const evaluateSubmission = async ({
  problem,
  code,
  hintsUsed,
  timeTaken
}) => {
  try {
    /**
     * 🔮 FUTURE: Judge0 integration goes here
     * If Judge0 is configured, execute code and evaluate output
     */

    // ❌ For now, force fallback to mock
    throw new Error("Judge0 not configured");

  } catch (error) {
    // ✅ MOCK EVALUATION (SAFE FALLBACK)

    let isCorrect = false;

    // Simple deterministic rule (hackathon-safe)
    if (hintsUsed <= 1 && timeTaken <= 60) {
      isCorrect = true;
    }

    // PERFORMANCE SCORE
    let performanceScore = 0;

    if (isCorrect) performanceScore += 60;

    // Time score
    if (timeTaken <= 30) performanceScore += 20;
    else if (timeTaken <= 60) performanceScore += 10;

    // Hint score
    if (hintsUsed === 0) performanceScore += 20;
    else if (hintsUsed === 1) performanceScore += 10;

    return {
      isCorrect,
      performanceScore
    };
  }
};

module.exports = evaluateSubmission;