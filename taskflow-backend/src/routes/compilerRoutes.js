const router = require('express').Router();
const auth = require('../middleware/auth');
const axios = require('axios');

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

// Map our internal language names to Piston's language names and versions
const LANGUAGE_MAP = {
    'javascript': { language: 'javascript', version: '18.15.0' },
    'python': { language: 'python', version: '3.10.0' }
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

        // Call Piston API
        const response = await axios.post(PISTON_URL, {
            language: langConfig.language,
            version: langConfig.version,
            files: [
                {
                    content: finalCode
                }
            ],
            compile_timeout: 10000,
            run_timeout: 10000,
            compile_memory_limit: -1,
            run_memory_limit: -1
        });

        const executionTime = Date.now() - startTime;
        const result = response.data.run;

        // Piston returns separate stdout and stderr
        // If there's a non-zero exit code or stderr, we treat it as an error
        if (result.stderr || result.code !== 0) {
            return res.json({ 
                success: false, 
                output: result.stderr || result.stdout, 
                executionTime,
                isError: true
            });
        }
        
        // Success
        return res.json({ 
            success: true, 
            output: result.stdout, 
            executionTime,
            isError: false
        });
        
    } catch (err) {
        console.error("Piston API execution error:", err.response?.data || err.message);
        res.status(500).json({ 
            success: false, 
            message: 'Compiler service error: ' + (err.response?.data?.message || err.message) 
        });
    }
});

module.exports = router;

