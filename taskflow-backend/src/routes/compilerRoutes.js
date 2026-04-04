const router = require('express').Router();
const auth = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const TEMP_DIR = path.join(__dirname, '../../temp');

// Ensure temp directory exists
fs.mkdir(TEMP_DIR, { recursive: true }).catch(err => {
    console.error("Warning: Failed to create temp directory for compiler", err);
});

router.post('/execute', auth, async (req, res) => {
    const { code, language, questionId } = req.body;
    
    if (!code || code.trim() === '') {
        return res.status(400).json({ success: false, message: 'Code cannot be empty' });
    }

    const lang = language || 'javascript';
    
    // Generate ephemeral execution file
    const uuid = crypto.randomUUID();
    const ext = lang === 'python' ? 'py' : 'js';
    const filename = `${uuid}.${ext}`;
    const filepath = path.join(TEMP_DIR, filename);

    let finalCode = code;

    // --- LEETCODE STYLE DRIVER INJECTION ---
    if (questionId === 'two-sum') {
        if (lang === 'javascript') {
            finalCode += `\n\n// --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nconst t1 = twoSum([2,7,11,15], 9);`;
            finalCode += `\nconsole.log("Test Case 1 (nums=[2,7,11,15], target=9):", JSON.stringify(t1));`;
            finalCode += `\nconst t2 = twoSum([3,2,4], 6);`;
            finalCode += `\nconsole.log("Test Case 2 (nums=[3,2,4], target=6):", JSON.stringify(t2));`;
        } else if (lang === 'python') {
            finalCode += `\n\n# --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nimport json`;
            finalCode += `\nt1 = twoSum([2,7,11,15], 9)`;
            finalCode += `\nprint("Test Case 1 (nums=[2,7,11,15], target=9):", json.dumps(t1))`;
            finalCode += `\nt2 = twoSum([3,2,4], 6)`;
            finalCode += `\nprint("Test Case 2 (nums=[3,2,4], target=6):", json.dumps(t2))`;
        }
    } else if (questionId === 'buy-sell-stock') {
        if (lang === 'javascript') {
            finalCode += `\n\n// --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nconsole.log("Test Case 1:", maxProfit([7,1,5,3,6,4]));`;
            finalCode += `\nconsole.log("Test Case 2:", maxProfit([7,6,4,3,1]));`;
        } else if (lang === 'python') {
            finalCode += `\n\n# --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nprint("Test Case 1:", maxProfit([7,1,5,3,6,4]))`;
            finalCode += `\nprint("Test Case 2:", maxProfit([7,6,4,3,1]))`;
        }
    } else if (questionId === 'trapping-rain-water') {
        if (lang === 'javascript') {
            finalCode += `\n\n// --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nconsole.log("Test Case 1:", trap([0,1,0,2,1,0,1,3,2,1,2,1]));`;
        } else if (lang === 'python') {
            finalCode += `\n\n# --- SYSTEM DRIVER CODE ---`;
            finalCode += `\nprint("Test Case 1:", trap([0,1,0,2,1,0,1,3,2,1,2,1]))`;
        }
    }

    try {
        await fs.writeFile(filepath, finalCode);
        
        let command = '';
        if (lang === 'python') {
            // Python constraints
            command = `docker run --rm --memory="256m" --cpus="0.5" --network none -v "${TEMP_DIR}:/app" python:3.9-alpine python3 /app/${filename}`;
        } else {
            // Node/JS constraints
            command = `docker run --rm --memory="256m" --cpus="0.5" --network none -v "${TEMP_DIR}:/app" node:18-alpine node /app/${filename}`;
        }

        const startTime = Date.now();
        
        exec(command, { timeout: 10000 }, async (error, stdout, stderr) => {
            const executionTime = Date.now() - startTime;
            
            // Always clean up the temp file after execution
            try {
                await fs.unlink(filepath);
            } catch (cleanupErr) {
                console.error(`Failed to clean up temp file: ${filepath}`, cleanupErr);
            }
            
            // Check for Timeout
            if (error && error.killed) {
                return res.json({ 
                    success: false, 
                    output: 'Time Limit Exceeded (10s)', 
                    executionTime 
                });
            }

            // Check for runtime errors
            if (stderr) {
                return res.json({ 
                    success: false, 
                    output: stderr, 
                    executionTime,
                    isError: true
                });
            }
            
            // Success Compilation
            return res.json({ 
                success: true, 
                output: stdout, 
                executionTime,
                isError: false
            });
        });
        
    } catch (err) {
        console.error("Compiler execution error:", err);
        res.status(500).json({ success: false, message: 'Compiler server error' });
    }
});

module.exports = router;
