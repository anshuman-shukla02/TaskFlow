import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FacultyProjectReviewModal from "../components/FacultyProjectReviewModal";
import {
  User, Clock, FileText, CheckCircle, XCircle, ChevronDown,
  ChevronUp, Inbox, Search, Filter, Code, Copy, Check, Maximize2, Minimize2, ExternalLink, Sparkles, Download
} from "lucide-react";
import CommentThread from "../components/common/CommentThread";
import { exportToCsv } from "../utils/csv";

/* ── helpers ─────────────────────────────────────────────────── */
const DIVISIONS = ["All", "A", "B", "C"];

const formatMarkdownText = (text) => {
  if (!text) return "";
  let formatted = text.replace(/\r\n/g, "\n");
  formatted = formatted
    .replace(/([^\n])\s*(\d+\.\s*\*\*)/gi, "$1\n\n$2")
    .replace(/([^\n])\s*(\b[a-z]\.\s*\*\*)/gi, "$1\n\n$2")
    .replace(/([^\n])\s*(\d+\.\s+[A-Z])/g, "$1\n\n$2")
    .replace(/([^\n])\s*(\b[a-z]\.\s+[A-Z])/g, "$1\n\n$2");
  return formatted.trim();
};

const diffColor = {
  easy:   "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard:   "bg-red-100 text-red-700",
};

const scoreColor = (s) => {
  if (s >= 8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (s >= 5) return "text-amber-600 bg-amber-50 border-amber-200";
  if (s >  0) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-slate-500 bg-slate-50 border-slate-200";
};

const reviewBadge = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

/* ── CodeSubmissionViewer ────────────────────────────────────── */
function CodeSubmissionViewer({ code, fileUrl }) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!code && !fileUrl) {
    return (
      <div className="text-slate-400 text-xs italic bg-slate-50 rounded-2xl p-4 border border-dashed text-center">
        No code content submitted.
      </div>
    );
  }

  const codeLines = (code || "").split("\n");

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden font-mono text-xs shadow-inner my-3">
      {/* Code Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <Code size={13} className="text-purple-400" />
          <span>{code ? `Submitted Code / Pseudocode (${codeLines.length} lines)` : "Artifact View"}</span>
        </div>
        <div className="flex items-center gap-2">
          {code && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          )}
          {code && codeLines.length > 5 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition"
            >
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span>{isExpanded ? "Collapse" : "Expand Code"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Viewer Body */}
      {code && (
        <div className={`p-4 overflow-auto font-mono text-xs leading-relaxed text-slate-200 transition-all ${isExpanded ? "max-h-[600px]" : "min-h-[140px] max-h-[280px]"}`}>
          <div className="flex">
            <div className="select-none text-slate-600 pr-3.5 text-right border-r border-slate-800 font-mono shrink-0">
              {codeLines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="pl-3.5 whitespace-pre overflow-x-auto flex-1 font-mono text-slate-100 tab-size-2">
              {code}
            </pre>
          </div>
        </div>
      )}

      {fileUrl && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-right">
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-bold underline"
          >
            <ExternalLink size={13} /> Open Attached File / Deployment URL
          </a>
        </div>
      )}
    </div>
  );
}

