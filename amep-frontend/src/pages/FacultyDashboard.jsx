import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MoreVertical, Search, Bot, LogOut } from "lucide-react";
import CreateTaskModal from "../components/faculty/CreateTaskModal";
import ReactMarkdown from 'react-markdown';

/* ---------------- MOCK DATA (Backend-ready) ---------------- */

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

/* ---------------- COMPONENT ---------------- */

const quickActionContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const quickActionItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  // Stats State

  // Stats State
  const [classStats, setClassStats] = useState({
    tasksCompleted: 0,
    questionsSolved: 0,
    projectsCompleted: 0
  });

  const [progressData, setProgressData] = useState([]);
  const [topicPerformance, setTopicPerformance] = useState([]);
  const [difficultyPerformance, setDifficultyPerformance] = useState([]);

  const [selectedDivision, setSelectedDivision] = useState("All");

  /* ---------------- AI REPORT ---------------- */
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);

    try {
      const res = await fetch("http://localhost:5002/api/analytics/faculty/generate-ai-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ division: selectedDivision })
      });
      const data = await res.json();
      if (data.success) {
        navigate("/faculty/performance-report", {
          state: { report: data.report, division: selectedDivision }
        });
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    fetchClassStats();
  }, [selectedDivision]);

  const fetchClassStats = async () => {
    try {
      const res = await fetch(`http://localhost:5002/api/analytics/faculty/class-performance?division=${selectedDivision}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        if (data.stats) setClassStats(data.stats);
        if (data.charts) {
          setProgressData(data.charts.progressData || []);
          setTopicPerformance(data.charts.topicPerformance || []);
          setDifficultyPerformance(data.charts.difficultyPerformance || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch class stats", err);
    }
  };

  const quickActions = [
    "Create Task",
    "Upload Study Material",
    "Student Overview",
    "Mark Attendance",
    "Create / Evaluate Test",
    "Schedule Class",
    "Announcements",
    "Project Reviews",
    "Generate Reports",
  ];

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="w-64 h-screen bg-slate-900 text-white p-6 space-y-6 fixed left-0 top-0">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">TASKFLOW</h2>
        <div className="space-y-2">
          <p className="text-xs uppercase text-slate-400 tracking-wider mb-2">Main</p>
          {["Dashboard", "Students", "Tasks"].map(item => (
            <button
              key={item}
              onClick={() => {
                if (item === "Tasks") navigate("/faculty/tasks");
                if (item === "Dashboard") navigate("/faculty");
                // Add other routes as needed
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="border-t border-slate-700/50 my-4" />

        <div className="space-y-2">
          <p className="text-xs uppercase text-slate-400 tracking-wider mb-2">Academics</p>
          {["Attendance", "Tests", "Reports"].map(item => (
            <button
              key={item}
              onClick={() => {
                if (item === "Attendance") navigate("/faculty/attendance");
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="border-t border-slate-700/50 my-4" />

        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-900/50 text-red-400 hover:text-red-300 transition flex items-center gap-2"
        >
          <LogOut size={20} /> Logout
        </button>
      </div>

      <div className="flex-1 ml-64 flex flex-col bg-slate-50 overflow-y-auto">
        {/* ---------------- TOP BAR ---------------- */}
        <div className="flex items-center justify-between px-8 py-4 border-b bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* 3 DOT MENU (ADD-ON) */}
            <button className="p-2 rounded-lg hover:bg-slate-100">
              <MoreVertical />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Taskflow · Faculty Dashboard
              </h1>
              <div className="h-1 w-20 bg-blue-600 rounded-full mt-2" />
            </div>
          </div>

          <div className="flex items-center gap-2 border px-4 py-2 rounded-full bg-white shadow-sm">
            <Search size={18} />
            <input
              placeholder="Search Student (Name / Enrollment)"
              className="outline-none text-sm w-64"
            />
          </div>
        </div>

        {/* ---------------- MAIN CONTENT ---------------- */}
        <div className="flex-1 p-6 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100">
          {/* QUICK ACTIONS HEADER */}
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
            <button className="p-2 rounded-lg hover:bg-slate-100">
              <MoreVertical />
            </button>
          </div>

          {/* QUICK ACTIONS */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {quickActions.map((item) => (
              <motion.div
                key={item}
                variants={quickActionItem}
                whileHover={{ y: -6, rotateX: 4 }}
                className="min-h-[220px] bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <h3 className="font-semibold text-lg text-black">
                  {item}
                </h3>

                {item === "Student Overview" ? (
                  <motion.p
                    initial={{ opacity: 0.6 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-slate-500 mt-1"
                  >
                    View class-wise student insights
                  </motion.p>
                ) : (
                  <motion.p
                    initial={{ opacity: 0.6 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-slate-500 mt-1"
                  >
                    Manage {item.toLowerCase()}
                  </motion.p>
                )}

                <div className={`mt-6 flex ${item === "Upload Study Material" ? "gap-4" : ""}`}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (item === "Create Task") {
                        setShowCreateTask(true);
                      }
                      if (item === "Mark Attendance") {
                        navigate("/faculty/attendance");
                      }
                      if (item === "Student Overview") {
                        navigate("/faculty/students");
                      }
                      if (item === "Project Reviews") {
                        navigate("/faculty/reviews");
                      }
                    }}
                    className="px-5 py-2.5 bg-black text-white rounded-full"
                  >
                    Open
                  </motion.button>
                  {(item === "Upload Study Material") && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 border rounded-full text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      Quick Upload
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ---------------- STUDENT PROFILE ---------------- */}
          {selectedStudent && (
            <div className="border rounded-3xl p-8 space-y-8 bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Overall Class Performance Overview
                </h2>
                <div className="flex gap-2">

                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="border rounded-full px-4 py-2 text-sm bg-white shadow-sm focus:outline-none"
                  >
                    <option value="All">All Divisions</option>
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                  </select>
                </div>
              </div>

              {/* CHART GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Progress Overview */}
                <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition">
                  <h3 className="font-semibold mb-2">Progress Overview</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={progressData}>
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#2563eb"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Topic-wise Performance */}
                <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition">
                  <h3 className="font-semibold mb-2">Topic-wise Performance</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topicPerformance}>
                      <XAxis dataKey="topic" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Difficulty-wise Performance */}
                <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition">
                  <h3 className="font-semibold mb-2">
                    Difficulty-wise Performance
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={difficultyPerformance}
                        dataKey="score"
                        nameKey="level"
                        innerRadius={60}
                        outerRadius={90}
                      >
                        {difficultyPerformance.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Task Accuracy & Class Performance */}
                <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition flex flex-col justify-center">
                  <h3 className="font-semibold mb-4 text-center">
                    Class Performance Metrics
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl flex justify-between items-center px-4">
                      <div>
                        <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Tasks</p>
                        <p className="text-2xl font-bold text-blue-700">{classStats?.tasksCompleted || 0}</p>
                      </div>
                      <div className="text-blue-300 text-xs">Completed</div>
                    </div>

                    <div className="bg-green-50 p-3 rounded-xl flex justify-between items-center px-4">
                      <div>
                        <p className="text-xs text-green-500 font-bold uppercase tracking-wider">Questions</p>
                        <p className="text-2xl font-bold text-green-700">{classStats?.questionsSolved || 0}</p>
                      </div>
                      <div className="text-green-300 text-xs">Solved</div>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-xl flex justify-between items-center px-4">
                      <div>
                        <p className="text-xs text-purple-500 font-bold uppercase tracking-wider">Projects</p>
                        <p className="text-2xl font-bold text-purple-700">{classStats?.projectsCompleted || 0}</p>
                      </div>
                      <div className="text-purple-300 text-xs">Submitted</div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/faculty/tasks")}
                    className="mt-5 px-4 py-2 bg-black text-white rounded-full text-sm hover:scale-105 transition w-full"
                  >
                    View Details
                  </button>
                </div>
              </div>

              <div className="mt-10 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="px-10 py-4 bg-black text-white rounded-2xl text-lg font-semibold shadow-lg disabled:opacity-70 flex items-center gap-2"
                >
                  {generatingReport ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing Performance...
                    </>
                  ) : (
                    "Generate AI-Based Class Performance Review (Bloom’s Analysis)"
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- BOTTOM ACTION BAR ---------------- */}
        <div className="border-t px-8 py-4 flex justify-end gap-4 bg-white/95 backdrop-blur sticky bottom-0">
          <button className="px-6 py-2 border rounded-full text-slate-900 hover:bg-slate-50 transition">
            Test Records
          </button>
          <button
            onClick={() => setShowCreateTask(true)}
            className="px-6 py-2 bg-black text-white rounded-full tracking-wide">
            Create New Task
          </button>
        </div>
      </div>
      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onSubmit={async (data) => {
            try {
              const token = localStorage.getItem("token");
              await fetch("http://localhost:5002/api/tasks", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
              });
              alert("Task created successfully!");
              setShowCreateTask(false);
            } catch (err) {
              console.error("Failed to create task", err);
              alert("Failed to create task");
            }
          }}
        />

      )}


    </div>
  );
}