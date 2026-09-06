import { API_URL } from "../utils/api";
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
  Layers, Award, ChevronRight, Zap, BookOpen, Printer, Sparkles, User, ShieldCheck
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
  if (v >= 70) return { bar: "#10b981", text: "text-emerald-600", bg: "bg-emerald-50/60 border-emerald-200/80" };
  if (v >= 40) return { bar: "#f59e0b", text: "text-amber-600", bg: "bg-amber-50/60 border-amber-200/80" };
  return { bar: "#ef4444", text: "text-rose-600", bg: "bg-rose-50/60 border-rose-200/80" };
};

/* ─── Circular Gauge ─────────────────────────────────── */
function RadialGauge({ score, size = 190 }) {
  const r = (size - 28) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color =
    score >= 70 ? "#10b981" :
    score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="drop-shadow-xs transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#f1f5f9" strokeWidth={14} />
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={14}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-in-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-black tracking-tight" style={{ color }}>
          {score}
        </span>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">
          Out of 100
        </span>
      </div>
    </div>
  );
}

/* ─── Executive Pillar Row ───────────────────────────── */
function PillarRow({ icon, label, value, detail, weight }) {
  const displayVal = Math.min(100, Math.round(value || 0));
  const c = pillarColor(displayVal);
  return (
    <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-xs ${c.bg}`}>
      <div className="flex items-center gap-3 min-w-[210px]">
        <div className={`p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs ${c.text} shrink-0`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-black text-slate-900 text-sm tracking-tight">{label}</h4>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white border border-slate-200 text-slate-700 shadow-2xs">
              {weight}% Weight
            </span>
          </div>
          <p className="text-xs font-medium text-slate-600 mt-0.5">{detail}</p>
        </div>
      </div>

      <div className="flex-1 max-w-xs mx-4 hidden md:block">
        <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${displayVal}%`, backgroundColor: c.bar, transition: "width 1s ease-in-out" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
        <span className={`text-2xl font-black tracking-tight ${c.text}`}>{displayVal}%</span>
        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-xl border ${
          displayVal >= 70 
            ? "bg-emerald-100/90 text-emerald-800 border-emerald-200" 
            : displayVal >= 40 
            ? "bg-amber-100/90 text-amber-800 border-amber-200" 
            : "bg-rose-100/90 text-rose-800 border-rose-200"
        }`}>
          {displayVal >= 80 ? "Exceeding" : displayVal >= 70 ? "Proficient" : displayVal >= 40 ? "Developing" : "Needs Focus"}
        </span>
      </div>
    </div>
  );
}

/* ─── Topic Progress Bar ─────────────────────────────── */
function TopicBar({ topic, index }) {
  const pct = topic.percent;
  const color = TOPIC_COLORS[index % TOPIC_COLORS.length];
  return (
    <div className="flex items-center gap-4 py-1">
      <div className="w-36 text-xs font-bold text-slate-700 truncate shrink-0">
        {topic.topicName}
      </div>
      <div className="flex-1 relative h-5 bg-slate-100 rounded-full overflow-hidden p-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: index * 0.05 }}
          className="h-full rounded-full flex items-center justify-end pr-2 shadow-2xs"
          style={{ backgroundColor: color, minWidth: pct > 0 ? "1.5rem" : 0 }}
        >
          {pct >= 12 && (
            <span className="text-[10px] font-black text-white drop-shadow-2xs">{pct}%</span>
          )}
        </motion.div>
      </div>
      <div className="text-xs font-semibold w-24 shrink-0 text-right">
        {topic.completed ? (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[11px]">
            ✓ Mastered
          </span>
        ) : (
          <span className="text-slate-500">
            {topic.questionsCompleted} / {topic.totalQuestions} Qs
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Custom Tooltip ─────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl text-xs space-y-1 border border-slate-800">
      <p className="font-bold text-slate-200 border-b border-slate-700/60 pb-1 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-semibold">{p.name}:</span>
          <span className="font-black text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────── */
export default function StudentProgress() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => { fetchProgress(); }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`${API_URL}/api/progress`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) {
      console.error("Progress fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-slate-600 font-bold text-sm">Generating your academic progress report…</p>
      </div>
    );

  if (!data)
    return (
      <div className="p-10 text-center min-h-screen flex flex-col items-center justify-center gap-4">
        <Brain size={48} className="text-slate-300" />
        <p className="text-xl font-bold text-slate-700">No Academic Progress Found</p>
        <p className="text-slate-400 text-sm">Complete adaptive questions or capstone project milestones to view analysis.</p>
      </div>
    );

  const bloomLabel = {
    REMEMBER: "Remember", UNDERSTAND: "Understand", APPLY: "Apply",
    ANALYZE: "Analyze", EVALUATE: "Evaluate", CREATE: "Create",
  };

  /* Score-history bar chart data */
  const scoreBarData = (data.taskScoreHistory || []).slice(0, 8).reverse().map((t) => ({
    name: t.title.length > 14 ? t.title.slice(0, 14) + "…" : t.title,
    score: t.score,
  }));

  const safeOverallScore = Math.min(100, Math.round(data.overallScore || 0));

  const overallGrade =
    safeOverallScore >= 85 ? { label: "Grade A+ • Outstanding Performance", color: "bg-emerald-50 text-emerald-700 border-emerald-200" } :
    safeOverallScore >= 70 ? { label: "Grade A • Proficient Mastery", color: "bg-blue-50 text-blue-700 border-blue-200" } :
    safeOverallScore >= 50 ? { label: "Grade B • Satisfactory Progress", color: "bg-amber-50 text-amber-700 border-amber-200" } :
    { label: "Grade C • Needs Targeted Practice", color: "bg-rose-50 text-rose-700 border-rose-200" };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">

      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Academic Progress Report</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${overallGrade.color}`}>
              {overallGrade.label}
            </span>
          </div>
          <p className="text-slate-500 text-xs font-medium">
            Multi-dimensional evaluation across Adaptive Learning, Graded Tasks, and Capstone Projects.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-2xs cursor-pointer print:hidden"
        >
          <Printer size={15} /> Export PDF Report
        </button>
      </div>

      {/* ── SECTION 1: Overall Score & 3 Pillar Breakdown ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs space-y-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Radial Gauge Card (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center gap-4 bg-slate-50/80 p-6 rounded-2xl border border-slate-200/60 text-center">
            <RadialGauge score={safeOverallScore} size={180} />
            <div>
              <p className="font-black text-base text-slate-900">Composite Score Index</p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1 max-w-[220px]">
                Weighted Calculation: Adaptive (40%) + Tasks (35%) + Capstone (25%)
              </p>
            </div>
          </div>

          {/* 3 Core Pillar Rows (8 cols) */}
          <div className="lg:col-span-8 flex flex-col justify-between gap-3.5">
            <PillarRow
              icon={<Brain size={18} />}
              label="Adaptive Learning"
              value={data.adaptiveOverall}
              detail={`${data.adaptiveStats.filter(t => t.completed).length} of ${data.adaptiveStats.length} topics mastered`}
              weight={40}
            />
            <PillarRow
              icon={<CheckSquare size={18} />}
              label="Graded Tasks"
              value={data.taskRatio}
              detail={`${data.tasksSubmitted} of ${data.totalTasks} tasks submitted`}
              weight={35}
            />
            <PillarRow
              icon={<Layers size={18} />}
              label="Capstone Projects"
              value={data.projectRatio}
              detail={`${data.approvedMilestones} of ${data.totalMilestones} milestones approved`}
              weight={25}
            />
          </div>
        </div>

        {/* Quick KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
          {[
            { icon: <TrendingUp size={16} />, label: "Avg Task Score", val: `${data.avgScore}%`, color: "text-blue-600", bg: "bg-blue-50" },
            { icon: <Activity size={16} />, label: "Total Submissions", val: data.tasksSubmitted, color: "text-purple-600", bg: "bg-purple-50" },
            { icon: <Target size={16} />, label: "Highest Bloom Level", val: bloomLabel[data.topBloomLevel] || "N/A", color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: <Award size={16} />, label: "Active Learning Topics", val: `${data.adaptiveStats.filter(t => t.questionsCompleted > 0).length} / ${data.adaptiveStats.length}`, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((k) => (
            <div key={k.label} className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <div className={`p-2.5 rounded-xl ${k.bg} ${k.color} shrink-0`}>{k.icon}</div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{k.label}</p>
                <p className="text-base font-black text-slate-800 mt-0.5">{k.val}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── SECTION 2: Adaptive Learning Topic Matrix ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Brain size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Adaptive Topic Mastery Matrix</h2>
              <p className="text-xs font-medium text-slate-500">Real-time progress across adaptive learning sequences</p>
            </div>
          </div>
          <span className="text-xl font-black text-purple-700 bg-purple-50 px-4 py-1.5 rounded-xl border border-purple-100">
            {data.adaptiveOverall}% Mastered
          </span>
        </div>

        <div className="space-y-3.5">
          {data.adaptiveStats.map((topic, i) => (
            <TopicBar key={topic.topicId} topic={topic} index={i} />
          ))}
        </div>

        <div className="pt-3 flex gap-6 text-xs font-bold text-slate-500 flex-wrap border-t border-slate-100">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Mastered (100%)</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> In Progress (40–99%)</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Not Started (0%)</span>
        </div>
      </motion.div>

      {/* ── SECTION 3: Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Score Trajectory */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white rounded-3xl border border-slate-200/80 p-7 shadow-2xs space-y-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100"><TrendingUp size={20} /></div>
            <div>
              <h2 className="text-base font-black text-slate-900">Submission Score Trajectory</h2>
              <p className="text-xs font-medium text-slate-500">Historical performance trends over time</p>
            </div>
          </div>
          {data.recentScores.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-xs font-bold">
              No score history available yet.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.recentScores}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="score" name="Score"
                    stroke="#6366f1" strokeWidth={3}
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Topic Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-3xl border border-slate-200/80 p-7 shadow-2xs space-y-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100"><Zap size={20} /></div>
            <div>
              <h2 className="text-base font-black text-slate-900">Topic Proficiency Analysis</h2>
              <p className="text-xs font-medium text-slate-500">Average evaluation score per topic area</p>
            </div>
          </div>
          {data.topicStrengths.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-xs font-bold">
              Submit tasks to view topic proficiency analysis.
            </div>
          ) : (
            <div className="h-60">
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

      {/* ── SECTION 4: Recent Task Submissions ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100"><BookOpen size={20} /></div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Task Submission Evaluation History</h2>
              <p className="text-xs font-medium text-slate-500">Graded scores for individual task submissions</p>
            </div>
          </div>
          <div className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
            {data.tasksSubmitted} of {data.totalTasks} Tasks Submitted
          </div>
        </div>

        {scoreBarData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-3">
            <CheckSquare size={36} className="opacity-30" />
            <p>No task evaluations found. Complete assigned tasks to populate this history.</p>
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

        {/* Score Legend */}
        <div className="flex gap-6 pt-3 text-xs font-semibold text-slate-500 flex-wrap border-t border-slate-100">
          {[
            { color: "#10b981", label: "80–100 Excellent" },
            { color: "#f59e0b", label: "60–79 Good" },
            { color: "#f97316", label: "40–59 Average" },
            { color: "#ef4444", label: "0–39 Needs Focus" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm inline-block shadow-2xs" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ── SECTION 5: Bloom's Taxonomy Cognitive Level Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase tracking-widest">
              Bloom's Cognitive Taxonomy
            </span>
            <h2 className="text-3xl font-black tracking-tight mt-2 text-white">
              Highest Mastery Level: {bloomLabel[data.topBloomLevel] || "Not Started"}
            </h2>
            <p className="text-slate-400 mt-1.5 text-xs max-w-xl leading-relaxed">
              Cognitive mastery evaluates intellectual complexity — advancing from foundational knowledge recall (Remember) to creative problem solving and synthesis (Create).
            </p>
          </div>

          <div className="flex gap-2 flex-wrap max-w-md">
            {["REMEMBER","UNDERSTAND","APPLY","ANALYZE","EVALUATE","CREATE"].map((lvl, i) => {
              const bloomOrder = ["REMEMBER","UNDERSTAND","APPLY","ANALYZE","EVALUATE","CREATE"];
              const reached = data.topBloomLevel !== "N/A" && bloomOrder.indexOf(data.topBloomLevel) >= i;
              return (
                <div key={lvl} className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                  reached 
                    ? "bg-purple-600 text-white border-purple-500 shadow-xs" 
                    : "bg-slate-800/80 text-slate-500 border-slate-700/60"
                }`}>
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