/* ── SubmissionCard ──────────────────────────────────────────── */
function SubmissionCard({ sub, onScored, onReviewed, onOpenModal }) {
  const [expanded, setExpanded] = useState(false);

  const task    = sub.taskId || {};
  const student = sub.userId || {};

  const questions    = task.questions || [];
  const isProject    = sub.milestoneId != null;           // milestone submission
  const isQBased     = !isProject && questions.length > 0; // task w/ questions (never project)
  const isPlain      = !isProject && !isQBased;            // task w/ free-text answer
  const taskHasMarks = !!task.hasMarks;

  /* plain-task mark state */
  const [plainScore, setPlainScore] = useState(sub.performanceScore ?? 0);
  const [savingMark, setSavingMark] = useState(false);
  const [markSaved,  setMarkSaved]  = useState(false);

  /* question-based grading state — initialised once */
  const [qScores, setQScores] = useState(() =>
    questions.map((_, i) => {
      const existing = (sub.questionScores || []).find(s => s.questionIndex === i);
      return { questionIndex: i, score: existing?.score ?? 0 };
    })
  );
  const [savingQ, setSavingQ] = useState(false);

  /* project review state */
  const [projScore, setProjScore] = useState(
    sub.performanceScore ?? (sub.aiEvaluation?.suggestedScore ? sub.aiEvaluation.suggestedScore * 10 : 85)
  );
  const [reviewing,    setReviewing]    = useState(null); // "APPROVED"|"REJECTED"
  const [feedback,     setFeedback]     = useState(sub.reviewFeedback || sub.aiEvaluation?.suggestedFeedback || "");
  const [showFeedback, setShowFeedback] = useState(false);

  /* plagiarism check state */
  const [plagiarismResult, setPlagiarismResult] = useState(sub.plagiarismCheck || null);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);

  /* ── plain mark save ── */
  const handleSaveMark = async () => {
    setSavingMark(true);
    try {
      const res = await fetch(`${API_URL}/api/submissions/${sub._id}/mark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ score: plainScore }),
      });
      const data = await res.json();
      if (data.success) {
        setMarkSaved(true);
        onScored(sub._id, data.submission.performanceScore);
        setTimeout(() => setMarkSaved(false), 2000);
      } else {
        alert("Failed to save score: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Save mark error", err);
      alert("Network error saving score.");
    } finally {
      setSavingMark(false);
    }
  };

  /* ── question score helpers ── */
  const calcQTotal = () => {
    const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
    const earned     = qScores.reduce((s, qs) => s + (Number(qs.score) || 0), 0);
    return totalMarks > 0 ? Math.round((earned / totalMarks) * 10) : 0;
  };

  const handleSaveQScore = async () => {
    setSavingQ(true);
    try {
      const res = await fetch(`${API_URL}/api/submissions/${sub._id}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ questionScores: qScores }),
      });
      const data = await res.json();
      if (data.success) {
        onScored(sub._id, data.submission.performanceScore);
      } else {
        alert("Failed to save scores: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Save Q score error", err);
      alert("Network error saving scores.");
    } finally {
      setSavingQ(false);
    }
  };

  /* ── project review ── */
  const handleReview = async (status) => {
    setReviewing(status);
    try {
      const res = await fetch(`${API_URL}/api/submissions/${sub._id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status, feedback, performanceScore: Number(projScore) || 0 }),
      });
      const data = await res.json();
      if (data.success) {
        onReviewed(sub._id, status, feedback);
        if (onScored) onScored(sub._id, Number(projScore) || 0);
        setShowFeedback(false);
      } else {
        alert("Failed to save review: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Review error", err);
      alert("Network error saving review.");
    } finally {
      setReviewing(null);
    }
  };

  /* ── render ── */
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">

      {/* ── Card header (always visible) ── */}
      <div
        className="p-5 flex items-start justify-between cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
            {student.name?.charAt(0)?.toUpperCase() || "?"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="font-semibold text-slate-800">{student.name || "—"}</p>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                {student.rollNumber || "—"}
              </span>
              {student.division && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                  Div {student.division}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{student.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-slate-400 truncate max-w-[160px] font-medium">{task.title || "—"}</p>
            {task.topic && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {task.topic}
              </span>
            )}
          </div>

          {/* Marks badge */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            taskHasMarks ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
          }`}>
            {taskHasMarks ? "Marked" : "Practice"}
          </span>

          {/* Score badge — only meaningful for marked tasks */}
          {taskHasMarks && !isProject && (
            <div className={`text-sm font-bold px-3 py-1.5 rounded-xl border ${scoreColor(sub.performanceScore)}`}>
              {sub.performanceScore ?? 0}/10
            </div>
          )}

          {/* Project review status badge */}
          {isProject && (
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${reviewBadge[sub.reviewStatus] || reviewBadge.PENDING}`}>
              {sub.reviewStatus || "PENDING"}
            </span>
          )}

          <div className="text-slate-400">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* ── Expandable body ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">

              {/* Meta row */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border">
                  <Clock size={11} /> {new Date(sub.createdAt).toLocaleString("en-IN")}
                </span>
                {task.difficulty && task.difficulty !== "none" && (
                  <span className={`px-2.5 py-1 rounded-full font-bold capitalize ${diffColor[task.difficulty] || "bg-slate-100 text-slate-600"}`}>
                    {task.difficulty}
                  </span>
                )}
                {task.bloomLevel && task.bloomLevel !== "none" && (
                  <span className="bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-full capitalize">
                    {task.bloomLevel}
                  </span>
                )}
                {isProject && sub.milestoneId !== null && sub.milestoneId !== undefined && (
                  <span className="bg-purple-50 text-purple-600 font-semibold px-2.5 py-1 rounded-full">
                    Phase {Number(sub.milestoneId) + 1}
                    {task.phases?.[Number(sub.milestoneId)]?.milestone &&
                      ` — ${task.phases[Number(sub.milestoneId)].milestone}`}
                  </span>
                )}
              </div>

              {/* ✨ AI Auto-Evaluation Banner (if present) */}
              {sub.aiEvaluation && (
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-100/70 p-4 rounded-2xl border border-purple-200 text-purple-950 flex flex-col gap-2 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                      <Sparkles size={15} className="text-amber-500 shrink-0 animate-pulse" />
                      <span>✨ AI Recommended Grade:</span>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-purple-200 text-purple-900 border border-purple-300">
                        {sub.aiEvaluation.suggestedScore ?? 8} / 10
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (sub.aiEvaluation.suggestedScore !== null) {
                          setPlainScore(sub.aiEvaluation.suggestedScore);
                          setProjScore(sub.aiEvaluation.suggestedScore * 10);
                        }
                        if (sub.aiEvaluation.suggestedFeedback) {
                          setFeedback(sub.aiEvaluation.suggestedFeedback);
                        }
                        if (Array.isArray(sub.aiEvaluation.questionScores) && sub.aiEvaluation.questionScores.length > 0) {
                          setQScores(sub.aiEvaluation.questionScores);
                        }
                      }}
                      className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[10px] font-bold shadow-xs transition cursor-pointer"
                    >
                      Pre-fill AI Scores & Remarks
                    </button>
                  </div>
                  {sub.aiEvaluation.suggestedFeedback && (
                    <div className="text-xs text-slate-800 leading-relaxed font-sans prose prose-slate max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="text-xs text-slate-800 leading-relaxed mb-1 font-normal">{children}</p>,
                          strong: ({ children }) => <strong className="font-extrabold text-purple-950 bg-purple-100/80 px-1 py-0.5 rounded text-[11px] border border-purple-200/80">{children}</strong>,
                          li: ({ children }) => <li className="text-slate-800 text-xs leading-relaxed mb-0.5">{children}</li>
                        }}
                      >
                        {formatMarkdownText(sub.aiEvaluation.suggestedFeedback)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* 🔍 Plagiarism Check Section */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={async () => {
                    setCheckingPlagiarism(true);
                    try {
                      const res = await fetch(`${API_URL}/api/plagiarism/check/${sub._id}`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${getToken()}` },
                      });
                      const data = await res.json();
                      if (data.success) setPlagiarismResult(data.result);
                      else alert(data.message || "Check failed");
                    } catch (err) {
                      console.error(err);
                      alert("Plagiarism check failed");
                    } finally {
                      setCheckingPlagiarism(false);
                    }
                  }}
                  disabled={checkingPlagiarism}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {checkingPlagiarism ? (
                    <><span className="animate-spin">⏳</span> Checking...</>
                  ) : (
                    <>🔍 Check Plagiarism</>
                  )}
                </button>

                {plagiarismResult && plagiarismResult.checkedAt && (
                  <div className={`flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg border ${
                    plagiarismResult.flagged
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    <span>{plagiarismResult.flagged ? "⚠️" : "✅"}</span>
                    <span>{plagiarismResult.score}% similar</span>
                    {plagiarismResult.matchedStudentName && plagiarismResult.flagged && (
                      <span className="text-[10px] font-normal">— matched with {plagiarismResult.matchedStudentName}</span>
                    )}
                  </div>
                )}
              </div>

              {plagiarismResult && plagiarismResult.summary && plagiarismResult.checkedAt && (
                <div className={`text-xs p-3 rounded-xl border ${
                  plagiarismResult.flagged
                    ? "bg-red-50/50 border-red-100 text-red-800"
                    : "bg-slate-50 border-slate-100 text-slate-600"
                }`}>
                  <p className="font-bold text-[10px] uppercase tracking-wider mb-1 opacity-70">AI Analysis</p>
                  <p className="leading-relaxed">{plagiarismResult.summary}</p>
                </div>
              )}


              {/* ════════════════════════════════════════════
                  TASK: QUESTION-BASED + HAS MARKS
                  ════════════════════════════════════════════ */}
              {isQBased && taskHasMarks && (
                <div className="space-y-3">
                  {questions.map((q, i) => {
                    const answerObj = (sub.questionAnswers || []).find(a => a.questionIndex === i);
                    return (
                      <div key={i} className="rounded-xl overflow-hidden border border-slate-100">
                        <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                          <div
                            className="text-xs font-semibold text-slate-700 flex-1 prose prose-xs max-w-none"
                            dangerouslySetInnerHTML={{ __html: `Q${i + 1} — ${q.text}` }}
                          />
                          <span className="text-xs text-slate-400 ml-2 shrink-0">Max: {q.marks}</span>
                        </div>
                        <div className="p-4 space-y-3">
                          {answerObj?.fileUrl && (
                            <a href={answerObj.fileUrl} target="_blank" rel="noreferrer"
                              className="inline-block border rounded-lg overflow-hidden hover:opacity-90 shadow-sm">
                              <img src={answerObj.fileUrl} alt="" className="h-28 w-auto object-cover max-w-xs" />
                            </a>
                          )}
                          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 max-h-28 overflow-y-auto leading-relaxed prose prose-sm max-w-none prose-slate">
                            {answerObj?.answer ? (
                              <div dangerouslySetInnerHTML={{ __html: answerObj.answer }} />
                            ) : (
                              <span className="italic text-slate-400">No text answer.</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-500">Score:</label>
                            <input
                              type="number" min="0" max={q.marks}
                              value={qScores[i]?.score ?? 0}
                              onChange={e => setQScores(prev => prev.map((s, si) =>
                                si === i ? { ...s, score: Math.min(q.marks, Math.max(0, Number(e.target.value) || 0)) } : s
                              ))}
                              className="w-20 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                            />
                            <span className="text-xs text-slate-400">/ {q.marks}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Score tally + save */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl px-5 py-3">
                    <div>
                      <p className="text-xs text-slate-300">Calculated Score</p>
                      <p className="text-2xl font-bold">
                        {calcQTotal()}
                        <span className="text-sm font-normal text-slate-300"> / 10</span>
                      </p>
                    </div>
                    <button
                      onClick={handleSaveQScore}
                      disabled={savingQ}
                      className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2 rounded-full font-semibold text-sm hover:bg-slate-100 transition disabled:opacity-60"
                    >
                      <CheckCircle size={16} />
                      {savingQ ? "Saving…" : "Save Score"}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════
                  TASK: QUESTION-BASED, PRACTICE (no marks)
                  ════════════════════════════════════════════ */}
              {isQBased && !taskHasMarks && (
                <div className="space-y-3">
                  {questions.map((q, i) => {
                    const answerObj = (sub.questionAnswers || []).find(a => a.questionIndex === i);
                    return (
                      <div key={i} className="rounded-xl overflow-hidden border border-dashed border-slate-200">
                        <div
                          className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 prose prose-xs max-w-none"
                          dangerouslySetInnerHTML={{ __html: `Q${i + 1} — ${q.text}` }}
                        />
                        <div className="p-3 text-sm text-slate-600 bg-white max-h-24 overflow-y-auto prose prose-sm max-w-none prose-slate">
                          {answerObj?.answer ? (
                            <div dangerouslySetInnerHTML={{ __html: answerObj.answer }} />
                          ) : (
                            <span className="italic text-slate-400">No answer.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-dashed">
                    Practice task — no marks assigned
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════
                  TASK: PLAIN SINGLE MODE + HAS MARKS
                  ════════════════════════════════════════════ */}
              {isPlain && taskHasMarks && (
                <div className="space-y-3">
                  {/* Code Submission Viewer */}
                  <CodeSubmissionViewer code={sub.code} fileUrl={sub.fileUrl} />

                  {/* Mark input */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Assign Score
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number" min="0" max="10" step="0.5"
                          value={plainScore}
                          onChange={e => setPlainScore(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
                          className="w-24 border rounded-xl px-3 py-2 text-lg font-bold text-center focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-white"
                        />
                        <span className="text-slate-400 font-medium">/ 10</span>
                        {/* Score bar */}
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                            style={{ width: `${(plainScore / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveMark}
                      disabled={savingMark}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm ${
                        markSaved
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                      }`}
                    >
                      <CheckCircle size={16} />
                      {savingMark ? "Saving…" : markSaved ? "Saved!" : "Save Score"}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════
                  TASK: PLAIN SINGLE MODE, PRACTICE (no marks)
                  ════════════════════════════════════════════ */}
              {isPlain && !taskHasMarks && (
                <div className="space-y-2">
                  <CodeSubmissionViewer code={sub.code} fileUrl={sub.fileUrl} />
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-dashed">
                    Practice task — no marks assigned
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════
                  PROJECT MILESTONE
                  ════════════════════════════════════════════ */}
              {isProject && (
                <div className="space-y-4">
                  {/* Code Submission Viewer */}
                  <CodeSubmissionViewer code={sub.code} fileUrl={sub.fileUrl} />

                  {/* Open Detailed Modal Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onOpenModal && onOpenModal(sub)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles size={15} />
                      <span>Open Detailed Review Modal & AI Co-Pilot</span>
                    </button>
                  </div>

                  {/* Existing feedback */}
                  {sub.reviewFeedback && (
                    <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs text-slate-800 space-y-1">
                      <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block mb-1">
                        Faculty Feedback:
                      </span>
                      <div className="text-xs text-slate-800 leading-relaxed font-sans prose prose-slate max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="text-xs text-slate-800 leading-relaxed mb-1.5 font-normal">{children}</p>,
                            strong: ({ children }) => <strong className="font-extrabold text-purple-950 bg-purple-100/80 px-1 py-0.5 rounded text-[11px] border border-purple-200/80">{children}</strong>,
                            li: ({ children }) => <li className="text-slate-800 text-xs leading-relaxed mb-1">{children}</li>
                          }}
                        >
                          {formatMarkdownText(sub.reviewFeedback)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Review actions & score inputs — only when pending */}
                  {sub.reviewStatus === "PENDING" && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      {/* Score & Presets Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                            🏆 Award Score (0 - 100):
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min="0" max="100"
                              value={projScore}
                              onChange={e => setProjScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                              className="w-24 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-center bg-white focus:ring-2 focus:ring-purple-500/20"
                            />
                            <span className="text-xs text-slate-500 font-bold">/ 100</span>
                          </div>
                        </div>

                        {/* Presets */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                          {[60, 75, 85, 90, 100].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setProjScore(s)}
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                                projScore === s
                                  ? "bg-purple-600 text-white border-purple-700"
                                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Feedback Textarea & AI insertion buttons */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                            💬 Reviewer Feedback:
                          </label>
                          <div className="flex items-center gap-2">
                            {sub.aiEvaluation?.suggestedFeedback && (
                              <button
                                type="button"
                                onClick={() => setFeedback(sub.aiEvaluation.suggestedFeedback)}
                                className="text-[10px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-200 px-2 py-0.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles size={11} />
                                <span>Insert AI Remarks</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setFeedback("")}
                              className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg transition cursor-pointer"
                            >
                              Clear Field
                            </button>
                          </div>
                        </div>

                        <textarea
                          value={feedback}
                          onChange={e => setFeedback(e.target.value)}
                          placeholder="Enter custom manual feedback or click 'Insert AI Remarks'..."
                          rows={3}
                          className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none bg-white leading-relaxed font-sans"
                        />
                      </div>

                      <div className="flex gap-3 justify-end flex-wrap pt-1">
                        <button
                          onClick={() => handleReview("REJECTED")}
                          disabled={!!reviewing}
                          className="flex items-center gap-2 px-5 py-2.5 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 font-bold text-xs transition disabled:opacity-60 cursor-pointer"
                        >
                          <XCircle size={16} />
                          {reviewing === "REJECTED" ? "Rejecting…" : "Request Revision (Reject)"}
                        </button>
                        <button
                          onClick={() => handleReview("APPROVED")}
                          disabled={!!reviewing}
                          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-sm disabled:opacity-60 cursor-pointer"
                        >
                          <CheckCircle size={16} />
                          {reviewing === "APPROVED" ? "Approving…" : "Approve & Unlock"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Already reviewed */}
                  {sub.reviewStatus !== "PENDING" && (
                    <div className={`text-xs font-bold px-3 py-2 rounded-xl text-center ${reviewBadge[sub.reviewStatus]}`}>
                      {sub.reviewStatus === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                    </div>
                  )}
                </div>
              )}

              {/* Discussion Thread */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <CommentThread
                  taskId={task._id}
                  submissionId={sub._id}
                  compact
                />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function FacultySubmissions() {
  const [tab,        setTab]        = useState("task"); // "task" | "project"
  const [division,   setDivision]   = useState("All");
  const [taskFilter, setTaskFilter] = useState("All");
  const [search,     setSearch]     = useState("");

  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_URL}/api/submissions/all?division=${division}&type=${tab}`;
      const res  = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions);
      } else {
        setError(data.message || "Failed to fetch submissions");
      }
    } catch (err) {
      console.error("Fetch submissions error:", err);
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [division, tab]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  /* Derived task list for filter dropdown */
  const uniqueTasks = Array.from(
    new Map(
      submissions
        .filter(s => s.taskId?._id && s.taskId?.title)
        .map(s => [s.taskId._id, s.taskId.title])
    ).entries()
  ).map(([id, title]) => ({ id, title }));

  /* Apply search + task filters client-side */
  const visible = submissions.filter(s => {
    if (taskFilter !== "All" && s.taskId?._id !== taskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.userId?.name?.toLowerCase().includes(q)       ||
        s.userId?.email?.toLowerCase().includes(q)      ||
        s.userId?.rollNumber?.toLowerCase().includes(q) ||
        s.taskId?.title?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  /* Update local submission state after grading */
  const handleScored = (subId, newScore) => {
    setSubmissions(prev =>
      prev.map(s => s._id === subId ? { ...s, performanceScore: newScore } : s)
    );
  };

  const handleReviewed = (subId, status, fb) => {
    setSubmissions(prev =>
      prev.map(s => s._id === subId ? { ...s, reviewStatus: status, reviewFeedback: fb } : s)
    );
  };

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExportCsv = () => {
    if (visible.length === 0) {
      alert("No submissions available to export for the selected filter.");
      return;
    }
    const headers = [
      "Student Name",
      "Roll Number",
      "Email",
      "Division",
      "Task Title",
      "Type",
      "Status",
      "Score",
      "AI Suggested Score",
      "Submitted At",
    ];
    const rows = visible.map((s) => [
      s.userId?.name || "N/A",
      s.userId?.rollNumber || "N/A",
      s.userId?.email || "N/A",
      s.userId?.division || "N/A",
      s.taskId?.title || "N/A",
      tab === "project" ? "Project Milestone" : "Regular Task",
      tab === "project" ? s.reviewStatus || "PENDING" : s.status || "submitted",
      s.performanceScore != null ? `${s.performanceScore}/10` : "Not Scored",
      s.aiEvaluation?.suggestedScore != null ? `${s.aiEvaluation.suggestedScore}/10` : "N/A",
      s.createdAt ? new Date(s.createdAt).toLocaleString() : "N/A",
    ]);
    const filename = `submissions_${tab}_${division}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-16">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Submissions Hub</h1>
          <p className="text-slate-400 text-sm mt-0.5">Review and grade all student submissions in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={visible.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            title="Export filtered submissions to CSV"
          >
            <Download size={14} /> Export CSV
          </button>
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            loading ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"
          }`}>
            {loading ? "Loading…" : `${visible.length} submission${visible.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { key: "task",    label: "Task Submissions"    },
          { key: "project", label: "Project Submissions" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setTaskFilter("All"); setSearch(""); }}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Division select */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={division}
            onChange={e => setDivision(e.target.value)}
            className="border rounded-full px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {DIVISIONS.map(d => (
              <option key={d} value={d}>{d === "All" ? "All Divisions" : `Division ${d}`}</option>
            ))}
          </select>
        </div>

        {/* Task filter (task tab only) */}
        {tab === "task" && (
          <select
            value={taskFilter}
            onChange={e => setTaskFilter(e.target.value)}
            className="border rounded-full px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="All">All Tasks</option>
            {uniqueTasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or task…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-full pl-9 pr-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Submission list ── */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-36 bg-slate-200 rounded-full" />
                  <div className="h-2.5 w-52 bg-slate-100 rounded-full" />
                </div>
                <div className="h-8 w-16 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 && !error ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-20 flex flex-col items-center gap-4 text-slate-400">
          <Inbox size={40} className="opacity-40" />
          <p className="font-medium text-lg">No submissions found</p>
          <p className="text-sm">Try changing the division, task filter, or search term.</p>
        </div>
      ) : !error ? (
        <div className="space-y-3">
          {visible.map(sub => (
            <SubmissionCard
              key={sub._id}
              sub={sub}
              onScored={handleScored}
              onReviewed={handleReviewed}
              onOpenModal={(submission) => {
                setSelectedSubmission(submission);
                setIsModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Faculty Project Review Modal */}
      {selectedSubmission && (
        <FacultyProjectReviewModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSubmission(null);
          }}
          submission={selectedSubmission}
          onReviewComplete={(updatedSub) => {
            if (updatedSub) {
              handleReviewed(updatedSub._id, updatedSub.reviewStatus, updatedSub.reviewFeedback);
              handleScored(updatedSub._id, updatedSub.performanceScore);
            }
          }}
        />
      )}

    </div>
  );
}
