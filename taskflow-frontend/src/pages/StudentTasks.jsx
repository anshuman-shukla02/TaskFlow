import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  Search, Upload, FileText, CheckCircle,
  X, ChevronRight, BarChart2, BookOpen,
  Clock, PenLine, Paperclip, ArrowLeft,
  ChevronLeft, Save, Lock, Eye,
  Loader2, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CommentThread from "../components/common/CommentThread";

/* ─── Quill toolbar config ────────────────────────────────────── */
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

/* ─── Difficulty badge styles ────────────────────────────────── */
const DIFF_BADGE = {
  easy:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  hard:   "bg-rose-50 text-rose-700 border border-rose-200",
};

/* ═══════════════════════════════════════════════════════════════
   ExamView — Full-screen exam-style split layout
   Left: Question & Description  |  Right: Answer (editor/upload)
═══════════════════════════════════════════════════════════════ */
function ExamView({ task, onClose, onSubmitDone }) {
  const isQBased = Array.isArray(task.questions) && task.questions.length > 0;
  const taskHasMarks = task.hasMarks ?? false;
  const totalMarks = isQBased && taskHasMarks
    ? task.questions.reduce((s, q) => s + (Number(q.marks) || 0), 0) : (task.singleMarks || 0);

  /* ── state ── */
  const [activeQ, setActiveQ] = useState(0);
  const [questionModes, setQuestionModes] = useState({});    // { [i]: "upload" | "write" }
  const [questionTexts, setQuestionTexts] = useState({});     // { [i]: html string }
  const [questionFiles, setQuestionFiles] = useState({});     // { [i]: File }
  const [savedQuestions, setSavedQuestions] = useState({});    // { [i]: true } — locked/saved per question

  /* ── plain task state ── */
  const [plainMode, setPlainMode] = useState(null);
  const [plainText, setPlainText] = useState("");
  const [plainFile, setPlainFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savingQ, setSavingQ] = useState(null); // index of question being saved
  const [errorMsg, setErrorMsg] = useState(null);

  /* ── helpers ── */
  const isQAnswered = (i) => {
    if (savedQuestions[i]) return true;
    const mode = questionModes[i];
    if (mode === "write") return !!questionTexts[i]?.trim();
    if (mode === "upload") return !!questionFiles[i];
    return false;
  };

  const qAnswered = isQBased
    ? task.questions.filter((_, i) => isQAnswered(i)).length
    : 0;

  const canSubmitAll = isQBased
    ? task.questions.every((_, i) => isQAnswered(i))
    : (plainMode === "write" ? !!plainText?.trim() : plainMode === "upload" ? !!plainFile : false);

  /* ── Save individual question (locks it) ── */
  const handleSaveQuestion = (idx) => {
    const mode = questionModes[idx];
    if (mode === "write" && !questionTexts[idx]?.trim()) {
      setErrorMsg("Please write your answer before saving.");
      return;
    }
    if (mode === "upload" && !questionFiles[idx]) {
      setErrorMsg("Please upload a file before saving.");
      return;
    }
    setSavedQuestions(prev => ({ ...prev, [idx]: true }));
    setErrorMsg(null);
    // Auto-advance to next unanswered question
    if (idx < task.questions.length - 1) {
      const nextUnanswered = task.questions.findIndex((_, i) => i > idx && !savedQuestions[i] && !isQAnswered(i));
      if (nextUnanswered >= 0) setActiveQ(nextUnanswered);
      else setActiveQ(idx + 1);
    }
  };

  /* ── Unlock question for editing ── */
  const handleUnlockQuestion = (idx) => {
    setSavedQuestions(prev => { const c = { ...prev }; delete c[idx]; return c; });
  };

  /* ── Final submit all ── */
  const handleSubmit = async () => {
    if (!canSubmitAll) {
      setErrorMsg("Please answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const token = getToken();
      let fileUrl = null;

      if (!isQBased && plainMode === "upload" && plainFile) {
        const fd = new FormData();
        fd.append("file", plainFile);
        const r = await axios.post(`${API_URL}/api/upload`, fd, {
          headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
        });
        if (r.data.success) fileUrl = r.data.fileUrl;
      }

      const payload = {
        taskId: task._id,
        code: plainMode === "write" ? plainText : "",
        content: plainMode === "write" ? plainText : "",
        fileUrl,
      };

      if (isQBased) {
        const finalAnswers = [];
        for (let idx = 0; idx < task.questions.length; idx++) {
          let qFileUrl = null;
          const mode = questionModes[idx];
          const imgFile = questionFiles[idx];

          if (mode === "upload" && imgFile) {
            const qfd = new FormData();
            qfd.append("file", imgFile);
            const qr = await axios.post(`${API_URL}/api/upload`, qfd, {
              headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
            });
            if (qr.data.success) qFileUrl = qr.data.fileUrl;
          }

          finalAnswers.push({
            questionIndex: idx,
            answer: mode === "write" ? (questionTexts[idx] || "") : "",
            fileUrl: qFileUrl,
          });
        }
        payload.questionAnswers = finalAnswers;
        payload.code = "";
        payload.content = "";
        payload.fileUrl = null;
      }

      await axios.post(`${API_URL}/api/submissions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmitted(true);
      setTimeout(() => { if (onSubmitDone) onSubmitDone(); }, 2000);
    } catch (err) {
      setErrorMsg("Submission failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── SUCCESS overlay ── */
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[60] bg-white flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Submitted Successfully!</h2>
          <p className="text-sm text-slate-500">Your assignment has been received and sent for review.</p>
        </motion.div>
      </motion.div>
    );
  }

  /* ── Active question data ── */
  const currentQ = isQBased ? task.questions[activeQ] : null;
  const currentMode = isQBased ? questionModes[activeQ] : plainMode;
  const isCurrentSaved = isQBased && savedQuestions[activeQ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-slate-50 flex flex-col"
    >
      {/* ── Top bar ── */}
      <div className="shrink-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shadow-sm">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft size={16} /> Exit
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{task.title}</p>
        </div>

        {/* Progress pills */}
        {isQBased && (
          <div className="hidden sm:flex items-center gap-1.5">
            {task.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveQ(i)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                  activeQ === i
                    ? "bg-slate-900 text-white shadow-md scale-110"
                    : savedQuestions[i]
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : isQAnswered(i)
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
              >
                {savedQuestions[i] ? "✓" : i + 1}
              </button>
            ))}
          </div>
        )}

        <div className="h-6 w-px bg-slate-200" />

        {/* Progress text */}
        {isQBased && (
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {Object.keys(savedQuestions).length}/{task.questions.length} saved
          </span>
        )}

        {/* Submit all button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmitAll}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span className="hidden sm:inline">Submitting…</span>
            </>
          ) : (
            <>
              <Upload size={15} />
              <span className="hidden sm:inline">Submit All</span>
            </>
          )}
        </button>
      </div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center gap-3 overflow-hidden"
          >
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700 font-medium flex-1">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Split content ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── LEFT PANEL: Question / Description ─── */}
        <div className="w-full lg:w-[45%] xl:w-[42%] bg-white border-r border-slate-200 flex flex-col overflow-hidden">

          {/* Question navigation (mobile) */}
          {isQBased && (
            <div className="sm:hidden shrink-0 px-4 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
              {task.questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveQ(i)}
                  className={`shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition ${
                    activeQ === i
                      ? "bg-slate-900 text-white"
                      : savedQuestions[i]
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {savedQuestions[i] ? "✓" : i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable left content */}
          <div className="flex-1 overflow-y-auto">

            {/* Task description (always shown) */}
            {task.description && task.description !== "<p><br></p>" && (
              <div className="px-6 py-5 border-b border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <BookOpen size={12} /> Task Description
                </p>
                <div
                  className="text-sm text-slate-700 prose prose-sm max-w-none leading-relaxed bg-slate-50 rounded-xl p-5 border border-slate-100"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />

                {/* Meta badges */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {task.difficulty && task.difficulty !== "none" && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${DIFF_BADGE[task.difficulty] || DIFF_BADGE.medium}`}>
                      {task.difficulty}
                    </span>
                  )}
                  {taskHasMarks && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center gap-1">
                      <BarChart2 size={9} /> {totalMarks} marks total
                    </span>
                  )}
                  {isQBased && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                      {task.questions.length} questions
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Current question display */}
            {isQBased && currentQ && (
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText size={12} /> Question {activeQ + 1} of {task.questions.length}
                  </p>
                  {taskHasMarks && currentQ.marks && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                      {currentQ.marks} mark{currentQ.marks !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
                  <div
                    className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentQ.text }}
                  />
                </div>

                {/* Question status badge */}
                {isCurrentSaved && (
                  <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                    <Lock size={13} className="text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">Answer saved & locked</span>
                    <button
                      onClick={() => handleUnlockQuestion(activeQ)}
                      className="ml-auto text-xs font-medium text-emerald-600 hover:text-emerald-800 underline underline-offset-2"
                    >
                      Edit answer
                    </button>
                  </div>
                )}

                {/* Prev / Next buttons */}
                <div className="flex items-center justify-between mt-4">
                  <button
                    disabled={activeQ === 0}
                    onClick={() => setActiveQ(activeQ - 1)}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 disabled:opacity-30 transition font-medium"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  {activeQ < task.questions.length - 1 ? (
                    <button
                      onClick={() => setActiveQ(activeQ + 1)}
                      className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 font-semibold transition"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Last question</span>
                  )}
                </div>
              </div>
            )}

            {/* Non-question-based: description already shown above, nothing else needed */}

            {/* Discussion Thread */}
            <div className="px-6 py-4">
              <CommentThread taskId={task._id} compact />
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Answer Area ─── */}
        <div className="hidden lg:flex flex-1 flex-col bg-slate-50 overflow-hidden">

          {/* Right panel header */}
          <div className="shrink-0 px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <PenLine size={12} />
              {isQBased ? `Answer — Question ${activeQ + 1}` : "Your Answer"}
            </p>
            {isQBased && !isCurrentSaved && currentMode && (
              <button
                onClick={() => handleSaveQuestion(activeQ)}
                disabled={savingQ === activeQ}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                <Save size={12} /> Save Answer
              </button>
            )}
            {isQBased && isCurrentSaved && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                <CheckCircle size={13} /> Saved
              </div>
            )}
          </div>

          {/* Right panel content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isCurrentSaved ? (
              /* Saved answer preview */
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Saved Answer Preview</p>
                  {questionModes[activeQ] === "write" && questionTexts[activeQ] ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: questionTexts[activeQ] }}
                    />
                  ) : questionModes[activeQ] === "upload" && questionFiles[activeQ] ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <FileText size={18} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{questionFiles[activeQ].name}</p>
                        <p className="text-xs text-slate-400">{(questionFiles[activeQ].size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No answer content</p>
                  )}
                </div>
              </div>
            ) : !currentMode ? (
              /* Mode selector */
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-sm font-semibold text-slate-600 mb-5">
                  {isQBased ? "How would you like to answer this question?" : "How would you like to submit?"}
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md w-full">
                  <button
                    onClick={() => {
                      if (isQBased) setQuestionModes(prev => ({ ...prev, [activeQ]: "upload" }));
                      else setPlainMode("upload");
                    }}
                    className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition">
                      <Paperclip size={24} className="text-slate-500 group-hover:text-indigo-600 transition" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800">Upload File</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, Image, Document</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      if (isQBased) setQuestionModes(prev => ({ ...prev, [activeQ]: "write" }));
                      else setPlainMode("write");
                    }}
                    className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center transition">
                      <PenLine size={24} className="text-slate-500 group-hover:text-white transition" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800">Write Manually</p>
                      <p className="text-xs text-slate-400 mt-1">Rich text editor</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : currentMode === "upload" ? (
              /* Upload mode */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attach File</p>
                  <button
                    className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                    onClick={() => {
                      if (isQBased) {
                        setQuestionModes(prev => ({ ...prev, [activeQ]: null }));
                        setQuestionFiles(prev => { const c = { ...prev }; delete c[activeQ]; return c; });
                      } else {
                        setPlainMode(null);
                        setPlainFile(null);
                      }
                    }}
                  >
                    Change mode
                  </button>
                </div>

                {(isQBased ? questionFiles[activeQ] : plainFile) ? (
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <FileText size={18} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">
                          {(isQBased ? questionFiles[activeQ] : plainFile).name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {((isQBased ? questionFiles[activeQ] : plainFile).size / 1024).toFixed(1)} KB — Ready
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (isQBased) setQuestionFiles(prev => { const c = { ...prev }; delete c[activeQ]; return c; });
                        else setPlainFile(null);
                      }}
                      className="shrink-0 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-300 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition">
                    <Upload size={28} className="text-slate-400" />
                    <span className="text-sm text-slate-600 font-semibold">Click or drag to upload</span>
                    <span className="text-xs text-slate-400">PDF, PNG, JPG, WEBP — max 10MB</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files[0]) {
                          if (isQBased) setQuestionFiles(prev => ({ ...prev, [activeQ]: e.target.files[0] }));
                          else setPlainFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            ) : (
              /* Write mode — inline editor */
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Write Your Answer</p>
                  <button
                    className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                    onClick={() => {
                      if (isQBased) setQuestionModes(prev => ({ ...prev, [activeQ]: null }));
                      else setPlainMode(null);
                    }}
                  >
                    Change mode
                  </button>
                </div>
                <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col exam-quill-container">
                  <ReactQuill
                    key={isQBased ? `q-editor-${activeQ}` : "plain-editor"}
                    theme="snow"
                    defaultValue={isQBased ? (questionTexts[activeQ] || "") : plainText}
                    onChange={(val) => {
                      if (isQBased) setQuestionTexts(prev => ({ ...prev, [activeQ]: val }));
                      else setPlainText(val);
                    }}
                    modules={QUILL_MODULES}
                    placeholder="Write your answer here. Use formatting, code blocks, and lists to structure your response clearly…"
                    className="flex-1 flex flex-col"
                    style={{ display: "flex", flexDirection: "column", height: "100%" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── MOBILE: Answer area (shown below question on small screens) ─── */}
        <div className="lg:hidden flex-1 flex flex-col bg-slate-50 overflow-hidden">
          <div className="shrink-0 px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isQBased ? `Answer Q${activeQ + 1}` : "Your Answer"}
            </p>
            {isQBased && !isCurrentSaved && currentMode && (
              <button
                onClick={() => handleSaveQuestion(activeQ)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
              >
                <Save size={11} /> Save
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {isCurrentSaved ? (
              <div className="bg-white rounded-xl border border-emerald-200 p-4">
                <p className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1.5"><Lock size={11} /> Saved</p>
                {questionModes[activeQ] === "write" && questionTexts[activeQ] ? (
                  <div className="prose prose-sm text-sm text-slate-700 max-w-none" dangerouslySetInnerHTML={{ __html: questionTexts[activeQ] }} />
                ) : (
                  <p className="text-sm text-slate-500">{questionFiles[activeQ]?.name || "File uploaded"}</p>
                )}
                <button onClick={() => handleUnlockQuestion(activeQ)} className="mt-2 text-xs text-emerald-600 underline">Edit</button>
              </div>
            ) : !currentMode ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (isQBased) setQuestionModes(prev => ({ ...prev, [activeQ]: "upload" }));
                    else setPlainMode("upload");
                  }}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-slate-200 hover:border-slate-400 transition"
                >
                  <Paperclip size={20} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Upload File</span>
                </button>
                <button
                  onClick={() => {
                    if (isQBased) setQuestionModes(prev => ({ ...prev, [activeQ]: "write" }));
                    else setPlainMode("write");
                  }}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-slate-200 hover:border-slate-900 transition"
                >
                  <PenLine size={20} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Write Answer</span>
                </button>
              </div>
            ) : currentMode === "upload" ? (
              <div className="space-y-3">
                {(isQBased ? questionFiles[activeQ] : plainFile) ? (
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="text-slate-500 shrink-0" />
                      <p className="text-sm font-medium text-slate-700 truncate">{(isQBased ? questionFiles[activeQ] : plainFile).name}</p>
                    </div>
                    <button onClick={() => {
                      if (isQBased) setQuestionFiles(prev => { const c = { ...prev }; delete c[activeQ]; return c; });
                      else setPlainFile(null);
                    }} className="text-slate-400 hover:text-rose-500"><X size={14} /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer">
                    <Upload size={22} className="text-slate-400" />
                    <span className="text-sm text-slate-500 font-medium">Tap to upload</span>
                    <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => {
                      if (e.target.files[0]) {
                        if (isQBased) setQuestionFiles(prev => ({ ...prev, [activeQ]: e.target.files[0] }));
                        else setPlainFile(e.target.files[0]);
                      }
                    }} />
                  </label>
                )}
                <button className="text-xs text-slate-400 underline" onClick={() => {
                  if (isQBased) setQuestionModes(prev => ({ ...prev, [activeQ]: null }));
                  else setPlainMode(null);
                }}>Change mode</button>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-[200px] bg-white rounded-2xl border border-slate-200 overflow-hidden exam-quill-container">
                  <ReactQuill
                    key={isQBased ? `q-editor-mobile-${activeQ}` : "plain-editor-mobile"}
                    theme="snow"
                    defaultValue={isQBased ? (questionTexts[activeQ] || "") : plainText}
                    onChange={(val) => {
                      if (isQBased) setQuestionTexts(prev => ({ ...prev, [activeQ]: val }));
                      else setPlainText(val);
                    }}
                    modules={QUILL_MODULES}
                    placeholder="Write your answer…"
                    style={{ height: "100%" }}
                  />
                </div>
                <button className="mt-2 text-xs text-slate-400 underline" onClick={() => {
                  if (isQBased) setQuestionModes(prev => ({ ...prev, [activeQ]: null }));
                  else setPlainMode(null);
                }}>Change mode</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom progress bar ── */}
      {isQBased && (
        <div className="shrink-0 h-1.5 bg-slate-200">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${task.questions?.length ? (Object.keys(savedQuestions).length / task.questions.length) * 100 : 0}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component — Task List
═══════════════════════════════════════════════════════════════ */
export default function StudentTasks() {
  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const token = getToken();
      const [tasksRes, subsRes] = await Promise.all([
        axios.get(`${API_URL}/api/tasks`,          { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/submissions/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const fetchedTasks  = tasksRes.data.tasks || [];
      const mySubmissions = subsRes.data.submissions || [];
      const completedIds  = new Set(mySubmissions.map(s => s.taskId?.toString?.() || String(s.taskId)));
      setTasks(
        fetchedTasks
          .filter(t => t.type !== "project")
          .map(t => ({ ...t, status: completedIds.has(t._id.toString()) ? "completed" : (t.status || "pending") }))
      );
    } catch (err) {
      console.error("Failed to fetch", err);
    } finally {
      setLoading(false);
    }
  };

  const openTask = (task) => {
    if (task.status === "completed") return;
    setSelectedTask(task);
  };

  const handleSubmitDone = () => {
    if (selectedTask) {
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? { ...t, status: "completed" } : t));
    }
    setSelectedTask(null);
  };

  /* ── Derived ── */
  const pending   = tasks.filter(t => t.status !== "completed").length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const filtered  = tasks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {/* ─── Page ─────────────────────────────────────────────── */}
      <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Your Tasks</h1>
              <p className="text-sm text-slate-400 mt-2">Manage and submit your daily tasks.</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
                <Clock size={13} className="text-slate-400" /> {pending} pending
              </span>
              <span className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
                <CheckCircle size={13} className="text-slate-400" /> {completed} done
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-sm"
            />
          </div>

          {/* Task list */}
          {loading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <BookOpen size={36} className="mx-auto mb-3 opacity-25" />
              <p className="text-sm">No tasks found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((task, idx) => {
                const done    = task.status === "completed";
                const diffCls = DIFF_BADGE[task.difficulty] || DIFF_BADGE.medium;
                const qCount  = Array.isArray(task.questions) ? task.questions.length : 0;

                let deadlineBadge = null;
                if (task.dueDate) {
                  const now = new Date();
                  const due = new Date(task.dueDate);
                  const diffHours = (due - now) / (1000 * 60 * 60);
                  const diffDays = Math.ceil(diffHours / 24);
                  if (done) {
                    deadlineBadge = (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1 font-medium">
                        <Clock size={10} /> Completed
                      </span>
                    );
                  } else if (diffHours < 0) {
                    deadlineBadge = (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 font-bold animate-pulse">
                        <Clock size={10} /> Overdue ({due.toLocaleDateString()})
                      </span>
                    );
                  } else if (diffDays <= 2) {
                    deadlineBadge = (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-bold">
                        <Clock size={10} /> Due in {diffDays <= 1 ? "1 day" : `${diffDays} days`}
                      </span>
                    );
                  } else {
                    deadlineBadge = (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1 font-medium">
                        <Clock size={10} /> Due {due.toLocaleDateString()}
                      </span>
                    );
                  }
                }

                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => openTask(task)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                      done
                        ? "bg-white border-slate-100 opacity-60 cursor-not-allowed"
                        : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-md cursor-pointer"
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      done ? "bg-slate-50 text-slate-400" : "bg-slate-900 text-white"
                    }`}>
                      {done ? <CheckCircle size={18} /> : <FileText size={18} />}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold truncate ${done ? "text-slate-400" : "text-slate-800"}`}>
                          {task.title || "Untitled"}
                        </p>
                        {qCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-500">
                            {qCount}Q
                          </span>
                        )}
                        {task.hasMarks && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600 flex items-center gap-0.5">
                            <BarChart2 size={8} /> Graded
                          </span>
                        )}
                        {deadlineBadge}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.difficulty && task.difficulty !== "none" && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${diffCls}`}>
                            {task.difficulty}
                          </span>
                        )}
                        {task.topic && (
                          <span className="text-[10px] text-slate-400">{task.topic}</span>
                        )}
                        {task.hasMarks && qCount > 0 && (
                          <span className="text-[10px] text-slate-400">
                            • {(task.questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0)} marks
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="shrink-0">
                      {done ? (
                        <span className="text-[11px] font-semibold text-slate-400">Submitted</span>
                      ) : (
                        <ChevronRight size={18} className="text-slate-300" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Full-screen Exam View ────────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <ExamView
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onSubmitDone={handleSubmitDone}
          />
        )}
      </AnimatePresence>
    </>
  );
}
