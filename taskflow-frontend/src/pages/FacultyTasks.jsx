import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, User, Clock, FileText, Trash2,
  CheckCircle, BarChart2,
} from "lucide-react";
import ConfirmationModal from "../components/common/ConfirmationModal";

/* ════════════════════════════════════════════════════════
   FacultyTasks — main page component
   ════════════════════════════════════════════════════════ */
export default function FacultyTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Question-based grading
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [savingScore, setSavingScore] = useState(null);

  // Plain-task direct marks
  const [plainScoreDrafts, setPlainScoreDrafts] = useState({});
  const [savingPlainScore, setSavingPlainScore] = useState(null);
  const [savedPlain, setSavedPlain] = useState({});

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = async (task) => {
    setSelectedTaskForReview(task);
    setLoadingSubmissions(true);
    setScoreDrafts({});
    try {
      const res = await fetch(`${API_URL}/api/submissions/task/${task._id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      const subs = data.submissions || [];
      setSubmissions(subs);
      const drafts = {};
      subs.forEach((sub) => {
        if (sub.questionScores?.length) {
          drafts[sub._id] = sub.questionScores.map((qs) => ({ ...qs }));
        }
      });
      setScoreDrafts(drafts);
    } catch (error) {
      console.error("Failed to fetch submissions", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  /* ── DELETE ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/tasks/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setTasks(tasks.filter((t) => t._id !== deleteTarget._id));
        setDeleteTarget(null);
      } else {
        alert("Failed to delete task: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to delete task", err);
    } finally {
      setDeleting(false);
    }
  };

  /* ── GRADING helpers ── */
  const getScoreDraft = (subId, questions) => {
    if (scoreDrafts[subId]) return scoreDrafts[subId];
    return questions.map((_, i) => ({ questionIndex: i, score: 0 }));
  };

  const updateScoreDraft = (subId, questionIndex, value, questions) => {
    const current = getScoreDraft(subId, questions);
    const updated = current.map((qs) =>
      qs.questionIndex === questionIndex ? { ...qs, score: Number(value) || 0 } : qs
    );
    setScoreDrafts((prev) => ({ ...prev, [subId]: updated }));
  };

  const calcDraftScore = (subId, questions) => {
    const draft = getScoreDraft(subId, questions);
    const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
    const earned = draft.reduce((s, qs) => s + (qs.score || 0), 0);
    return totalMarks > 0 ? Math.round((earned / totalMarks) * 10) : 0;
  };

  const handleSaveScore = async (sub) => {
    const questions = selectedTaskForReview?.questions || [];
    const draft = getScoreDraft(sub._id, questions);
    setSavingScore(sub._id);
    try {
      const res = await fetch(`${API_URL}/api/submissions/${sub._id}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ questionScores: draft }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s._id === sub._id
              ? { ...s, performanceScore: data.submission.performanceScore, questionScores: data.submission.questionScores }
              : s
          )
        );
      } else {
        alert("Failed to save scores");
      }
    } catch (err) {
      console.error("Score save error", err);
    } finally {
      setSavingScore(null);
    }
  };

  const handleSavePlainMark = async (sub) => {
    const score = plainScoreDrafts[sub._id] ?? sub.performanceScore ?? 0;
    setSavingPlainScore(sub._id);
    try {
      const res = await fetch(`${API_URL}/api/submissions/${sub._id}/mark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ score }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) =>
          prev.map((s) => s._id === sub._id ? { ...s, performanceScore: data.submission.performanceScore } : s)
        );
        setSavedPlain((prev) => ({ ...prev, [sub._id]: true }));
        setTimeout(() => setSavedPlain((prev) => ({ ...prev, [sub._id]: false })), 2000);
      }
    } catch (err) {
      console.error("Plain mark save error", err);
    } finally {
      setSavingPlainScore(null);
    }
  };

  /* ════ RENDER ════ */
  if (loading) return <p className="p-6">Loading tasks...</p>;

  return (
    <div className="p-8 space-y-8 relative">
      {/* Header */}
      <div className="flex justify-between items-end">
        <p className="text-slate-500 mt-1">
          Total tasks created: <span className="font-medium">{tasks.length}</span>
        </p>
        <button
          onClick={() => navigate("/faculty/tasks/create")}
          className="bg-black text-white px-6 py-2 rounded-full font-medium hover:bg-slate-800 transition"
        >
          + Create New Task
        </button>
      </div>

      {/* Task List */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Task History</h2>
        {tasks.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 text-center text-slate-500 font-medium tracking-wide">
            No tasks created yet.
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group relative overflow-hidden"
              >
                <div className="flex gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex flex-shrink-0 items-center justify-center ${task.type === "project" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                    <FileText size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="font-bold text-xl text-slate-900">{task.title}</p>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                        task.type === "project" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {task.type}
                      </span>
                      {Array.isArray(task.questions) && task.questions.length > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-700">
                          {task.questions.length} Qs
                        </span>
                      )}
                      {/* Marks badge */}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                        task.hasMarks
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        <BarChart2 size={10} />
                        {task.hasMarks ? "Marked" : "Practice"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md">Topic: {task.topic}</span>
                      {task.difficulty && task.difficulty !== "none" && (
                        <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md">Diff: {task.difficulty}</span>
                      )}
                      {task.bloomLevel && task.bloomLevel !== "none" && (
                        <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">Bloom: <span className="font-bold">{task.bloomLevel}</span></span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-auto w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleReviewClick(task)}
                    className="flex-1 md:flex-none text-sm px-6 py-2.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-black hover:text-white hover:border-black transition-all font-bold"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => setDeleteTarget(task)}
                    title="Delete task"
                    className="p-3 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-400 transition-all font-bold"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════ SUBMISSIONS MODAL ════ */}
      {selectedTaskForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center clay-modal-overlay p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h2 className="text-2xl font-bold">{selectedTaskForReview.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-slate-500 text-sm">Student Submissions</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    selectedTaskForReview.hasMarks
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {selectedTaskForReview.hasMarks ? "Marked Task" : "Practice Task"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTaskForReview(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
              {loadingSubmissions ? (
                <div className="text-center py-10 text-slate-500">Loading submissions...</div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
                  <p className="text-slate-500 text-lg">No submissions yet.</p>
                </div>
              ) : (
                submissions.map((sub) => {
                  const questions = selectedTaskForReview?.questions || [];
                  const isQBased = questions.length > 0;
                  const taskHasMarks = selectedTaskForReview?.hasMarks;
                  const draftScore = (isQBased && taskHasMarks) ? calcDraftScore(sub._id, questions) : null;

                  return (
                    <div key={sub._id} className="bg-white p-6 rounded-2xl shadow-sm">
                      {/* Student info */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{sub.userId?.name || "Student"}</p>
                            <div className="flex gap-2 text-xs">
                              <span className="text-slate-500">{sub.userId?.email || "No Email"}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{sub.userId?.rollNumber}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full border">
                            <Clock size={12} />
                            {new Date(sub.createdAt).toLocaleString()}
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            Score: {sub.performanceScore}/10
                          </span>
                        </div>
                      </div>

                      {/* Question-based with marks */}
                      {isQBased && taskHasMarks ? (
                        <div className="space-y-4">
                          {questions.map((q, i) => {
                            const answerObj = (sub.questionAnswers || []).find((a) => a.questionIndex === i);
                            const draft = getScoreDraft(sub._id, questions);
                            const scoreDraft = draft.find((d) => d.questionIndex === i) || { score: 0 };

                            return (
                              <div key={i} className="rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                                  <div
                                    className="text-xs font-bold text-slate-600 flex-1 prose prose-xs max-w-none"
                                    dangerouslySetInnerHTML={{ __html: `Q${i + 1} — ${q.text}` }}
                                  />
                                  <span className="shrink-0 text-xs text-slate-500 font-medium ml-2">
                                    Max: {q.marks} mark{q.marks !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                <div className="p-4 space-y-3">
                                  {answerObj?.fileUrl && (
                                    <div className="mb-3">
                                      <p className="text-xs font-semibold text-slate-500 mb-1">Attached Image:</p>
                                      <a href={answerObj.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block border rounded-lg overflow-hidden hover:opacity-90 transition shadow-sm">
                                        <img src={answerObj.fileUrl} alt={`Q${i + 1} attachment`} className="h-32 w-auto object-cover max-w-[300px]" />
                                      </a>
                                    </div>
                                  )}
                                  <div className="bg-slate-50 rounded-lg p-4 text-[14px] text-slate-700 max-h-48 overflow-y-auto border prose prose-sm max-w-none prose-slate">
                                    {answerObj?.answer ? (
                                      <div dangerouslySetInnerHTML={{ __html: answerObj.answer }} />
                                    ) : (
                                      <span className="italic text-slate-400">No text answer provided.</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <label className="text-xs font-semibold text-slate-600">Score:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={q.marks}
                                      value={scoreDraft.score}
                                      onChange={(e) => updateScoreDraft(sub._id, i, e.target.value, questions)}
                                      className="w-20 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <span className="text-xs text-slate-500">/ {q.marks}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Score tally */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl px-5 py-3">
                            <div>
                              <p className="text-xs text-slate-300">Calculated Score</p>
                              <p className="text-2xl font-bold">
                                {draftScore}
                                <span className="text-sm font-normal text-slate-300"> / 10</span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleSaveScore(sub)}
                              disabled={savingScore === sub._id}
                              className="flex items-center gap-2 bg-white text-slate-800 px-5 py-2 rounded-full font-semibold text-sm hover:bg-slate-100 transition disabled:opacity-60"
                            >
                              <CheckCircle size={16} />
                              {savingScore === sub._id ? "Saving…" : "Save Score"}
                            </button>
                          </div>
                        </div>

                      ) : isQBased && !taskHasMarks ? (
                        /* Question-based but no marks — read only */
                        <div className="space-y-3">
                          {questions.map((q, i) => {
                            const answerObj = (sub.questionAnswers || []).find((a) => a.questionIndex === i);
                            return (
                              <div key={i} className="rounded-xl overflow-hidden border border-dashed border-slate-200">
                                <div
                                  className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 prose prose-xs max-w-none"
                                  dangerouslySetInnerHTML={{ __html: `Q${i + 1} — ${q.text}` }}
                                />
                                <div className="p-4 text-[14px] text-slate-700 bg-white max-h-48 overflow-y-auto prose prose-sm max-w-none prose-slate">
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
                            <BarChart2 size={12} /> Practice task — no marks assigned
                          </div>
                        </div>

                      ) : (
                        /* Plain text submission */
                        <>
                          <div className="bg-slate-50 rounded-xl p-6 text-[15px] text-slate-700 max-h-64 overflow-y-auto border prose prose-sm max-w-none prose-slate">
                            {sub.code ? (
                              <div dangerouslySetInnerHTML={{ __html: sub.code }} />
                            ) : (
                              <span className="italic text-slate-400">No text content submitted.</span>
                            )}
                          </div>
                          {sub.fileUrl && (
                            <div className="mt-4 border-t pt-4">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Attachment</p>
                              {sub.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block border rounded-lg overflow-hidden hover:opacity-90 transition shadow-sm mt-1">
                                  <img src={sub.fileUrl} alt="Submitted attachment" className="max-h-64 w-auto object-contain" />
                                </a>
                              ) : (
                                <a href={sub.fileUrl} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 clay-tint-sky text-blue-700 rounded-xl hover:bg-blue-100 transition border border-purple-100 font-medium text-sm">
                                  <FileText size={18} /> View Submitted File
                                </a>
                              )}
                            </div>
                          )}

                          {/* Plain score input — only if task has marks */}
                          {taskHasMarks ? (
                            <div className="mt-4 flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
                              <div className="flex items-center gap-3 flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Score (0–10):</label>
                                <input
                                  type="number" min="0" max="10" step="0.5"
                                  value={plainScoreDrafts[sub._id] ?? sub.performanceScore ?? 0}
                                  onChange={(e) => setPlainScoreDrafts(prev => ({
                                    ...prev,
                                    [sub._id]: Math.min(10, Math.max(0, Number(e.target.value) || 0))
                                  }))}
                                  className="w-20 border rounded-xl px-3 py-1.5 text-base font-bold text-center focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-white"
                                />
                                <span className="text-slate-400 text-sm font-medium">/ 10</span>
                              </div>
                              <button
                                onClick={() => handleSavePlainMark(sub)}
                                disabled={savingPlainScore === sub._id}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition shadow-sm ${
                                  savedPlain[sub._id]
                                    ? "bg-emerald-500 text-white"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                                }`}
                              >
                                <CheckCircle size={15} />
                                {savingPlainScore === sub._id ? "Saving…" : savedPlain[sub._id] ? "Saved!" : "Save Score"}
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-dashed">
                              <BarChart2 size={12} /> Practice task — no marks assigned
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        type="danger"
        title="Delete Task?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will permanently remove all student submissions for this task.`}
        confirmText="Delete Task"
        loading={deleting}
      />
    </div>
  );
}