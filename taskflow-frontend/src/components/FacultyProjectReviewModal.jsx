import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { X, Sparkles, CheckCircle2, XCircle, Loader2, Bot, MessageSquare, Code, Copy, Check, Maximize2, Minimize2, ExternalLink, Award } from "lucide-react";

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

export default function FacultyProjectReviewModal({ isOpen, onClose, submission, onReviewComplete }) {
  const [feedback, setFeedback] = useState(submission?.reviewFeedback || "");
  const [score, setScore] = useState(submission?.performanceScore || 85);
  const [reviewing, setReviewing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (submission) {
      if (submission.aiEvaluation && submission.aiEvaluation.suggestedFeedback) {
        const formattedFeedback = formatMarkdownText(submission.aiEvaluation.suggestedFeedback);

        setAiAnalysis({
          completenessScore: (submission.aiEvaluation.suggestedScore || 8) * 10,
          summary: formattedFeedback,
          suggestedStatus: submission.aiEvaluation.suggestedStatus,
          suggestedFeedback: formattedFeedback,
        });
        setFeedback(submission.reviewFeedback || formattedFeedback || "");
        setScore((submission.aiEvaluation.suggestedScore || 8) * 10);
      } else {
        setFeedback(submission.reviewFeedback || "");
        setScore(submission.performanceScore || 85);
      }
      setIsExpanded(false);
    }
  }, [submission]);

  if (!isOpen || !submission) return null;

  const handleRunAiPrescreen = async () => {
    setAiLoading(true);
    setAiAnalysis(null);

    try {
      const res = await fetch(`${API_URL}/api/submissions/${submission._id}/ai-prescreen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await res.json();
      if (data.success && data.aiAnalysis) {
        const rawFeedback = data.aiAnalysis.suggestedFeedback || data.aiAnalysis.summary || "";
        const formattedFeedback = formatMarkdownText(rawFeedback);

        setAiAnalysis({
          ...data.aiAnalysis,
          summary: formattedFeedback
        });
        if (formattedFeedback && !feedback) {
          setFeedback(formattedFeedback);
        }
        if (data.aiAnalysis.completenessScore !== undefined) {
          setScore(data.aiAnalysis.completenessScore);
        }
      } else {
        alert("Failed to run AI pre-screen.");
      }
    } catch (err) {
      console.error("AI prescreen error:", err);
      alert("Error generating AI prescreen analysis.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleReviewAction = async (status) => {
    setReviewing(true);

    try {
      const res = await fetch(`${API_URL}/api/submissions/${submission._id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          status,
          feedback,
          performanceScore: Number(score) || 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(status === "APPROVED" ? "✅ Milestone Approved & Next Phase Unlocked!" : "🔄 Revision Requested!");
        if (onReviewComplete) onReviewComplete(data.submission);
        onClose();
      } else {
        alert(data.message || "Failed to save review.");
      }
    } catch (err) {
      console.error("Review save error:", err);
      alert("Failed to submit review.");
    } finally {
      setReviewing(false);
    }
  };

  const studentName = submission.userId?.name || "Student";
  const rollNumber = submission.userId?.rollNumber || "N/A";
  const projectTitle = submission.taskId?.title || "Capstone Project";
  const rawMilestone = submission.taskId?.phases?.[submission.milestoneId ?? 0]?.milestone || "Milestone";
  const cleanMilestone = rawMilestone.replace(/^Phase\s*\d+\s*:\s*/i, "");
  const codeLines = (submission.code || "").split("\n");

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className={`bg-white rounded-3xl w-full border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto transition-all ${isExpanded ? "max-w-7xl" : "max-w-5xl"}`}>
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 bg-purple-950/90 px-3 py-1 rounded-full border border-purple-800">
                Capstone Milestone Review
              </span>
              <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800/80">
                Phase {(submission.milestoneId ?? 0) + 1}: {cleanMilestone}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-white mt-1.5 truncate tracking-tight">
              {studentName} <span className="text-slate-400 font-mono text-sm">({rollNumber})</span>
            </h2>
            <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">{projectTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800/80 text-slate-400 hover:text-white rounded-xl transition cursor-pointer shrink-0"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* Submission Content Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Code size={15} className="text-purple-600" />
                Submitted Code & Artifact (Phase {(submission.milestoneId ?? 0) + 1})
              </label>
              <button
                onClick={handleRunAiPrescreen}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin text-purple-700" /> : <Bot size={14} className="text-purple-700" />}
                <span>{aiLoading ? "Analyzing Code..." : "🤖 Run AI Co-Pilot Evaluation"}</span>
              </button>
            </div>

            {/* IDE-Style Code Box */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden font-mono text-xs shadow-inner">
              {/* Toolbar */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>{submission.code ? `Submission Content (${codeLines.length} lines)` : "Artifact View"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {submission.code && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(submission.code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    <span>{isExpanded ? "Collapse" : "Expand Code View"}</span>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className={`p-4 overflow-auto font-mono text-xs leading-relaxed text-slate-200 ${isExpanded ? "max-h-[520px]" : "min-h-[200px] max-h-[340px]"}`}>
                {submission.code ? (
                  <div className="flex">
                    <div className="select-none text-slate-600 pr-4 text-right border-r border-slate-800 font-mono shrink-0 py-0.5">
                      {codeLines.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <pre className="pl-4 whitespace-pre-wrap overflow-x-auto flex-1 font-mono text-slate-100 py-0.5">
                      {submission.code}
                    </pre>
                  </div>
                ) : submission.fileUrl ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-slate-400 text-xs">Student submitted a file or live deployment URL link:</p>
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition"
                    >
                      <ExternalLink size={15} /> Open Submitted Link / Document
                    </a>
                  </div>
                ) : (
                  <div className="text-slate-500 italic py-6 text-center">No code content submitted.</div>
                )}
              </div>
            </div>

            {submission.fileUrl && submission.code && (
              <div className="text-right">
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-bold underline"
                >
                  <ExternalLink size={13} /> View Attached Artifact / Deployment Link
                </a>
              </div>
            )}
          </div>

          {/* AI Pre-Screen Analysis Result Card (Formatted with ReactMarkdown) */}
          {aiAnalysis && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-slate-50 border border-purple-200/90 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-200/80 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-purple-950 font-extrabold text-sm">
                  <Sparkles size={18} className="text-amber-500 animate-pulse shrink-0" />
                  <span>AI Co-Pilot Evaluation & Assessment</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-purple-600 text-white font-extrabold text-xs shadow-xs">
                    Suggested Score: {aiAnalysis.completenessScore}/100
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(aiAnalysis.summary || aiAnalysis.suggestedFeedback || "");
                      if (aiAnalysis.completenessScore) setScore(aiAnalysis.completenessScore);
                    }}
                    className="px-3 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Use AI Score & Remarks</span>
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-slate-800 leading-relaxed font-sans prose prose-slate max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-sm font-extrabold text-purple-950 mt-3 mb-1 border-b border-purple-200 pb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xs font-bold text-purple-950 mt-2 mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs font-bold text-purple-900 mt-2 mb-1">{children}</h3>,
                    p: ({ children }) => <p className="text-xs text-slate-800 leading-relaxed mb-2.5 font-normal">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 mb-2.5 text-slate-800 text-xs pl-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 mb-2.5 text-slate-800 text-xs pl-2">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-800 text-xs leading-relaxed mb-1">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-extrabold text-purple-950 bg-purple-100/80 px-1.5 py-0.5 rounded text-[11px] border border-purple-200/80 inline-block my-0.5">
                        {children}
                      </strong>
                    ),
                    code: ({ children }) => (
                      <code className="font-mono text-purple-900 bg-purple-100/90 px-1.5 py-0.5 rounded text-[11px] border border-purple-200">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {aiAnalysis.summary || aiAnalysis.suggestedFeedback || ""}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Score & Feedback Inputs Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Award size={15} className="text-amber-500" />
                  Award Performance Score
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    className="w-28 text-center text-lg font-extrabold bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900"
                  />
                  <span className="text-xs font-extrabold text-slate-500">/ 100 Marks</span>
                </div>
                {/* Score Quick Select Chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[60, 75, 85, 90, 100].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScore(s)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition ${
                        score === s
                          ? "bg-purple-600 text-white border-purple-700"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {aiAnalysis?.completenessScore && score !== aiAnalysis.completenessScore && (
                    <button
                      type="button"
                      onClick={() => setScore(aiAnalysis.completenessScore)}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
                    >
                      AI: {aiAnalysis.completenessScore}
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MessageSquare size={15} className="text-purple-600" />
                    Faculty Reviewer Feedback
                  </label>
                  <div className="flex items-center gap-2">
                    {aiAnalysis?.summary && (
                      <button
                        type="button"
                        onClick={() => setFeedback(aiAnalysis.summary || aiAnalysis.suggestedFeedback || "")}
                        className="text-[11px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-200 px-2.5 py-0.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles size={12} />
                        <span>Insert AI Remarks</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFeedback("")}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-0.5 rounded-lg transition cursor-pointer"
                    >
                      Clear for Manual Entry
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  placeholder="Enter custom manual feedback or click 'Insert AI Remarks' to send AI evaluation notes..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 leading-relaxed font-sans shadow-2xs"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 grid grid-cols-2 gap-4">
          <button
            onClick={() => handleReviewAction("REJECTED")}
            disabled={reviewing}
            className="py-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <XCircle size={17} />
            <span>🔄 Request Revision (Reject Phase)</span>
          </button>

          <button
            onClick={() => handleReviewAction("APPROVED")}
            disabled={reviewing}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 size={17} />
            <span>✅ Approve & Unlock Next Phase</span>
          </button>
        </div>

      </div>
    </div>
  );
}

