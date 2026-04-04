import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, Activity, Target, Brain, CheckSquare,
  Layers, Award, ChevronRight, Zap, BookOpen,
} from "lucide-react";

/* ─── Colour palette ─────────────────────────────────── */
const TOPIC_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899",
];

const SCORE_COLORS = (score) => {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
};

const pillarColor = (v) => {
  if (v >= 70) return { bar: "#10b981", text: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" };
  if (v >= 40) return { bar: "#f59e0b", text: "text-amber-600", bg: "bg-amber-50 border-amber-100" };
  return { bar: "#ef4444", text: "text-red-500", bg: "bg-red-50 border-red-100" };
};

/* ─── Circular gauge ─────────────────────────────────── */
function RadialGauge({ score, size = 180 }) {
  const r = (size - 24) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color =
    score >= 70 ? "#10b981" :
    score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="drop-shadow-sm">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#e2e8f0" strokeWidth={14} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={14}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x={size / 2} y={size / 2 - 6}
        textAnchor="middle" fontSize={36} fontWeight="800" fill={color}>
        {score}
      </text>
      <text x={size / 2} y={size / 2 + 18}
        textAnchor="middle" fontSize={12} fill="#94a3b8">
        / 100
      </text>
    </svg>
  );
}

/* ─── Pillar mini card ───────────────────────────────── */
function PillarCard({ icon, label, value, detail, weight }) {
  const c = pillarColor(value);
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-2 ${c.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={c.text}>{icon}</span>
          <span className="font-semibold text-slate-700 text-sm">{label}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {weight}% weight
        </span>
      </div>
      <p className={`text-3xl font-extrabold ${c.text}`}>{value}%</p>
      <p className="text-xs text-slate-500">{detail}</p>
      {/* mini progress bar */}
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: c.bar, transition: "width 1s ease" }}
        />
      </div>
    </div>
  );
}

/* ─── Topic progress bar ─────────────────────────────── */
function TopicBar({ topic, index }) {
  const pct = topic.percent;
  const color = TOPIC_COLORS[index % TOPIC_COLORS.length];
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-sm font-medium text-slate-700 truncate shrink-0">
        {topic.topicName}
      </div>
      <div className="flex-1 relative h-5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: index * 0.06 }}
          className="h-full rounded-full flex items-center justify-end pr-2"
          style={{ backgroundColor: color, minWidth: pct > 0 ? "1.25rem" : 0 }}
        >
          {pct >= 12 && (
            <span className="text-[10px] font-bold text-white">{pct}%</span>
          )}
        </motion.div>
      </div>
      <div className="text-xs text-slate-500 w-20 shrink-0 text-right">
        {topic.completed ? (
          <span className="font-bold text-emerald-600">✓ Mastered</span>
        ) : (
          `${topic.questionsCompleted} / ${topic.totalQuestions} Q`
        )}
      </div>
    </div>
  );
}

