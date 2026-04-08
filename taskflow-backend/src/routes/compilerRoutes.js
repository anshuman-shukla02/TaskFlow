const router = require('express').Router();
const auth = require('../middleware/auth');
const axios = require('axios');

// Judge0 CE (Community Edition) — free, no API key required
const JUDGE0_URL = "https://ce.judge0.com";

// Map our internal language names to Judge0 language IDs
const LANGUAGE_MAP = {
    'javascript': { id: 93, name: 'JavaScript (Node.js 18.15.0)' },
    'python':     { id: 100, name: 'Python (3.12.5)' },
    'java':       { id: 91, name: 'Java (JDK 17.0.6)' },
    'cpp':        { id: 105, name: 'C++ (GCC 14.1.0)' },
    'c':          { id: 103, name: 'C (GCC 14.1.0)' }
};

router.post('/execute', auth, async (req, res) => {
    const { code, language, questionId } = req.body;
    
    if (!code || code.trim() === '') {
        return res.status(400).json({ success: false, message: 'Code cannot be empty' });
    }

    const langKey = language || 'javascript';
    const langConfig = LANGUAGE_MAP[langKey] || LANGUAGE_MAP['javascript'];
    
    let finalCode = code;

    // --- LEETCODE STYLE DRIVER INJECTION ---
    if (questionId === 'two-sum') {
        if (langKey === 'javascript') {
            finalCode += `\n\n// --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nconst t1 = twoSum([2,7,11,15], 9);`;
            finalCode += `\nconsole.log("Test Case 1 (nums=[2,7,11,15], target=9):", JSON.stringify(t1));`;
            finalCode += `\nconst t2 = twoSum([3,2,4], 6);`;
            finalCode += `\nconsole.log("Test Case 2 (nums=[3,2,4], target=6):", JSON.stringify(t2));`;
        } else if (langKey === 'python') {
            finalCode += `\n\n# --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nimport json`;
            finalCode += `\nt1 = twoSum([2,7,11,15], 9)`;
            finalCode += `\nprint("Test Case 1 (nums=[2,7,11,15], target=9):", json.dumps(t1))`;
            finalCode += `\nt2 = twoSum([3,2,4], 6)`;
            finalCode += `\nprint("Test Case 2 (nums=[3,2,4], target=6):", json.dumps(t2))`;
        }
    } else if (questionId === 'buy-sell-stock') {
        if (langKey === 'javascript') {
            finalCode += `\n\n// --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nconsole.log("Test Case 1:", maxProfit([7,1,5,3,6,4]));`;
            finalCode += `\nconsole.log("Test Case 2:", maxProfit([7,6,4,3,1]));`;
        } else if (langKey === 'python') {
            finalCode += `\n\n# --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nprint("Test Case 1:", maxProfit([7,1,5,3,6,4]))`;
            finalCode += `\nprint("Test Case 2:", maxProfit([7,6,4,3,1]))`;
        }
    } else if (questionId === 'trapping-rain-water') {
        if (langKey === 'javascript') {
            finalCode += `\n\n// --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nconsole.log("Test Case 1:", trap([0,1,0,2,1,0,1,3,2,1,2,1]));`;
        } else if (langKey === 'python') {
            finalCode += `\n\n# --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nprint("Test Case 1:", trap([0,1,0,2,1,0,1,3,2,1,2,1]))`;
        }
    }

    try {
        const startTime = Date.now();

        // Submit to Judge0 with wait=true (synchronous mode)
        const response = await axios.post(
            `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
            {
                language_id: langConfig.id,
                source_code: finalCode,
                cpu_time_limit: 5,
                wall_time_limit: 10,
                memory_limit: 128000,
            },
            {
                timeout: 20000,
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const executionTime = Date.now() - startTime;
        const result = response.data;

        // Judge0 status IDs:
        // 3 = Accepted, 6 = Compilation Error, 11 = Runtime Error, 5 = Time Limit Exceeded
        const isAccepted = result.status?.id === 3;

        if (isAccepted) {
            return res.json({ 
                success: true, 
                output: result.stdout || "Execution finished (No Output)", 
                executionTime,
                isError: false
            });
        }
        
        // Error cases
        const errorOutput = result.compile_output || result.stderr || result.stdout || result.status?.description || "Execution Failed";
        return res.json({ 
            success: false, 
            output: errorOutput, 
            executionTime,
            isError: true
        });
        
    } catch (err) {
        console.error("Judge0 API error:", err.response?.data || err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Compiler service temporarily unavailable. Please try again in a moment.' 
        });
    }
});

module.exports = router;
