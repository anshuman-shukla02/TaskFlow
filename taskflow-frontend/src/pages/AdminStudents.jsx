import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { Users, Filter, Mail, GraduationCap, X, TrendingUp, CheckCircle, BookOpen, CalendarCheck, CalendarX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

const attendanceColor = (pct) => {
  if (pct >= 75) return { ring: "#22c55e", bg: "clay-tint-mint", text: "text-green-700", label: "Good" };
  if (pct >= 50) return { ring: "#f59e0b", bg: "bg-amber-50",  text: "text-amber-700",  label: "Average" };
  return            { ring: "#ef4444", bg: "bg-red-50",    text: "text-red-700",    label: "Low" };
};

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  /* detail panel */
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [growthData, setGrowthData]     = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);

  useEffect(() => { fetchStudents(); }, []);

  /* fetch student list */
  const fetchStudents = async () => {
    try {
      const res  = await fetch("http://localhost:5002/api/analytics/faculty/students-overview", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setStudents(data.students);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };

  /* open panel + load data */
  const openDetail = async (student) => {
    setSelectedStudent(student);
    setGrowthData([]);
    setAttendanceData(null);

    // growth
    try {
      const res  = await fetch(`http://localhost:5002/api/analytics/faculty/student-growth/${student._id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setGrowthData(data.history.map((item) => ({
          date:  new Date(item.createdAt).toLocaleDateString(),
          score: item.performanceScore,
          topic: item.topic,
        })));
      }
    } catch { /* ignore */ }

    // attendance
    try {
      const res  = await fetch(`http://localhost:5002/api/attendance/student/${student._id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setAttendanceData(data);
    } catch { /* ignore */ }
  };

  const filteredStudents = filter === "All" ? students : students.filter((s) => s.division === filter);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="clay-spinner" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-clay-text">Student Enrollment</h1>
          <p className="text-clay-muted mt-1">Complete overview of registered students across all divisions.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl  shadow-sm">
          <Filter size={18} className="text-clay-muted ml-2" />
          <div className="flex gap-1">
            {["All", "A", "B", "C"].map((div) => (
              <button
                key={div}
                onClick={() => setFilter(div)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${filter === div ? "bg-purple-600 text-white shadow-md" : "text-clay-muted hover:bg-slate-50"}`}
              >
                Div {div}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <div
            key={student._id}
            onClick={() => openDetail(student)}
            className="bg-white rounded-3xl p-6 shadow-sm  hover:shadow-md hover:border-purple-100 transition group cursor-pointer"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl clay-tint-sky flex items-center justify-center text-purple-600 font-bold text-xl uppercase">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-clay-text truncate group-hover:text-purple-600 transition">{student.name}</h3>
                <p className="text-xs text-clay-muted flex items-center gap-1">
                  <Mail size={12} /> {student.email}
                </p>
              </div>
              <div className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                DIV {student.division}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 clay-card-flat">
                <p className="text-[10px] font-bold text-clay-muted uppercase mb-1">Performance</p>
                <p className="text-lg font-bold text-clay-text">{student.avgPerformance}%</p>
              </div>
              <div className="p-3 clay-card-flat">
                <p className="text-[10px] font-bold text-clay-muted uppercase mb-1">Tasks</p>
                <p className="text-lg font-bold text-clay-text">{student.tasksCompleted}</p>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-50">
              <div className="flex items-center gap-1.5 text-clay-muted font-medium">
                <GraduationCap size={14} className="text-clay-muted" />
                Roll: {student.rollNumber || "Not Set"}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                student.tag === "Top Performer" ? "bg-emerald-100 text-emerald-700" :
                student.tag === "Needs Support" ? "bg-rose-100 text-rose-700" :
                "bg-blue-100 text-blue-700"
              }`}>
                {student.tag}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed ">
          <Users size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-clay-muted font-medium">No students found for Division {filter}</p>
        </div>
      )}

      {/* ── DETAIL SLIDE-OUT PANEL ── */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end clay-modal-overlay"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-clay-text">{selectedStudent.name}</h2>
                  <p className="text-clay-muted text-sm mt-1">
                    {selectedStudent.email} • {selectedStudent.rollNumber} • Div {selectedStudent.division}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 rounded-full hover:bg-slate-100 text-clay-muted"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="clay-tint-sky p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2 text-purple-600">
                    <TrendingUp size={18} />
                    <span className="font-semibold text-xs uppercase">Avg Score</span>
                  </div>
                  <p className="text-3xl font-bold text-clay-text">{selectedStudent.avgPerformance}%</p>
                </div>
                <div className="clay-tint-purple p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2 text-purple-600">
                    <CheckCircle size={18} />
                    <span className="font-semibold text-xs uppercase">Tasks</span>
                  </div>
                  <p className="text-3xl font-bold text-clay-text">{selectedStudent.tasksCompleted}</p>
                </div>
                <div className="clay-tint-peach p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2 text-orange-600">
                    <BookOpen size={18} />
                    <span className="font-semibold text-xs uppercase">Projects</span>
                  </div>
                  <p className="text-3xl font-bold text-clay-text">{selectedStudent.projectsCompleted}</p>
                </div>
              </div>

              {/* ── Attendance Section ── */}
              <div className="mb-10">
                <h3 className="text-xl font-bold text-clay-text mb-6 flex items-center gap-2">
                  <CalendarCheck size={20} className="text-emerald-500" />
                  Attendance
                </h3>

                {!attendanceData ? (
                  <div className="text-center py-8 text-clay-muted">Loading attendance…</div>
                ) : (
                  <>
                    {(() => {
                      const c = attendanceColor(attendanceData.percentage);
                      return (
                        <div className={`${c.bg} rounded-2xl p-5 mb-5 flex items-center justify-between`}>
                          <div>
                            <p className={`text-4xl font-extrabold ${c.text}`}>{attendanceData.percentage}%</p>
                            <p className="text-sm text-clay-muted mt-1">
                              {attendanceData.attendedCount} of {attendanceData.totalSessions} sessions attended
                            </p>
                            <span className={`mt-2 inline-block text-xs font-bold uppercase px-3 py-1 rounded-full ${c.bg} ${c.text} border border-current/20`}>
                              {c.label} attendance
                            </span>
                          </div>
                          <svg width="80" height="80" className="shrink-0">
                            <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                            <circle
                              cx="40" cy="40" r="32"
                              fill="none"
                              stroke={c.ring}
                              strokeWidth="8"
                              strokeDasharray={`${2 * Math.PI * 32}`}
                              strokeDashoffset={`${2 * Math.PI * 32 * (1 - attendanceData.percentage / 100)}`}
                              strokeLinecap="round"
                              transform="rotate(-90 40 40)"
                            />
                            <text x="40" y="45" textAnchor="middle" fontSize="14" fontWeight="bold" fill={c.ring}>
                              {attendanceData.percentage}%
                            </text>
                          </svg>
                        </div>
                      );
                    })()}

                    {attendanceData.records.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-clay-muted border border-dashed rounded-2xl">
                        <CalendarX size={32} className="mb-2 opacity-40" />
                        <p>No attendance records yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        <p className="text-xs font-bold text-clay-muted uppercase tracking-wider mb-3">Recent Sessions</p>
                        {attendanceData.records.slice(0, 20).map((rec) => (
                          <div key={rec._id} className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-2.5 text-sm">
                            <span className="text-clay-secondary font-medium">
                              {new Date(rec.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-clay-muted text-xs">{rec.distance}m away</span>
                              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" title="Present" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Performance Growth Chart ── */}
              <div className="mb-10">
                <h3 className="text-xl font-bold text-clay-text mb-6">Performance Growth</h3>
                <div className="h-64 w-full bg-white border rounded-2xl p-4 shadow-sm">
                  {growthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3}
                          dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
                          activeDot={{ r: 6, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-clay-muted">
                      No submission history yet
                    </div>
                  )}
                </div>
              </div>

              {/* ── Activity Breakdown ── */}
              <div>
                <h3 className="text-xl font-bold text-clay-text mb-6">Activity Breakdown</h3>
                <div className="h-64 w-full bg-white border rounded-2xl p-4 shadow-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Tasks",     count: selectedStudent.tasksCompleted },
                      { name: "Projects",  count: selectedStudent.projectsCompleted },
                      { name: "Questions", count: selectedStudent.questionsSolved },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="count" fill="#1e293b" radius={[6, 6, 0, 0]} barSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
