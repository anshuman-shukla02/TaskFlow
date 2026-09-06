import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle, XCircle, ExternalLink, Code, Sparkles, Copy, Check, Maximize2, Minimize2, Award, MessageSquare
} from "lucide-react";
import FacultyProjectReviewModal from "../components/FacultyProjectReviewModal";

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

/* ── Individual Review Card Component ────────────────────────────── */
function ReviewCard({ review, onReviewComplete, onOpenReviewModal }) {
  const aiEval = review.aiEvaluation;
  const initialScore = review.performanceScore || (aiEval?.suggestedScore ? aiEval.suggestedScore * 10 : 85);
  const initialFeedback = review.reviewFeedback || aiEval?.suggestedFeedback || "";

  const [score, setScore] = useState(initialScore);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [isExpandedCode, setIsExpandedCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(null); // "APPROVED" | "REJECTED" | null

  const codeLines = (review.code || "").split("\n");
  const rawMilestone = review.taskId?.phases?.[review.milestoneId ?? 0]?.milestone || "Milestone";
  const cleanMilestone = rawMilestone.replace(/^Phase\s*\d+\s*:\s*/i, "");

  const handleReviewAction = async (status) => {
    setSubmitting(status);
    try {
      const res = await fetch(`${API_URL}/api/submissions/${review._id}/review`, {
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
        onReviewComplete(data.submission || { _id: review._id });
      } else {
        alert(data.message || "Failed to update review.");
      }
    } catch (err) {
      console.error("Review action error:", err);
      alert("Failed to submit review action.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between space-y-5">
      <div>
        {/* Header Row */}
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {review.userId?.name || "Unknown Student"}
            </h3>
            <p className="text-xs text-slate-500 mb-2 font-medium">
              {review.userId?.email} • {review.topic || "General"}
            </p>
            {review.taskId?.type === "project" && (
              <div className="bg-purple-50/80 border border-purple-100 px-3.5 py-2 inline-flex flex-col rounded-2xl mt-0.5">
                <span className="text-xs text-purple-950 font-bold">
                  Project: {review.taskId?.title || "Project"}
                </span>
                <span className="text-xs text-purple-700 font-semibold mt-0.5">
                  Phase {(review.milestoneId ?? 0) + 1}: {cleanMilestone}
                </span>
              </div>
            )}
          </div>
          <span className="px-3.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-extrabold rounded-full uppercase border border-amber-200 shrink-0">
            Pending Review
          </span>
        </div>

        {/* ✨ AI Auto-Evaluation Banner (if available) */}
        {aiEval && (
          <div className="mb-4 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-purple-100/70 p-4 rounded-2xl border border-purple-200/90 text-purple-950 flex flex-col gap-2 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-purple-200/60 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-purple-950">
                <Sparkles size={16} className="text-amber-500 shrink-0 animate-pulse" />
                <span>✨ AI Auto-Assessment Recommendation:</span>
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  aiEval.suggestedStatus === "APPROVED" 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}>
                  {aiEval.suggestedStatus || "APPROVED"} ({aiEval.suggestedScore ? aiEval.suggestedScore * 10 : 80}/100)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (aiEval.suggestedScore != null) setScore(aiEval.suggestedScore * 10);
                  if (aiEval.suggestedFeedback) setFeedback(aiEval.suggestedFeedback);
                }}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <Sparkles size={12} />
                <span>Use AI Score & Remarks</span>
              </button>
            </div>
            {aiEval.suggestedFeedback && (
              <div className="text-xs text-slate-800 leading-relaxed font-sans prose prose-slate max-w-none max-h-36 overflow-y-auto pr-1">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="text-xs text-slate-800 leading-relaxed mb-1.5 font-normal">{children}</p>,
                    strong: ({ children }) => <strong className="font-extrabold text-purple-950 bg-purple-100/80 px-1 py-0.5 rounded text-[11px] border border-purple-200/80">{children}</strong>,
                    li: ({ children }) => <li className="text-slate-800 text-xs leading-relaxed mb-1">{children}</li>
                  }}
                >
                  {formatMarkdownText(aiEval.suggestedFeedback)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* IDE-Style Code Submission Box */}
        <div className="bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs mb-4 border border-slate-800 overflow-hidden shadow-inner">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <Code size={13} className="text-purple-400" />
              <span>{review.code ? `Submission Code (${codeLines.length} lines)` : "Artifact View"}</span>
            </div>
            <div className="flex items-center gap-2">
              {review.code && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(review.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? "Copied!" : "Copy Code"}</span>
                </button>
              )}
              {review.code && codeLines.length > 5 && (
                <button
                  type="button"
                  onClick={() => setIsExpandedCode(!isExpandedCode)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isExpandedCode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  <span>{isExpandedCode ? "Collapse Code" : "Expand Code"}</span>
                </button>
              )}
            </div>
          </div>

          <div className={`p-4 overflow-auto font-mono text-xs leading-relaxed text-slate-200 transition-all ${
            isExpandedCode ? "max-h-[600px]" : "min-h-[140px] max-h-[280px]"
          }`}>
            {review.code ? (
              <div className="flex">
                <div className="select-none text-slate-600 pr-3.5 text-right border-r border-slate-800 font-mono shrink-0 py-0.5">
                  {codeLines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className="pl-3.5 whitespace-pre-wrap overflow-x-auto flex-1 font-mono text-slate-200 py-0.5">
                  {review.code}
                </pre>
              </div>
            ) : review.fileUrl ? (
              <div className="py-6 text-center">
                <a
                  href={review.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 flex items-center justify-center gap-2 underline font-bold"
                >
                  <ExternalLink size={14} /> Open Submitted Artifact Link
                </a>
              </div>
            ) : (
              <span className="text-slate-500 italic">No content provided</span>
            )}
          </div>
        </div>

        {/* Score & Feedback Controls Box */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          {/* Score & Presets Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Award size={14} className="text-amber-500" />
                <span>Award Performance Score (0 - 100):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-24 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-center bg-white focus:ring-2 focus:ring-purple-500/20"
                />
                <span className="text-xs text-slate-500 font-bold">/ 100 Marks</span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-slate-400">Presets:</span>
              {[60, 75, 85, 90, 100].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScore(s)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                    score === s
                      ? "bg-purple-600 text-white border-purple-700"
                      : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
              {aiEval?.suggestedScore && (
                <button
                  type="button"
                  onClick={() => setScore(aiEval.suggestedScore * 10)}
                  className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition cursor-pointer"
                >
                  AI: {aiEval.suggestedScore * 10}
                </button>
              )}
            </div>
          </div>

          {/* Feedback Textarea & AI insertion buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <MessageSquare size={13} className="text-purple-600" />
                <span>Reviewer Feedback:</span>
              </label>
              <div className="flex items-center gap-2">
                {aiEval?.suggestedFeedback && (
                  <button
                    type="button"
                    onClick={() => setFeedback(aiEval.suggestedFeedback)}
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
                  Clear for Manual Entry
                </button>
              </div>
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter custom manual feedback or click 'Insert AI Remarks' to send AI evaluation notes..."
              rows={3}
              className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none bg-white leading-relaxed font-sans shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={() => onOpenReviewModal(review)}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles size={16} />
          <span>Review & Pre-Screen with AI Co-Pilot (Enlarged Modal)</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleReviewAction("REJECTED")}
            disabled={!!submitting}
            className="py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <XCircle size={15} />
            <span>{submitting === "REJECTED" ? "Rejecting..." : "Reject Phase"}</span>
          </button>
          <button
            type="button"
            onClick={() => handleReviewAction("APPROVED")}
            disabled={!!submitting}
            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle size={15} />
            <span>{submitting === "APPROVED" ? "Approving..." : "Approve & Unlock"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Faculty Reviews Page Component ─────────────────────────── */
export default function FacultyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/api/submissions/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReviews(res.data.submissions);
      }
    } catch (err) {
      console.error("Fetch pending reviews error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (submission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const handleReviewComplete = (updatedSub) => {
    if (updatedSub) {
      setReviews((prev) => prev.filter((r) => r._id !== updatedSub._id));
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading Pending Reviews...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Project Milestone Reviews</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Review student capstone milestones with AI Co-Pilot assistance, score adjustments, and custom or AI remarks.
          </p>
        </div>
        <span className="text-xs font-extrabold px-3.5 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200 shadow-2xs">
          {reviews.length} Pending
        </span>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 font-medium">
          No pending project reviews found. All caught up!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              onReviewComplete={handleReviewComplete}
              onOpenReviewModal={handleOpenReviewModal}
            />
          ))}
        </div>
      )}

      {/* Faculty Project Review Modal */}
      {selectedSubmission && (
        <FacultyProjectReviewModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSubmission(null);
          }}
          submission={selectedSubmission}
          onReviewComplete={handleReviewComplete}
        />
      )}
    </div>
  );
}
