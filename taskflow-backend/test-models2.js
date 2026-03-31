const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyDJdOCX7x9txqCWv1TbPpOY6g3cnz2TTi8");

async function testLimits() {
  const modelsToTest = ["gemini-flash-latest", "gemini-2.0-flash-lite", "gemini-2.5-flash"];
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
