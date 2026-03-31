const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyDJdOCX7x9txqCWv1TbPpOY6g3cnz2TTi8");

async function testLimits() {
  const modelsToTest = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-test"]; // fallback names
  for (const m of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent("hi");
      console.log(m, "WORKS:", res.response.text());
      return; 
    } catch (e) {
      console.log(m, "FAILED:", e.message.split('\n')[0].substring(0, 100));
    }
  }
}

testLimits();

try {
  const pdfParse = require("pdf-parse");
  console.log("pdfParse type is:", typeof pdfParse);
} catch (e) {
  console.log("pdfParse require fail:", e.message);
}