/* ─── Custom tooltip ─────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ─── Main component ─────────────────────────────────── */
export default function StudentProgress() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => { fetchProgress(); }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch("http://localhost:5002/api/progress", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading your progress…</p>
      </div>
    );

  if (!data)
    return (
      <div className="p-10 text-center min-h-screen flex flex-col items-center justify-center gap-4">
        <Brain size={48} className="text-slate-300" />
        <p className="text-xl font-semibold text-slate-500">No progress data yet.</p>
        <p className="text-slate-400 text-sm">Start solving tasks & adaptive questions to see your analytics!</p>
      </div>
    );

  const bloomLabel = {
    REMEMBER: "Remember", UNDERSTAND: "Understand", APPLY: "Apply",
    ANALYZE: "Analyze", EVALUATE: "Evaluate", CREATE: "Create",
  };

  /* Score-history bar chart data */
  const scoreBarData = (data.taskScoreHistory || []).slice(0, 8).reverse().map((t, i) => ({
    name: t.title.length > 12 ? t.title.slice(0, 12) + "…" : t.title,
    score: t.score,
  }));

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pb-24">

      {/* ── Page title ── */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Progress Report</h1>
        <p className="text-slate-500 mt-1 text-sm">A holistic view of your learning journey across all activities.</p>
      </div>

      {/* ── SECTION 1: Overall score + pillars ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
      >
        <div className="flex flex-col lg:flex-row items-center gap-10">
          {/* Gauge */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <RadialGauge score={data.overallScore} size={190} />
            <div className="text-center">
              <p className="font-bold text-lg text-slate-800">Overall Progress Score</p>
              <p className="text-xs text-slate-400 mt-0.5">Adaptive × 0.4 + Tasks × 0.35 + Projects × 0.25</p>
            </div>
          </div>

          {/* Pillar cards */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
            <PillarCard
              icon={<Brain size={18} />}
              label="Adaptive Learning"
              value={data.adaptiveOverall}
              detail={`${data.adaptiveStats.filter(t => t.completed).length} of ${data.adaptiveStats.length} topics mastered`}
              weight={40}
            />
            <PillarCard
              icon={<CheckSquare size={18} />}
              label="Tasks Completed"
              value={data.taskRatio}
              detail={`${data.tasksSubmitted} of ${data.totalTasks} tasks submitted`}
              weight={35}
            />
            <PillarCard
              icon={<Layers size={18} />}
              label="Project Milestones"
              value={data.projectRatio}
              detail={`${data.approvedMilestones} of ${data.totalMilestones} milestones approved`}
              weight={25}
            />
          </div>
        </div>

        {/* Quick KPIs row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
          {[
            { icon: <TrendingUp size={16} />, label: "Avg Score", val: `${data.avgScore}%`, color: "text-blue-600", bg: "bg-blue-50" },
            { icon: <Activity size={16} />, label: "Submissions", val: data.tasksSubmitted, color: "text-violet-600", bg: "bg-violet-50" },
            { icon: <Target size={16} />, label: "Bloom Level", val: bloomLabel[data.topBloomLevel] || "N/A", color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: <Award size={16} />, label: "Topics Active", val: `${data.adaptiveStats.filter(t => t.questionsCompleted > 0).length} / ${data.adaptiveStats.length}`, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((k) => (
            <div key={k.label} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className={`p-2 rounded-xl ${k.bg} ${k.color}`}>{k.icon}</div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{k.label}</p>
                <p className="font-bold text-slate-800">{k.val}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── SECTION 2: Adaptive Learning topic progress ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-violet-50 text-violet-600"><Brain size={20} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Adaptive Learning Progress</h2>
            <p className="text-xs text-slate-400">Questions completed per topic in the adaptive sequence</p>
          </div>
          <div className="ml-auto text-2xl font-extrabold text-violet-600">{data.adaptiveOverall}%</div>
        </div>

        <div className="space-y-4">
          {data.adaptiveStats.map((topic, i) => (
            <TopicBar key={topic.topicId} topic={topic} index={i} />
          ))}
        </div>

        <div className="mt-6 flex gap-4 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Mastered (100%)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> In Progress (40–99%)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Not Started (0%)</span>
        </div>
      </motion.div>

      {/* ── SECTION 3: Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Score Trajectory */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600"><TrendingUp size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Score Trajectory</h2>
              <p className="text-xs text-slate-400">Your adaptive submission scores over time</p>
            </div>
          </div>
          {data.recentScores.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No submission history yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.recentScores}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="score" name="Score"
                    stroke="#6366f1" strokeWidth={3}
                    dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Topic Mastery */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600"><Zap size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Topic Mastery</h2>
              <p className="text-xs text-slate-400">Average task score per topic</p>
            </div>
          </div>
          {data.topicStrengths.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Submit tasks to see topic performance.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topicStrengths} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="_id" type="category" width={110} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgScore" name="Avg Score" radius={[0, 6, 6, 0]} barSize={18}>
                    {data.topicStrengths.map((_, i) => (
                      <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── SECTION 4: Task submission history ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600"><BookOpen size={20} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Recent Task Submissions</h2>
            <p className="text-xs text-slate-400">Latest graded task scores</p>
          </div>
          <div className="ml-auto text-sm text-slate-400 font-medium">
            {data.tasksSubmitted} / {data.totalTasks} tasks
          </div>
        </div>

        {scoreBarData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
            <CheckSquare size={36} className="opacity-30" />
            <p>No task submissions yet. Submit your first task!</p>
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBarData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Score" radius={[6, 6, 0, 0]}>
                  {scoreBarData.map((entry, i) => (
                    <Cell key={i} fill={SCORE_COLORS(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Score legend */}
        <div className="flex gap-6 mt-4 text-xs text-slate-400 flex-wrap">
          {[
            { color: "#10b981", label: "80–100 Excellent" },
            { color: "#f59e0b", label: "60–79 Good" },
            { color: "#f97316", label: "40–59 Average" },
            { color: "#ef4444", label: "0–39 Needs Work" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ── SECTION 5: Bloom's level badge ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg"
      >
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <p className="text-violet-200 text-sm font-medium mb-1 uppercase tracking-wider">Highest Bloom's Level Reached</p>
            <h2 className="text-4xl font-extrabold tracking-tight">
              {bloomLabel[data.topBloomLevel] || "Not Started"}
            </h2>
            <p className="text-violet-200 mt-2 text-sm max-w-md">
              Bloom's Taxonomy measures depth of learning — from basic recall (Remember) up to creative synthesis (Create). Keep pushing higher!
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["REMEMBER","UNDERSTAND","APPLY","ANALYZE","EVALUATE","CREATE"].map((lvl, i) => {
              const bloomOrder = ["REMEMBER","UNDERSTAND","APPLY","ANALYZE","EVALUATE","CREATE"];
              const reached = data.topBloomLevel !== "N/A" && bloomOrder.indexOf(data.topBloomLevel) >= i;
              return (
                <div key={lvl} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition
                  ${reached ? "bg-white text-violet-700 border-white" : "bg-white/10 text-violet-300 border-white/20"}`}>
                  {bloomLabel[lvl]}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

    </div>
  );
}
