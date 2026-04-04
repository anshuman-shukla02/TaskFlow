import { getToken } from "../utils/auth";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  Search, Upload, FileText, CheckCircle,
  X, ChevronRight, BarChart2, BookOpen,
  Clock, PenLine, Paperclip, ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

/* ─── Difficulty badge styles (minimal, no rainbow) ──────────── */
const DIFF_BADGE = {
  easy:   "bg-slate-100 text-slate-600",
  medium: "bg-slate-100 text-slate-600",
  hard:   "bg-slate-100 text-slate-700 font-bold",
};

/* ═══════════════════════════════════════════════════════════════
   FullscreenWriter — shown when student picks "Write Manually"
═══════════════════════════════════════════════════════════════ */
function FullscreenWriter({ title, questionText, initialValue, onDone, onBack }) {
  const [value, setValue] = useState(initialValue || "");

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] bg-white flex flex-col"
    >
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-white">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 truncate">{title}</p>
          {questionText && (
            <p
              className="text-sm font-semibold text-slate-700 truncate"
              dangerouslySetInnerHTML={{ __html: questionText }}
            />
          )}
        </div>
        <button
          onClick={() => onDone(value)}
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-slate-700 transition shadow-sm"
        >
          <CheckCircle size={15} /> Done
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <ReactQuill
            theme="snow"
            value={value}
            onChange={setValue}
            modules={QUILL_MODULES}
            placeholder="Write your full answer here. Use formatting to keep it clear and structured…"
            className="flex-1 flex flex-col h-full"
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AnswerModeSelector — upload vs write manually card choice
═══════════════════════════════════════════════════════════════ */
function AnswerModeSelector({ onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onSelect("upload")}
        className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition group"
      >
        <div className="w-11 h-11 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition">
          <Paperclip size={20} className="text-slate-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Upload File</p>
          <p className="text-xs text-slate-400 mt-0.5">PDF, Image, Document</p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect("write")}
        className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition group"
      >
        <div className="w-11 h-11 rounded-xl bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center transition">
          <PenLine size={20} className="text-slate-600 group-hover:text-white transition" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Write Manually</p>
          <p className="text-xs text-slate-400 mt-0.5">Rich text editor</p>
        </div>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export default function StudentTasks() {
  const [tasks,           setTasks]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const [selectedTask,    setSelectedTask]    = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitted,       setSubmitted]       = useState(false);

  /* ── Plain task submission state ── */
  const [plainMode, setPlainMode] = useState(null);    // null | "upload" | "write"
  const [plainText, setPlainText] = useState("");      // rich text (HTML)
  const [plainFile, setPlainFile] = useState(null);

  /* ── Question-based state ── */
  const [activeQ,       setActiveQ]       = useState(0);
  const [questionModes, setQuestionModes] = useState({}); // { [i]: "upload" | "write" }
  const [questionTexts, setQuestionTexts] = useState({}); // { [i]: html string }
  const [questionFiles, setQuestionFiles] = useState({}); // { [i]: File }

  /* ── Fullscreen writer state ── */
  const [writerOpen,    setWriterOpen]    = useState(false);
  const [writerTarget,  setWriterTarget]  = useState(null);  // null = plain, number = question idx

  useEffect(() => { fetchTasks(); }, []);

  /* ──────────────────────────────────────────────────────────── */
  const fetchTasks = async () => {
    try {
      const token = getToken();
      const [tasksRes, subsRes] = await Promise.all([
        axios.get("http://localhost:5002/api/tasks",          { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("http://localhost:5002/api/submissions/me", { headers: { Authorization: `Bearer ${token}` } }),
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

  /* ── Open/close modal ─────────────────────────────────────── */
  const openTask = (task) => {
    if (task.status === "completed") return;
    setSelectedTask(task);
    setPlainMode(null);
    setPlainText("");
    setPlainFile(null);
    setQuestionModes({});
    setQuestionTexts({});
    setQuestionFiles({});
    setActiveQ(0);
    setSubmitted(false);
  };

  const closeModal = () => {
    setSelectedTask(null);
    setWriterOpen(false);
    setWriterTarget(null);
  };

  /* ── Open fullscreen writer ───────────────────────────────── */
  const openWriter = (target /* null=plain, number=qIdx */) => {
    setWriterTarget(target);
    setWriterOpen(true);
  };

  const closeWriter = (savedValue) => {
    if (savedValue !== undefined) {
      if (writerTarget === null) {
        setPlainText(savedValue);
      } else {
        setQuestionTexts(prev => ({ ...prev, [writerTarget]: savedValue }));
      }
    }
    setWriterOpen(false);
    setWriterTarget(null);
  };

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!selectedTask) return;
    const isQBased = Array.isArray(selectedTask.questions) && selectedTask.questions.length > 0;
    setSubmitting(true);
    try {
      const token = getToken();
      let fileUrl = null;

      // Upload plain file
      if (!isQBased && plainMode === "upload" && plainFile) {
        const fd = new FormData();
        fd.append("file", plainFile);
        const r = await axios.post("http://localhost:5002/api/upload", fd, {
          headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
        });
        if (r.data.success) fileUrl = r.data.fileUrl;
      }

      const payload = {
        taskId:  selectedTask._id,
        code:    plainMode === "write" ? plainText : "",
        content: plainMode === "write" ? plainText : "",
        fileUrl,
      };

      // Question-based
      if (isQBased) {
        const finalAnswers = [];
        for (let idx = 0; idx < selectedTask.questions.length; idx++) {
          let qFileUrl = null;
          const mode    = questionModes[idx];
          const imgFile = questionFiles[idx];

          if (mode === "upload" && imgFile) {
            const qfd = new FormData();
            qfd.append("file", imgFile);
            const qr = await axios.post("http://localhost:5002/api/upload", qfd, {
              headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
            });
            if (qr.data.success) qFileUrl = qr.data.fileUrl;
          }

          finalAnswers.push({
            questionIndex: idx,
            answer:  mode === "write" ? (questionTexts[idx] || "") : "",
            fileUrl: qFileUrl,
          });
        }
        payload.questionAnswers = finalAnswers;
        payload.code    = "";
        payload.content = "";
        payload.fileUrl = null;
      }

      await axios.post("http://localhost:5002/api/submissions", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? { ...t, status: "completed" } : t));
      setSubmitted(true);
      setTimeout(() => closeModal(), 1800);
    } catch (err) {
      alert("Submission failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Derived ──────────────────────────────────────────────── */
  const isQBased      = selectedTask && Array.isArray(selectedTask.questions) && selectedTask.questions.length > 0;
  const taskHasMarks  = selectedTask?.hasMarks ?? false;
  const totalMarks    = isQBased && taskHasMarks
    ? (selectedTask.questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0) : 0;

  const pending   = tasks.filter(t => t.status !== "completed").length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const filtered  = tasks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));

  /* ── Question answered progress ── */
  const qAnswered = isQBased
    ? (selectedTask.questions || []).filter((_, i) => questionModes[i] === "write"
        ? !!questionTexts[i]
        : questionModes[i] === "upload" && !!questionFiles[i]
      ).length
    : 0;

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
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
                const done      = task.status === "completed";
                const diffCls   = DIFF_BADGE[task.difficulty] || DIFF_BADGE.medium;
                const qCount    = Array.isArray(task.questions) ? task.questions.length : 0;

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
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${diffCls}`}>
                          {task.difficulty || "medium"}
                        </span>
                        {task.topic && (
                          <span className="text-[10px] text-slate-400">{task.topic}</span>
                        )}
                        {task.hasMarks && qCount > 0 && (
                          <span className="text-[10px] text-slate-400">
                            • {task.questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)} marks
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="shrink-0">
                      {done ? (
                        <span className="text-[11px] font-semibold text-slate-400">Submitted</span>
                      ) : (
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-600" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Submission Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={!submitting ? closeModal : undefined}
            />

            {/* Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="relative w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl border border-slate-200"
            >
              {/* Modal header */}
              <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-100 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${DIFF_BADGE[selectedTask.difficulty] || DIFF_BADGE.medium}`}>
                      {selectedTask.difficulty || "medium"}
                    </span>
                    {isQBased && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">
                        {selectedTask.questions.length} questions{taskHasMarks ? ` · ${totalMarks} marks` : ""}
                      </span>
                    )}
                    {!isQBased && taskHasMarks && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <BarChart2 size={8} /> Graded
                      </span>
                    )}
                    {!taskHasMarks && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase tracking-wide">
                        Practice
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 leading-snug">{selectedTask.title}</h2>
                </div>
                <button
                  onClick={closeModal}
                  className="shrink-0 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition mt-0.5"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Description */}
              {selectedTask.description && selectedTask.description !== "<p><br></p>" && (
                <div className="shrink-0 px-6 pt-4">
                  <div
                    className="text-sm text-slate-600 prose prose-sm max-w-none bg-slate-50 rounded-xl p-4 border border-slate-100 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedTask.description }}
                  />
                </div>
              )}

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* ── SUCCESS ── */}
                {submitted ? (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-14 gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
                      <CheckCircle size={32} className="text-white" />
                    </div>
                    <p className="text-base font-bold text-slate-800">Submitted!</p>
                    <p className="text-sm text-slate-400">Your assignment has been received.</p>
                  </motion.div>

                ) : isQBased ? (
                  /* ── Question-based ── */
                  <>
                    {/* Q-tabs */}
                    <div className="flex gap-1.5 flex-wrap">
                      {(selectedTask.questions || []).map((_, i) => {
                        const done = questionModes[i] === "write"
                          ? !!questionTexts[i]
                          : questionModes[i] === "upload" && !!questionFiles[i];
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveQ(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              activeQ === i
                                ? "bg-slate-900 text-white"
                                : done
                                ? "bg-slate-200 text-slate-600"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active question */}
                    {(selectedTask.questions || []).map((q, i) =>
                      i !== activeQ ? null : (
                        <div key={i} className="space-y-4">
                          {/* Question text */}
                          <div className="flex items-start gap-3 bg-slate-900 text-white rounded-2xl p-4">
                            <span className="shrink-0 w-6 h-6 rounded-lg bg-white/15 text-xs font-black flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <div
                                className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: q.text }}
                              />
                              {taskHasMarks && (
                                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                                  {q.marks} mark{q.marks !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Mode selector or answer */}
                          {!questionModes[i] ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                How do you want to answer?
                              </p>
                              <AnswerModeSelector
                                onSelect={mode => setQuestionModes(prev => ({ ...prev, [i]: mode }))}
                              />
                            </div>
                          ) : questionModes[i] === "upload" ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  Attach File
                                </p>
                                <button
                                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                                  onClick={() => setQuestionModes(prev => ({ ...prev, [i]: null }))}
                                >
                                  Change mode
                                </button>
                              </div>
                              {questionFiles[i] ? (
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <FileText size={16} className="text-slate-500 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-700 truncate">{questionFiles[i].name}</p>
                                      <p className="text-[11px] text-slate-400">{(questionFiles[i].size / 1024).toFixed(1)} KB</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setQuestionFiles(prev => { const c = { ...prev }; delete c[i]; return c; })}
                                    className="shrink-0 w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center gap-2 p-7 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition">
                                  <Upload size={20} className="text-slate-400" />
                                  <span className="text-sm text-slate-500 font-medium">Click to upload</span>
                                  <span className="text-xs text-slate-400">PDF, PNG, JPG, WEBP</span>
                                  <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    className="hidden"
                                    onChange={e => { if (e.target.files[0]) setQuestionFiles(prev => ({ ...prev, [i]: e.target.files[0] })); }}
                                  />
                                </label>
                              )}
                            </div>
                          ) : (
                            /* write mode */
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  Written Answer
                                </p>
                                <button
                                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                                  onClick={() => setQuestionModes(prev => ({ ...prev, [i]: null }))}
                                >
                                  Change mode
                                </button>
                              </div>
                              {questionTexts[i] ? (
                                <div
                                  className="prose prose-sm max-w-none text-slate-700 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm max-h-36 overflow-y-auto cursor-pointer hover:border-slate-400 transition"
                                  onClick={() => openWriter(i)}
                                  dangerouslySetInnerHTML={{ __html: questionTexts[i] }}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openWriter(i)}
                                  className="w-full flex items-center gap-3 p-5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-2xl text-left transition"
                                >
                                  <PenLine size={18} className="text-slate-400" />
                                  <span className="text-sm text-slate-400">Click to open editor…</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openWriter(i)}
                                className="text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-2 transition"
                              >
                                {questionTexts[i] ? "Edit answer" : "Open editor"}
                              </button>
                            </div>
                          )}

                          {/* Prev / Next */}
                          <div className="flex justify-between pt-1">
                            <button disabled={i === 0} onClick={() => setActiveQ(i - 1)}
                              className="text-sm text-slate-400 hover:text-slate-700 disabled:opacity-30 transition">
                              ← Prev
                            </button>
                            {i < (selectedTask.questions?.length || 1) - 1 ? (
                              <button onClick={() => setActiveQ(i + 1)}
                                className="text-sm text-slate-700 hover:text-slate-900 font-medium transition">
                                Next →
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Last question</span>
                            )}
                          </div>
                        </div>
                      )
                    )}

                    {/* Progress */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-700 rounded-full transition-all duration-500"
                          style={{ width: `${(qAnswered / (selectedTask.questions?.length || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {qAnswered}/{selectedTask.questions?.length} answered
                      </span>
                    </div>
                  </>

                ) : (
                  /* ── Single / plain task ── */
                  !plainMode ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        How do you want to submit?
                      </p>
                      <AnswerModeSelector onSelect={setPlainMode} />
                    </div>
                  ) : plainMode === "upload" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Attach File
                        </p>
                        <button
                          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                          onClick={() => setPlainMode(null)}
                        >
                          Change mode
                        </button>
                      </div>
                      {plainFile ? (
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText size={16} className="text-slate-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{plainFile.name}</p>
                              <p className="text-[11px] text-slate-400">{(plainFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPlainFile(null)}
                            className="shrink-0 w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition">
                          <Upload size={22} className="text-slate-400" />
                          <span className="text-sm text-slate-500 font-medium">Click to upload</span>
                          <span className="text-xs text-slate-400">PDF, PNG, JPG, WEBP</span>
                          <input type="file" accept=".pdf,image/*" className="hidden"
                            onChange={e => { if (e.target.files[0]) setPlainFile(e.target.files[0]); }}
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    /* write mode — preview in modal */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Written Answer
                        </p>
                        <button
                          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                          onClick={() => setPlainMode(null)}
                        >
                          Change mode
                        </button>
                      </div>

                      {plainText ? (
                        <div
                          className="prose prose-sm max-w-none text-slate-700 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-sm max-h-48 overflow-y-auto cursor-pointer hover:border-slate-400 transition"
                          onClick={() => openWriter(null)}
                          dangerouslySetInnerHTML={{ __html: plainText }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => openWriter(null)}
                          className="w-full flex items-center gap-3 p-6 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-2xl text-left transition"
                        >
                          <PenLine size={18} className="text-slate-400" />
                          <span className="text-sm text-slate-400">Click to open full editor…</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openWriter(null)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-2 transition"
                      >
                        {plainText ? "Edit answer" : "Open editor"}
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              {!submitted && (
                <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || (!isQBased && !plainMode)}
                    className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Submitting…
                      </>
                    ) : "Submit Assignment"}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Fullscreen Writer Overlay ─────────────────────────── */}
      <AnimatePresence>
        {writerOpen && selectedTask && (
          <FullscreenWriter
            title={selectedTask.title}
            questionText={
              writerTarget !== null
                ? selectedTask.questions?.[writerTarget]?.text
                : null
            }
            initialValue={
              writerTarget !== null
                ? questionTexts[writerTarget] || ""
                : plainText
            }
            onDone={closeWriter}
            onBack={() => closeWriter(undefined)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
