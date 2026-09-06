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
import { MoreVertical, Search, BookOpen, CheckSquare, BarChart2, Puzzle, LogOut, Calendar, ChevronRight, Library, Trophy, Clock, AlertTriangle } from "lucide-react";
import ViewAnnouncementsModal from "../components/announcements/ViewAnnouncementsModal";
import BadgeDisplay from "../components/common/BadgeDisplay";

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#8b5cf6"];

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
  const [progressData, setProgressData] = useState([]);
  const [topicPerformance, setTopicPerformance] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [badges, setBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [dueTasks, setDueTasks] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
    fetchDashboardSummary();
    fetchBadges();
    fetchDueTasks();
  }, []);

  const fetchDueTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/due-soon`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setDueTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to fetch due tasks:", err);
    }
  };

  const fetchBadges = async () => {
    try {
      const res = await fetch(`${API_URL}/api/gamification/my-badges`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setBadges(data.badges || []);
      }
    } catch (err) {
      console.error("Failed to fetch badges:", err);
    } finally {
      setBadgesLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/progress/dashboard-summary`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setProgressData(Array.isArray(data.progressData) ? data.progressData : []);
        setTopicPerformance(Array.isArray(data.topicPerformance) ? data.topicPerformance : []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    } finally {
      setChartsLoading(false);
    }
  };

  const quickActions = [
    { name: "View Tasks", icon: <CheckSquare size={24} />, route: "/student/tasks", desc: "View and submit assigned tasks", color: "blue" },
    { name: "Adaptive Learning", icon: <BookOpen size={24} />, route: "/student/adaptive-learning", desc: "Learn topics with AI assistance", color: "violet" },
    { name: "Project Based Learning", icon: <Puzzle size={24} />, route: "/student/project", desc: "Build real-world applications", color: "emerald" },
    { name: "Leaderboard & Badges", icon: <Trophy size={24} />, route: "/student/leaderboard", desc: "Rankings, streaks & achievements", color: "amber" },
    { name: "Mark Attendance", icon: <Calendar size={24} />, route: "/student/attendance", desc: "Mark today's attendance & view history", color: "rose" },
    { name: "Study Materials", icon: <Library size={24} />, route: "/student/materials", desc: "Access uploaded notes & syllabus", color: "sky" },
    { name: "My Progress", icon: <BarChart2 size={24} />, route: "/student/progress", desc: "Detailed analytics of your performance", color: "violet" },
  ];

  const actionColors = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "hover:border-blue-200" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", border: "hover:border-violet-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "hover:border-emerald-200" },
    sky: { bg: "bg-sky-50", text: "text-sky-600", border: "hover:border-sky-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "hover:border-amber-200" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", border: "hover:border-rose-200" },
  };

  return (
    <div className="space-y-8 pb-16 min-w-0 max-w-full overflow-hidden">
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
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => navigate(item.route)}
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

      {/* ---------------- UPCOMING DEADLINES ---------------- */}
      {dueTasks.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/50 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
                <Clock size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  Upcoming Deadlines
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold">
                    {dueTasks.length} Pending
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Tasks requiring your attention soon</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/student/tasks")}
              className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 transition"
            >
              All Tasks <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dueTasks.slice(0, 3).map((task) => (
              <div
                key={task._id}
                onClick={() => navigate("/student/tasks")}
                className={`p-4 rounded-2xl border transition hover:shadow-md cursor-pointer bg-white ${
                  task.isOverdue
                    ? "border-rose-200 hover:border-rose-300"
                    : "border-amber-200 hover:border-amber-300"
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 text-sm truncate" title={task.title}>
                    {task.title}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      task.isOverdue
                        ? "bg-rose-100 text-rose-700 animate-pulse"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {task.isOverdue
                      ? "Overdue"
                      : task.diffHours <= 24
                      ? `Due in ${task.diffHours}h`
                      : `Due in ${Math.ceil(task.diffHours / 24)}d`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 capitalize">
                  {task.topic ? `Topic: ${task.topic}` : "Assignment"} • {new Date(task.dueDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* ---------------- BADGES & ACHIEVEMENTS ---------------- */}
      <div className="border rounded-3xl p-8 space-y-6 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Trophy size={22} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Earned Badges & Achievements</h2>
              <p className="text-xs text-slate-400 mt-0.5">Collect badges by completing tasks, maintaining streaks, and mastering topics</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/student/leaderboard")}
            className="text-sm text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 transition self-start sm:self-auto"
          >
            View Leaderboard <ChevronRight size={14} />
          </button>
        </div>

        {badgesLoading ? (
          <div className="flex gap-3 animate-pulse py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 w-40 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : (
          <BadgeDisplay badges={badges} />
        )}
      </div>

      {/* ---------------- ANALYTICS OVERVIEW ---------------- */}
      <div className="border rounded-3xl p-8 space-y-8 bg-white shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Your Performance Overview</h2>
          <button
            onClick={() => navigate("/student/progress")}
            className="text-sm text-slate-500 hover:text-violet-600 flex items-center gap-1 transition font-medium"
          >
            Full Report <ChevronRight size={14} />
          </button>
        </div>

        {chartsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[0, 1].map(i => (
              <div key={i} className="border rounded-2xl p-5 bg-slate-50 animate-pulse">
                <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
                <div className="h-56 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Weekly Progress */}
            <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition min-w-0 overflow-hidden">
              <h3 className="font-semibold mb-1 text-slate-800">Weekly Score Trend</h3>
              <p className="text-xs text-slate-400 mb-4">Average submission score per week</p>
              {progressData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No submissions yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={progressData}>
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Topic Performance */}
            <div className="border rounded-2xl p-5 bg-white hover:shadow-sm transition min-w-0 overflow-hidden">
              <h3 className="font-semibold mb-1 text-slate-800">Topic Performance</h3>
              <p className="text-xs text-slate-400 mb-4">Average score per topic from task submissions</p>
              {topicPerformance.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-slate-400 text-sm">Submit tasks to see topic data.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topicPerformance} barSize={22}>
                    <XAxis dataKey="topic" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    <Bar dataKey="value" name="Avg Score" radius={[5, 5, 0, 0]}>
                      {topicPerformance.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
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
