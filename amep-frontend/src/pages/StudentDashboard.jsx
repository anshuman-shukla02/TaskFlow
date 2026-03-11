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
import { MoreVertical, Search, BookOpen, CheckSquare, BarChart2, Puzzle, LogOut } from "lucide-react";

/* ---------------- MOCK DATA (will replace with real later if needed) ---------------- */

const progressData = [
  { week: "W1", score: 65 },
  { week: "W2", score: 68 },
  { week: "W3", score: 75 },
  { week: "W4", score: 82 },
];

const topicPerformance = [
  { topic: "Arrays", value: 85 },
  { topic: "Linked Lists", value: 60 },
  { topic: "Trees", value: 70 },
  { topic: "Graphs", value: 55 },
];

const difficultyPerformance = [
  { level: "Easy", score: 85 },
  { level: "Medium", score: 70 },
  { level: "Hard", score: 50 },
];

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

export default function StudentDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  // We can fetch real student data here later

  const quickActions = [
    { name: "View Tasks", icon: <CheckSquare />, route: "/student/tasks", desc: "View and submit assigned tasks" },
    { name: "Adaptive Learning", icon: <BookOpen />, route: "/student/adaptive-learning", desc: "Learn topics with AI assistance" },
    { name: "Project Based Learning", icon: <Puzzle />, route: "/student/project", desc: "Build real-world applications" },
    { name: "My Progress", icon: <BarChart2 />, route: "/student/progress", desc: "Detailed analytics of your performance" },
  ];

  return (
    <div className="h-screen flex overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-64 h-screen bg-slate-900 text-white p-6 space-y-6 fixed left-0 top-0">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">TASKFLOW</h2>
        <div className="space-y-2">
          <p className="text-xs uppercase text-slate-400 tracking-wider mb-2">Main</p>
          {["Dashboard", "Tasks", "Adaptive Learning"].map((item) => (
            <button
              key={item}
              onClick={() => {
                if (item === "Tasks") navigate("/student/tasks");
                if (item === "Adaptive Learning") navigate("/student/adaptive-learning");
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
          {["Attendance", "Results", "Reports"].map((item) => (
            <button
              key={item}
              onClick={() => {
                if (item === "Attendance") navigate("/student/attendance");
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
            <button className="p-2 rounded-lg hover:bg-slate-100">
              <MoreVertical />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Taskflow · Student Dashboard
              </h1>
              <div className="h-1 w-20 bg-blue-600 rounded-full mt-2" />
            </div>
          </div>

          <div className="flex items-center gap-2 border px-4 py-2 rounded-full bg-white shadow-sm">
            <Search size={18} />
            <input
              placeholder="Search topics or tasks..."
              className="outline-none text-sm w-64"
            />
          </div>
        </div>

        {/* ---------------- MAIN CONTENT ---------------- */}
        <div className="flex-1 p-6 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100">
          {/* QUICK ACTIONS HEADER */}
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
          </div>

          {/* QUICK ACTIONS */}
          <motion.div
            variants={quickActionContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {quickActions.map((item) => (
              <motion.div
                key={item.name}
                variants={quickActionItem}
                whileHover={{ y: -6, rotateX: 4 }}
                className="min-h-[220px] bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {item.icon}
                    </div>
                    <h3 className="font-semibold text-lg text-black">{item.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                </div>

                <div className="mt-6 flex">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(item.route)}
                    className="px-5 py-2.5 bg-black text-white rounded-full w-full"
                  >
                    Open
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ---------------- ANALYTICS OVERVIEW ---------------- */}
          <div className="border rounded-3xl p-8 space-y-8 bg-white shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Your Performance Overview
              </h2>
            </div>

            {/* CHART GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Progress Overview */}
              <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition">
                <h3 className="font-semibold mb-2">Weekly Progress</h3>
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
                <h3 className="font-semibold mb-2">Strongest Topics</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topicPerformance}>
                    <XAxis dataKey="topic" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
