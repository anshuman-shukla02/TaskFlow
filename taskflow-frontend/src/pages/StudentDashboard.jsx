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
import { MoreVertical, Search, BookOpen, CheckSquare, BarChart2, Puzzle, LogOut, Calendar } from "lucide-react";
import ViewAnnouncementsModal from "../components/announcements/ViewAnnouncementsModal";

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
  const [announcements, setAnnouncements] = useState([]);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("http://localhost:5002/api/announcements", {
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




  // We can fetch real student data here later

  const quickActions = [
    { name: "View Tasks", icon: <CheckSquare />, route: "/student/tasks", desc: "View and submit assigned tasks" },
    { name: "Adaptive Learning", icon: <BookOpen />, route: "/student/adaptive-learning", desc: "Learn topics with AI assistance" },
    { name: "Project Based Learning", icon: <Puzzle />, route: "/student/project", desc: "Build real-world applications" },
    { name: "My Progress", icon: <BarChart2 />, route: "/student/progress", desc: "Detailed analytics of your performance" },
  ];

  return (
    <div className="flex-1 p-6 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
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

      {/* ---------------- ANNOUNCEMENTS ---------------- */}
      <div className="border rounded-3xl p-8 space-y-6 bg-white shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Latest Announcements</h2>
          <button
            onClick={() => setShowAllAnnouncements(true)}
            className="px-4 py-2 border rounded-full text-sm font-medium hover:bg-slate-50 transition"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {announcements.length === 0 ? (
            <div className="col-span-3 text-center py-6 text-slate-500">
              No recent announcements.
            </div>
          ) : (
            announcements.slice(0, 3).map((announcement) => (
              <div key={announcement._id} className="border border-slate-100 bg-slate-50 rounded-2xl p-5 hover:shadow-md transition flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-slate-800 line-clamp-1" title={announcement.title}>
                    {announcement.title}
                  </h3>
                  <span className="flex items-center text-[10px] text-slate-500 bg-white px-2 py-1 rounded-full shadow-sm whitespace-nowrap">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-grow">
                  {announcement.content}
                </p>
                <div className="text-xs text-slate-400 mt-auto pt-2 border-t border-slate-200/60">
                  Posted by {announcement.createdBy?.name || "Admin"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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

      {/* Modals */}
      <ViewAnnouncementsModal
        isOpen={showAllAnnouncements}
        onClose={() => setShowAllAnnouncements(false)}
        announcements={announcements}
      />
    </div>
  );
}
