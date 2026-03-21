const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const User = require("../models/User");

// GET /api/analytics/faculty/class-performance
router.get("/faculty/class-performance", auth, async (req, res) => {
  try {
    const { division } = req.query;

    // Build student filter
    const studentFilter = { role: "student" };
    if (division && division !== "All") {
      studentFilter.division = division;
    }

    const students = await User.find(studentFilter).select("_id");
    const studentIds = students.map((s) => s._id);

    const submissions = await Submission.find({ userId: { $in: studentIds } });

    // Stats
    const tasksCompleted = submissions.filter((s) => s.taskId).length;
    const questionsSolved = submissions.length;
    const projectsCompleted = submissions.filter((s) => s.milestoneId && s.reviewStatus === "APPROVED").length;

    // Progress data (weekly averages — group by week)
    const weeklyMap = {};
    submissions.forEach((s) => {
      const week = getWeekNumber(s.createdAt);
      const key = `W${week}`;
      if (!weeklyMap[key]) weeklyMap[key] = { total: 0, count: 0 };
      weeklyMap[key].total += s.performanceScore;
      weeklyMap[key].count++;
    });

    const progressData = Object.entries(weeklyMap)
      .slice(-8)
      .map(([week, data]) => ({
        week,
        score: Math.round(data.total / data.count),
      }));

    // Topic performance
    const topicMap = {};
    submissions.forEach((s) => {
      if (!s.topic) return;
      if (!topicMap[s.topic]) topicMap[s.topic] = { total: 0, count: 0 };
      topicMap[s.topic].total += s.performanceScore;
      topicMap[s.topic].count++;
    });

    const topicPerformance = Object.entries(topicMap).map(([topic, data]) => ({
      topic,
      value: Math.round(data.total / data.count),
    }));

    // Difficulty performance
    const diffMap = {};
    submissions.forEach((s) => {
      // We need Task info for difficulty — use bloom levels as a proxy
      const level = s.bloomLevel || "REMEMBER";
      if (!diffMap[level]) diffMap[level] = { total: 0, count: 0 };
      diffMap[level].total += s.performanceScore;
      diffMap[level].count++;
    });

    const difficultyPerformance = Object.entries(diffMap).map(([level, data]) => ({
      level,
      score: Math.round(data.total / data.count),
    }));

    res.json({
      success: true,
      stats: { tasksCompleted, questionsSolved, projectsCompleted },
      charts: { progressData, topicPerformance, difficultyPerformance },
    });
  } catch (err) {
    console.error("Class performance error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/analytics/faculty/generate-ai-report
router.post("/faculty/generate-ai-report", auth, async (req, res) => {
  try {
    const { division } = req.body;

    // Gather performance data
    const studentFilter = { role: "student" };
    if (division && division !== "All") {
      studentFilter.division = division;
    }

    const students = await User.find(studentFilter).select("_id name");
    const studentIds = students.map((s) => s._id);
    const submissions = await Submission.find({ userId: { $in: studentIds } });

    // Build summary for AI
    const totalStudents = students.length;
    const totalSubmissions = submissions.length;
    const avgScore =
      submissions.length > 0
        ? Math.round(submissions.reduce((a, s) => a + s.performanceScore, 0) / submissions.length)
        : 0;

    // Topic breakdown
    const topicMap = {};
    submissions.forEach((s) => {
      if (!s.topic) return;
      if (!topicMap[s.topic]) topicMap[s.topic] = { total: 0, count: 0 };
      topicMap[s.topic].total += s.performanceScore;
      topicMap[s.topic].count++;
    });

    const topicSummary = Object.entries(topicMap)
      .map(([topic, d]) => `${topic}: avg ${Math.round(d.total / d.count)}% (${d.count} submissions)`)
      .join(", ");

    // Bloom level breakdown
    const bloomMap = {};
    submissions.forEach((s) => {
      const bl = s.bloomLevel || "REMEMBER";
      if (!bloomMap[bl]) bloomMap[bl] = 0;
      bloomMap[bl]++;
    });

    const bloomSummary = Object.entries(bloomMap)
      .map(([level, count]) => `${level}: ${count}`)
      .join(", ");

    const prompt = `You are an educational analyst. Generate a detailed class performance report with the following data:

Division: ${division || "All"}
Total Students: ${totalStudents}
Total Submissions: ${totalSubmissions}
Average Score: ${avgScore}%
Topic Performance: ${topicSummary || "No data"}
Bloom's Taxonomy Levels: ${bloomSummary || "No data"}

Please provide:
1. **Executive Summary** — overview of class performance
2. **Bloom's Taxonomy Analysis** — how students are progressing through cognitive levels
3. **Topic-wise Analysis** — strengths and weaknesses by topic
4. **Key Achievements** — notable accomplishments  
5. **Areas for Improvement** — specific recommendations
6. **Action Plan** — concrete steps for faculty

Use markdown formatting with headers, bullet points, and emphasis.`;

    // Try Gemini API
    let report;
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "mock_key_for_now") {
        throw new Error("Invalid or missing Gemini API Key");
      }

      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      report = result.response.text();
    } catch (aiErr) {
      console.warn("Using fallback report. Reason:", aiErr.message);
      // Fallback report
      report = `# Class Performance Report — ${division || "All Divisions"}

## Executive Summary
The class has **${totalStudents} students** with **${totalSubmissions} total submissions** and an average score of **${avgScore}%**.

## Bloom's Taxonomy Analysis
${bloomSummary || "No bloom level data available yet."}

## Topic-wise Analysis
${topicSummary || "No topic data available yet."}

## Key Achievements
- Students are actively engaging with the platform
- ${totalSubmissions} submissions completed

## Areas for Improvement
- Encourage higher-order thinking (Analyze, Evaluate, Create levels)
- Focus on weaker topics

## Action Plan
1. Assign more tasks at higher Bloom's levels
2. Provide targeted practice for struggling topics
3. Review individual student progress regularly

*Note: This is a fallback report. Configure a valid Gemini API key for AI-powered analysis.*`;
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error("Generate report error:", err);
    res.status(500).json({ success: false, message: "Failed to generate report" });
  }
});

// GET /api/analytics/faculty/students-overview
router.get("/faculty/students-overview", auth, async (req, res) => {
  try {
    const { division } = req.query;

    const studentFilter = { role: "student" };
    if (division && division !== "All") {
      studentFilter.division = division;
    }

    const students = await User.find(studentFilter).select("name email rollNumber division");

    // For each student, compute stats
    const result = await Promise.all(
      students.map(async (student) => {
        const submissions = await Submission.find({ userId: student._id });

        const avgPerformance =
          submissions.length > 0
            ? Math.round(
                submissions.reduce((a, s) => a + s.performanceScore, 0) / submissions.length
              )
            : 0;

        const tasksCompleted = submissions.filter((s) => s.taskId).length;
        const projectsCompleted = submissions.filter(
          (s) => s.milestoneId && s.reviewStatus === "APPROVED"
        ).length;
        const questionsSolved = submissions.length;

        // Tag assignment
        let tag = "Average";
        if (avgPerformance >= 80) tag = "Top Performer";
        else if (avgPerformance < 50 && submissions.length > 0) tag = "Needs Support";

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          division: student.division,
          avgPerformance,
          tasksCompleted,
          projectsCompleted,
          questionsSolved,
          tag,
        };
      })
    );

    res.json({ success: true, students: result });
  } catch (err) {
    console.error("Students overview error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/analytics/faculty/student-growth/:id
router.get("/faculty/student-growth/:id", auth, async (req, res) => {
  try {
    const studentId = req.params.id;
    const history = await Submission.find({ userId: studentId })
      .sort({ createdAt: 1 })
      .select("performanceScore topic createdAt");

    res.json({ success: true, history });
  } catch (err) {
    console.error("Student growth error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Helper: get ISO week number
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

module.exports = router;
