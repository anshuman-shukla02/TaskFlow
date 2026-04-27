const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

let adaptiveCache = {};

function getTopicQuestions(topicId) {
    if (adaptiveCache[topicId]) return adaptiveCache[topicId];

    const filePath = path.join(__dirname, '../data/questions', `${topicId}.json`);
    if (fs.existsSync(filePath)) {
        try {
            const qs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            adaptiveCache[topicId] = qs;
            return qs;
        } catch (e) {
            console.error(`Error parsing JSON for topic ${topicId}:`, e);
            return null;
        }
    }
    return null;
}

router.post('/next-question', auth, async (req, res) => {
    const { topicId, currentQuestionId, executionTime, hintsUsed = 0 } = req.body;
    
    const questions = getTopicQuestions(topicId);

    if (!topicId || !questions || questions.length === 0) {
        // Fallback for topics that are not populated yet
        return res.json({ success: true, question: null, completed: true, feedback: "Topic entirely completed or currently down for maintenance." });
    }

    const user = await User.findById(req.user.id);
    if (!user.adaptiveProgress) user.adaptiveProgress = new Map();

    let nextQuestion = null;
    let feedback = "";

    // 1. FRESH LOAD (Resuming Session)
    if (!currentQuestionId) {
        const savedState = user.adaptiveProgress.get(topicId);
        
        if (savedState === 'completed') {
            return res.json({ success: true, question: null, completed: true, feedback: "You have already mastered this topic." });
        } else if (savedState) {
            const index = questions.findIndex(q => q.id === savedState);
            if (index !== -1) {
                nextQuestion = questions[index];
                feedback = "Resuming your AI practice session from where you left off.";
            } else {
                nextQuestion = questions[0];
                feedback = `Starting topic. Good luck!`;
                user.adaptiveProgress.set(topicId, nextQuestion.id);
                await user.save();
            }
        } else {
            // First time ever seeing topic
            nextQuestion = questions[0]; 
            feedback = `Starting topic. Good luck!`;
            // Save initial state natively
            user.adaptiveProgress.set(topicId, nextQuestion.id);
            await user.save();
        }

        return res.json({ success: true, question: nextQuestion, feedback, completed: false });
    }

    // 2. SUBMISSION EVALUATION JUMP
    const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
    
    if (currentIndex !== -1) {
        if (currentIndex === questions.length - 1) {
            // Last question completed
            let hintMsg = hintsUsed > 0 ? ` using ${hintsUsed} hint(s)` : "";
            feedback = `Spectacular! You have conquered the entire adaptive sequence for this topic${hintMsg}.`;
            nextQuestion = null; // End of topic
        } else {
            // Move to next question
            let hintMsg = hintsUsed > 0 ? ` (Used ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''})` : "";
            const currentQ = questions[currentIndex];
            const nextQ = questions[currentIndex + 1];
            
            // Dynamic adaptivity string
            if (currentQ.difficulty === 'Easy' && nextQ.difficulty === 'Medium') {
                feedback = `Great job${hintMsg}. Let's safely bump you up to a Medium problem.`;
            } else if (currentQ.difficulty === 'Medium' && nextQ.difficulty === 'Hard') {
                feedback = `Excellent code execution${hintMsg}! You have mastered the medium tier. Moving onto a Hard visualization challenge.`;
            } else {
                feedback = `Excellent code execution${hintMsg}! Advancing you to the next challenge sequence.`;
            }
            
            nextQuestion = nextQ;
        }
    } else {
        // Fallback robust sequence
        nextQuestion = questions[0];
    }

    // Save the new state permanently for the student
    user.adaptiveProgress.set(topicId, nextQuestion ? nextQuestion.id : 'completed');
    await user.save();

    res.json({
        success: true,
        question: nextQuestion,
        feedback,
        completed: nextQuestion === null
    });
});

module.exports = router;
