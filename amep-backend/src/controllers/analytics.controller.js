const Submission = require("../models/Submission");
const User = require("../models/User");
const mongoose = require("mongoose");

// STUDENT BLOOM PROGRESS
exports.getStudentBloomProgress = async (req, res) => {
  try {
    const studentId = req.user.id;

    const progress = await Submission.aggregate([
      { $match: { userId: studentId } },
      {
        $group: {
          _id: "$bloomLevel",
          solvedCount: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * FACULTY: GET CLASS PERFORMANCE STATS
 * - Total Tasks Completed
 * - Total Projects Completed
 * - Total Questions Solved
 */
exports.getClassPerformanceStats = async (req, res) => {
  try {
    const { division } = req.query;
    let matchStage = {};

    // Filter by division if specified
    if (division && division !== "All") {
      const students = await User.find({ role: "student", division }).select("_id");
      const studentIds = students.map(s => s._id);
      matchStage = { userId: { $in: studentIds } };
    }

    // ----------------------------------------------------------------
    // 1. STATS CARDS (Tasks, Projects, Questions)
    // ----------------------------------------------------------------
    const taskStats = await Submission.aggregate([
      { $match: { ...matchStage, taskId: { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "taskInfo",
        },
      },
      { $unwind: "$taskInfo" },
      {
        $group: {
          _id: "$taskInfo.type", // 'task' or 'project'
          count: { $sum: 1 },
        },
      },
    ]);

    const questionStats = await Submission.countDocuments({
      ...matchStage,
      $or: [{ taskId: null }, { taskId: { $exists: false } }],
      isCorrect: true
    });

    const stats = {
      tasksCompleted: 0,
      projectsCompleted: 0,
      questionsSolved: questionStats,
    };

    taskStats.forEach((item) => {
      if (item._id === "task") stats.tasksCompleted = item.count;
      if (item._id === "project") stats.projectsCompleted = item.count;
    });

    // ----------------------------------------------------------------
    // 2. PROGRESS CHART (Avg Score per Week)
    // ----------------------------------------------------------------
    const progressData = await Submission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $week: "$createdAt" },
          year: { $first: { $year: "$createdAt" } },
          avgScore: { $avg: "$performanceScore" }
        }
      },
      { $sort: { "_id": 1 } },
      { $limit: 10 }, // Last 10 weeks
      {
        $project: {
          week: { $concat: ["W", { $toString: "$_id" }] },
          score: { $round: ["$avgScore", 0] },
          _id: 0
        }
      }
    ]);

    // ----------------------------------------------------------------
    // 3. TOPIC PERFORMANCE (Avg Score per Topic)
    // ----------------------------------------------------------------
    const topicPerformance = await Submission.aggregate([
      { $match: { ...matchStage, topic: { $exists: true, $ne: "mixed" } } }, // Filter out mixed/unknown if needed
      {
        $group: {
          _id: "$topic",
          avgScore: { $avg: "$performanceScore" }
        }
      },
      {
        $project: {
          topic: "$_id",
          value: { $round: ["$avgScore", 0] },
          _id: 0
        }
      }
    ]);

    // ----------------------------------------------------------------
    // 4. DIFFICULTY PERFORMANCE (Avg Score per Difficulty)
    // ----------------------------------------------------------------
    const difficultyPerformance = await Submission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$difficulty",
          avgScore: { $avg: "$performanceScore" }
        }
      },
      {
        $project: {
          level: "$_id",
          score: { $round: ["$avgScore", 0] },
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      stats,
      charts: {
        progressData,
        topicPerformance,
        difficultyPerformance
      }
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * FACULTY: GET ALL STUDENTS OVERVIEW
 * Returns list of students with:
 * - tasksCompleted
 * - projectsCompleted
 * - questionsSolved (Adaptive Learning)
 * - avgPerformance (Average score)
 */
exports.getAllStudentsOverview = async (req, res) => {
  try {
    const { division } = req.query;
    let query = { role: "student" };

    if (division && division !== "All") {
      query.division = division;
    }

    const students = await User.find(query).select("name email _id rollNumber division");

    const studentIds = students.map(s => s._id);

    // Aggregate all submissions for these students
    const submissions = await Submission.aggregate([
      { $match: { userId: { $in: studentIds } } },
      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "taskInfo"
        }
      },
      // We process logical classification in the next stage
      {
        $project: {
          userId: 1,
          isTask: {
            $cond: {
              if: { $gt: [{ $size: "$taskInfo" }, 0] },
              then: { $eq: [{ $arrayElemAt: ["$taskInfo.type", 0] }, "task"] },
              else: false
            }
          },
          isProject: {
            $cond: {
              if: { $gt: [{ $size: "$taskInfo" }, 0] },
              then: { $eq: [{ $arrayElemAt: ["$taskInfo.type", 0] }, "project"] },
              else: false
            }
          },
          // If it has no taskInfo link or taskId is null, assume it's an Adaptive Learning question
          isQuestion: { $eq: [{ $size: "$taskInfo" }, 0] },
          performanceScore: { $ifNull: ["$performanceScore", 0] },
          isCorrect: 1
        }
      },
      {
        $group: {
          _id: "$userId",
          tasksCompleted: { $sum: { $cond: ["$isTask", 1, 0] } },
          projectsCompleted: { $sum: { $cond: ["$isProject", 1, 0] } },
          questionsSolved: { $sum: { $cond: [{ $and: ["$isQuestion", "$isCorrect"] }, 1, 0] } },
          totalScore: { $sum: "$performanceScore" },
          submissionCount: { $sum: 1 }
        }
      }
    ]);

    // Map aggregation results back to student list
    const overview = students.map(student => {
      const stats = submissions.find(s => s._id.toString() === student._id.toString());
      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber || "N/A",
        division: student.division || "N/A",
        tasksCompleted: stats ? stats.tasksCompleted : 0,
        projectsCompleted: stats ? stats.projectsCompleted : 0,
        questionsSolved: stats ? stats.questionsSolved : 0,
        avgPerformance: stats && stats.submissionCount > 0
          ? Math.round(stats.totalScore / stats.submissionCount)
          : 0,
        // Tag logic
        tag: !stats || stats.totalScore === 0 ? "New"
          : (stats.totalScore / stats.submissionCount) > 80 ? "Top Performer"
            : (stats.totalScore / stats.submissionCount) < 50 ? "Needs Support"
              : "Consistent"
      };
    });

    res.json({ success: true, students: overview });

  } catch (error) {
    console.error("Student Overview Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * FACULTY: GET SINGLE STUDENT GROWTH HISTORY
 * Returns chronological performance data
 */
exports.getStudentGrowthHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    const history = await Submission.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(studentId) } },
      { $sort: { createdAt: 1 } }, // Chronological order
      {
        $project: {
          createdAt: 1,
          performanceScore: 1,
          topic: 1,
          bloomLevel: 1
        }
      }
    ]);

    // Format for chart (e.g., cumulative or trending avg)
    // Here we return raw history, frontend can calculate moving average or show trend
    res.json({ success: true, history });

  } catch (error) {
    console.error("Growth History Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ----------------------------------------------------------------
// FACULTY: GENERATE AI PERFORMANCE REPORT
// ----------------------------------------------------------------
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.generateClassPerformanceReport = async (req, res) => {
  try {
    const { division } = req.body;

    // Debug log to confirm env var loading (will trigger nodemon restart)
    console.log("Generating report for:", division);
    console.log("API Key loaded:", !!process.env.GEMINI_API_KEY);

    // 1. Gather Data for the Division
    let userQuery = { role: "student" };
    if (division && division !== 'All') userQuery.division = division;

    const students = await User.find(userQuery).select("_id name division rollNumber");
    const studentIds = students.map(s => s._id);

    // Aggregate key metrics
    const overallStats = await Submission.aggregate([
      { $match: { userId: { $in: studentIds } } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$performanceScore" },
          totalSubmissions: { $sum: 1 },
          avgDifficulty: { $avg: { $cond: [{ $eq: ["$difficulty", "hard"] }, 3, { $cond: [{ $eq: ["$difficulty", "medium"] }, 2, 1] }] } }
        }
      }
    ]);

    const topicPerformance = await Submission.aggregate([
      { $match: { userId: { $in: studentIds }, topic: { $exists: true } } },
      {
        $group: {
          _id: "$topic",
          avgScore: { $avg: "$performanceScore" },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgScore: 1 } }
    ]);

    // Separate weak and strong topics
    const weakTopics = topicPerformance.filter(t => t.avgScore < 60).map(t => `${t._id} (${Math.round(t.avgScore)}%)`);
    const strongTopics = topicPerformance.filter(t => t.avgScore >= 80).map(t => `${t._id} (${Math.round(t.avgScore)}%)`);

    const dataSummary = {
      division: division || "All",
      studentCount: students.length,
      avgClassScore: overallStats[0]?.avgScore?.toFixed(1) || 0,
      totalSubmissions: overallStats[0]?.totalSubmissions || 0,
      weakTopics: weakTopics.join(", ") || "None",
      strongTopics: strongTopics.join(", ") || "None",
    };

    // 2. Call Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API Key is missing");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      Act as an expert educational data analyst. I will provide you with performance data for a class division.
      Your goal is to generate a comprehensive "Class Performance Report" for the faculty.

      Data Context:
      - Division: ${dataSummary.division}
      - Student Count: ${dataSummary.studentCount}
      - Average Class Score: ${dataSummary.avgClassScore}/100
      - Total Submissions: ${dataSummary.totalSubmissions}
      - Strong Topics (Doing Good): ${dataSummary.strongTopics}
      - Weak Topics (Needs Effort): ${dataSummary.weakTopics}

      Please generate the report in Markdown format.
      
      IMPORTANT FORMATTING RULES:
      - Use **bullet points** for almost everything. Avoid long paragraphs.
      - Use **bold** for key metrics or important terms.
      - For "Areas of Strength" and "Areas Needing Effort", use a list format.
      
      Structure the report as follows:
      
      ## 1. Executive Summary
      - A concise overview of the class performance in 3-4 bullet points.
      
      ## 2. Key Performance Indicators (KPIs)
      - Present the key stats (Avg Score, Engagement, etc.) in a clear list.
      
      ## 3. Areas of Strength
      - List the topics where students are excelling.
      
      ## 4. Areas Needing Attention
      - List the weak topics with specific observations.
      
      ## 5. Strategic Recommendations
      - Provide 3 actionable, bulleted suggestions for the teacher.

      Keep the tone professional, encouraging, and data-driven.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ success: true, report: text });

  } catch (error) {
    console.error("AI Report Error:", error);
    res.status(500).json({ message: "Failed to generate report. " + error.message });
  }
};