const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyDJdOCX7x9txqCWv1TbPpOY6g3cnz2TTi8");

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello!");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Error with gemini-1.5-flash:", err.message);
    try {
      console.log("Trying gemini-pro...");
      const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result2 = await model2.generateContent("Hello!");
      console.log("Success with gemini-pro:", result2.response.text());
    } catch (err2) {
      console.error("Error with gemini-pro:", err2.message);
    }
  }
}

test();
