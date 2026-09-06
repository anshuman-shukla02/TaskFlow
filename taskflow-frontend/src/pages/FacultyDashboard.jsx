import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
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
import CreateAnnouncementModal from "../components/announcements/CreateAnnouncementModal";
import ViewAnnouncementsModal from "../components/announcements/ViewAnnouncementsModal";
import ReactMarkdown from 'react-markdown';
import { Calendar, ChevronRight, BookOpen, Users, ClipboardCheck, FileText, CheckSquare, Inbox, PlusCircle } from "lucide-react";

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
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);




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
      const res = await fetch(`${API_URL}/api/analytics/faculty/generate-ai-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
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
    fetchAnnouncements();
  }, [selectedDivision]);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    }
  };

  const fetchClassStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics/faculty/class-performance?division=${selectedDivision}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
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
    { name: "Study Materials", icon: <BookOpen size={24} />, route: "/faculty/materials", desc: "Manage study materials", color: "indigo" },
    { name: "Student Overview", icon: <Users size={24} />, route: "/faculty/students", desc: "View class-wise student insights", color: "blue" },
    { name: "Mark Attendance", icon: <ClipboardCheck size={24} />, route: "/faculty/attendance", desc: "Manage daily attendance", color: "emerald" },
    { name: "Create Task", icon: <PlusCircle size={24} />, route: "/faculty/tasks", state: { openCreate: true }, desc: "Assign new task to students", color: "rose" },
    { name: "Create / Evaluate Test", icon: <FileText size={24} />, route: "/faculty/tasks/create", desc: "Manage assignments", color: "amber" },
    { name: "Submissions", icon: <Inbox size={24} />, route: "/faculty/submissions", desc: "View & grade all student submissions", color: "violet" },
  ];

  const actionColors = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "hover:border-indigo-200" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "hover:border-blue-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "hover:border-emerald-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "hover:border-amber-200" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", border: "hover:border-rose-200" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", border: "hover:border-violet-200" },
  };

  return (
    <div className="space-y-8 pb-16 min-w-0 max-w-full overflow-hidden">
      {/* QUICK ACTIONS */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {quickActions.map((item) => (
          <motion.div
            key={item.name}
            variants={quickActionItem}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => navigate(item.route, { state: item.state })}
            className={`min-h-[160px] bg-white rounded-3xl p-6 shadow-sm border border-slate-100 ${actionColors[item.color].border} hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden`}
          >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-3 rounded-2xl ${actionColors[item.color].bg} ${actionColors[item.color].text}`}>
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-lg text-slate-800">{item.name}</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1 max-w-[85%]">{item.desc}</p>
              </div>

              {/* Elegant hover arrow replacing the button */}
              <div className="absolute right-6 bottom-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <div className={`p-3 rounded-full ${actionColors[item.color].bg} ${actionColors[item.color].text} shadow-sm`}>
                  <ChevronRight size={20} className="stroke-[3]" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ---------------- ANNOUNCEMENTS ---------------- */}
        <div className="border rounded-3xl p-8 space-y-6 bg-white shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Latest Announcements</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAllAnnouncements(true)}
                className="px-4 py-2 border rounded-full text-sm font-medium hover:bg-slate-50 transition"
              >
                View All
              </button>
              <button
                onClick={() => setShowCreateAnnouncement(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition shadow-sm"
              >
                Create Announcement
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {announcements.length === 0 ? (
              <div className="col-span-3 text-center py-6 text-slate-500">
                No recent announcements.
              </div>
            ) : (
              announcements.slice(0, 3).map((announcement) => (
                <div key={announcement._id} className="border border-slate-100 bg-slate-50 rounded-2xl p-5 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-slate-800 line-clamp-1" title={announcement.title}>
                      {announcement.title}
                    </h3>
                    <span className="flex items-center text-[10px] text-slate-500 bg-white px-2 py-1 rounded-full shadow-sm whitespace-nowrap">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                    {announcement.content}
                  </p>
                  <div className="text-xs text-slate-400 mt-auto">
                    {announcement.targetAudience === "all" ? "For everyone" : "For students"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
              <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition min-w-0 overflow-hidden">
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
              <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition min-w-0 overflow-hidden">
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
              <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition min-w-0 overflow-hidden">
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
              <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition flex flex-col justify-center min-w-0 overflow-hidden">
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

      {/* Modals */}
      <CreateAnnouncementModal
        isOpen={showCreateAnnouncement}
        onClose={() => setShowCreateAnnouncement(false)}
        userRole="faculty"
        onSuccess={(newAnnouncement) => {
          setAnnouncements([newAnnouncement, ...announcements]);
        }}
      />

      <ViewAnnouncementsModal
        isOpen={showAllAnnouncements}
        onClose={() => setShowAllAnnouncements(false)}
        announcements={announcements}
      />
    </div>
  );
}