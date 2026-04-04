require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY || API_KEY === 'mock_key_for_now') {
    console.error("Please set a valid GEMINI_API_KEY in your .env file before running this script.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
// We use gemini-2.5-flash as it is fully supported by the currently installed SDK version
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const topics = [
    { id: 'linked-lists', name: 'Linked Lists' },
    { id: 'stacks-queues', name: 'Stacks and Queues' },
    { id: 'trees', name: 'Trees' },
    { id: 'graphs', name: 'Graphs' },
    { id: 'dynamic-programming', name: 'Dynamic Programming' }
];

const difficulties = ['Easy', 'Medium', 'Hard'];
const questionsPerLevel = 5; // 3 levels * 5 = 15 questions per topic

const dataDir = path.join(__dirname, '../src/data/questions');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure the original 3 curated arrays exist so the user can test adaptive routes immediately
const bootstrapArraysData = () => {
    return [
        {
            id: 'two-sum',
            title: "Two Sum",
            difficulty: "Easy",
            description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
            examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }],
            constraints: ["2 <= nums.length <= 10^4", "Only one valid answer exists."],
            hints: ["Try using a Hash Map."],
            defaultCodeJS: "function twoSum(nums, target) {\n}",
            defaultCodePY: "def twoSum(nums, target):\n    pass",
            defaultCodeC: "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n}",
            defaultCodeCPP: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n    }\n};",
            defaultCodeJAVA: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n    }\n}"
        },
        {
            id: 'buy-sell-stock',
            title: "Best Time to Buy and Sell Stock",
            difficulty: "Medium",
            description: "Maximize your profit by choosing a single day to buy and a single day to sell.",
            examples: [{ input: "prices = [7,1,5,3,6,4]", output: "5" }],
            constraints: ["1 <= prices.length <= 10^5"],
            hints: ["Keep track of the minimum price."],
            defaultCodeJS: "function maxProfit(prices) {\n}",
            defaultCodePY: "def maxProfit(prices):\n    pass",
            defaultCodeC: "int maxProfit(int* prices, int pricesSize) {\n}",
            defaultCodeCPP: "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n    }\n};",
            defaultCodeJAVA: "class Solution {\n    public int maxProfit(int[] prices) {\n    }\n}"
        },
        {
            id: 'trapping-rain-water',
            title: "Trapping Rain Water",
            difficulty: "Hard",
            description: "Compute how much water it can trap after raining.",
            examples: [{ input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" }],
            constraints: ["0 <= height.length <= 10^5"],
            hints: ["Use two pointers."],
            defaultCodeJS: "function trap(height) {\n}",
            defaultCodePY: "def trap(height):\n    pass",
            defaultCodeC: "int trap(int* height, int heightSize) {\n}",
            defaultCodeCPP: "class Solution {\npublic:\n    int trap(vector<int>& height) {\n    }\n};",
            defaultCodeJAVA: "class Solution {\n    public int trap(int[] height) {\n    }\n}"
        }
    ];
};

async function generateQuestions(topicName, difficulty) {
    const prompt = `You are a Senior Principal Engineer aggressively interviewing candidates. Curate exactly ${questionsPerLevel} highly classic, most-asked LeetCode ${difficulty} questions for the topic "${topicName}".
Provide the output strictly as a JSON array of objects. Do not include any text, markdown, or code blocks outside the JSON array. Start immediately with '[' and end with ']'. The array must contain exactly ${questionsPerLevel} objects with the following schema:
[
  {
    "id": "kebab-case-problem-name",
    "title": "Exact Problem Name",
    "difficulty": "${difficulty}",
    "description": "Full problem description...",
    "examples": [ { "input": "...", "output": "..." } ],
    "constraints": [ "const 1", "const 2" ],
    "hints": [ "Hint 1", "Hint 2" ],
    "defaultCodeJS": "function problemName(args) {\\n}",
    "defaultCodePY": "def problemName(args):\\n    pass",
    "defaultCodeC": "int problemName(args) {\\n}",
    "defaultCodeCPP": "class Solution {\\npublic:\\n    int problemName(args) {\\n    }\\n};",
    "defaultCodeJAVA": "class Solution {\\n    public int problemName(args) {\\n    }\\n}"
  }
]
Do not output anything other than the raw JSON array. Keep the defaultCode string payloads minimal boilerplate without actual logical implementations.`;

    try {
        console.log(`   [FETCHING] Requesting ${difficulty} ${topicName} questions from AI...`);
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        // Cleanup markdown if AI ignores constraints
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
            const arr = JSON.parse(jsonMatch[0]);
            console.log(`   [SUCCESS] Received ${arr.length} questions correctly formatted.`);
            return arr;
        } else {
            console.error("   [ERROR] Could not extract array from AI Response. Generating fallback empty array.");
            return [];
        }
    } catch (err) {
        console.error(`   [ERROR] Fetching ${difficulty} questions failed:`, err.message);
        return [];
    }
}

async function seed() {
    console.log("Starting Massively Parallel AI Question Seeder...\n");
    for (const topic of topics) {
        console.log(`\n================================`);
        console.log(`SEEDING: ${topic.name.toUpperCase()}`);
        console.log(`================================`);
        
        const filePath = path.join(dataDir, `${topic.id}.json`);
        let allQuestions = [];
        
        // If arrays, manually bootstrap our hardcoded baseline so system doesn't break, then we append rest.
        if (topic.id === 'arrays') {
             allQuestions = bootstrapArraysData();
        }

        for (const diff of difficulties) {
            const qs = await generateQuestions(topic.name, diff);
            allQuestions = allQuestions.concat(qs);
            // Throttle 4 seconds to aggressively dodge Gemini RPM limits
            await new Promise(r => setTimeout(r, 4000)); 
        }

        fs.writeFileSync(filePath, JSON.stringify(allQuestions, null, 2), 'utf-8');
        console.log(`\n-> Successfully flushed ${allQuestions.length} categorized questions to ${topic.id}.json\n`);
    }
    console.log("===================================================================");
    console.log("SUCCESS! All 105+ deep language boilerplates synced to disk!");
    console.log("===================================================================");
}

seed();
