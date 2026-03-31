const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyDJdOCX7x9txqCWv1TbPpOY6g3cnz2TTi8");

async function checkModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDJdOCX7x9txqCWv1TbPpOY6g3cnz2TTi8`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const flashModels = data.models.filter(m => m.name.includes('flash') && m.supportedGenerationMethods.includes('generateContent'));
    console.log("Available GenerateContent Flash models:");
    flashModels.forEach(m => console.log("- " + m.name.replace("models/", "")));
    
    // Fallback if no flash models
    if (flashModels.length === 0) {
      console.log("No flash models. Let's list any generateContent gemini models:");
      const anyGemini = data.models.filter(m => m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent'));
      anyGemini.forEach(m => console.log("- " + m.name.replace("models/", "")));
    }
  } catch(e) { console.error(e); }
}

checkModels();
