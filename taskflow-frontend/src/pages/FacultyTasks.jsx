import { getToken } from "../utils/auth";
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  X, User, Clock, FileText, ArrowLeft, Save, Pencil, Trash2,
  Plus, CheckCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import ConfirmationModal from "../components/common/ConfirmationModal";

const EMPTY_TASK = {
  title: "",
  description: "",
  topic: "",
  difficulty: "medium",
  type: "task",
  bloomLevel: "REMEMBER",
  taskMode: "single",   // "single" | "questions"
  questions: [],        // [{ text, marks }]
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "code-block"],
    ["clean"],
  ],
};

/* ════════════════════════════════════════════════════════
   QuestionEditor — full-page card for a single question
   with prev / next navigation
   ════════════════════════════════════════════════════════ */
function QuestionEditor({ questions, activeIdx, onNavigate, onChange, onAdd, onRemove }) {
  const q = questions[activeIdx] || { text: "", marks: 1 };
  const total = questions.length;
  const totalMarks = questions.reduce((s, qItem) => s + (Number(qItem.marks) || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden relative">
      {/* Question nav bar */}
      <div className="flex items-center justify-between px-8 pt-6 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(i)}
              className={`w-8 h-8 rounded-full text-sm font-bold transition border ${
                i === activeIdx
                  ? "bg-black text-white border-black"
                  : "bg-white text-clay-muted  hover:border-slate-400"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 ml-2 text-xs font-medium text-purple-600 hover:text-blue-800 clay-tint-sky hover:bg-blue-100 px-3 py-1.5 rounded-full transition border border-purple-100"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-clay-muted font-medium">Total {totalMarks} marks</span>
          {total > 1 && (
            <button
              type="button"
              onClick={() => onRemove(activeIdx)}
              className="text-xs text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-full clay-tint-rose hover:bg-rose-100 transition"
            >
              Remove Q{activeIdx + 1}
            </button>
          )}
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden min-h-[480px]">
          {/* Card header */}
          <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b ">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-slate-200">Q{activeIdx + 1}</span>
              <span className="text-sm text-clay-muted font-medium">of {total}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-clay-muted">Marks</label>
              <input
                type="number"
                min="1"
                value={q.marks}
                onChange={(e) => onChange(activeIdx, "marks", parseInt(e.target.value, 10) || 1)}
                className="w-20 border rounded-lg px-3 py-1.5 text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Question text — full Quill editor */}
          <div className="flex-1 p-6">
            <ReactQuill
              key={`qeditor-${activeIdx}`}
              theme="snow"
              value={q.text}
              onChange={(content) => onChange(activeIdx, "text", content)}
              className="flex-1 flex flex-col bg-white text-base w-full"
              placeholder={`Write question ${activeIdx + 1} here…`}
              modules={QUILL_MODULES}
            />
          </div>

          {/* Prev / Next */}
          <div className="flex items-center justify-between px-8 py-4 border-t  bg-slate-50/60">
            <button
              type="button"
              disabled={activeIdx === 0}
              onClick={() => onNavigate(activeIdx - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium text-clay-secondary hover:bg-white disabled:opacity-30 transition"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              disabled={activeIdx === total - 1}
              onClick={() => onNavigate(activeIdx + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium text-clay-secondary hover:bg-white disabled:opacity-30 transition"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TaskFormOverlay — must be outside FacultyTasks
   ════════════════════════════════════════════════════════ */
function TaskFormOverlay({ form, setForm, onSave, onBack, isSaving, isEdit }) {
  const [activeQIdx, setActiveQIdx] = useState(0);
  const isQuestionMode = form.taskMode === "questions";

  const addQuestion = () => {
    setForm(prev => {
      const qs = prev.questions || [];
      return { ...prev, questions: [...qs, { text: "", marks: 1 }] };
    });
    // Use length + 1 because state hasn't updated synchronously here. We know we are appending one.
    setActiveQIdx((form.questions || []).length);
  };

  const removeQuestion = (i) => {
    setForm(prev => {
      const qs = prev.questions || [];
      if (qs.length <= 1) return prev;
      return { ...prev, questions: qs.filter((_, idx) => idx !== i) };
    });
    setActiveQIdx(prevIdx => Math.min(i, Math.max(0, (form.questions || []).length - 2)));
  };

  const updateQuestion = (i, field, value) => {
    setForm(prev => {
      const qs = prev.questions || [];
      const updated = qs.map((q, idx) =>
        idx === i ? { ...q, [field]: value } : q
      );
      return { ...prev, questions: updated };
    });
  };

  const isSaveDisabled = isSaving || !form.title || form.title.trim() === "";

  return (
    <div className="absolute inset-0 bg-white z-40 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top bar */}
      <div className="flex justify-between items-center p-6 border-b  bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-clay-muted transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-clay-text">
            {isEdit ? "Edit Task" : "Create New Task"}
          </h2>
        </div>
        <button
          onClick={onSave}
          disabled={isSaveDisabled}
          className="flex items-center gap-2 bg-black text-white px-8 py-2.5 rounded-full font-medium hover:bg-slate-800 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {isEdit ? (isSaving ? "Saving…" : "Save Changes") : "Publish Task"}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
        {/* Sidebar */}
        <div className="w-72 border-r  bg-white p-6 overflow-y-auto space-y-5 shadow-sm shrink-0">
          <div>
            <label className="block text-sm font-semibold text-clay-secondary mb-1.5">Topic</label>
            <input
              type="text"
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50 font-medium text-clay-text"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="e.g. Data Structures"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-clay-secondary mb-1.5">Type</label>
            <select
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50 font-medium text-clay-text"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="task">Task</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-clay-secondary mb-1.5">Difficulty</label>
            <select
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50 font-medium text-clay-text"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-clay-secondary mb-1.5">Bloom Level</label>
            <select
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50 font-medium text-clay-text"
              value={form.bloomLevel}
              onChange={(e) => setForm({ ...form, bloomLevel: e.target.value })}
            >
              <option value="REMEMBER">Remember</option>
              <option value="UNDERSTAND">Understand</option>
              <option value="APPLY">Apply</option>
              <option value="ANALYZE">Analyze</option>
              <option value="EVALUATE">Evaluate</option>
              <option value="CREATE">Create</option>
            </select>
          </div>

          {/* Task Mode Toggle */}
          <div>
            <label className="block text-sm font-semibold text-clay-secondary mb-1.5">Task Mode</label>
            <div className="flex rounded-xl overflow-hidden border">
              <button
                type="button"
                onClick={() => setForm({ ...form, taskMode: "single", questions: [] })}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  form.taskMode === "single"
                    ? "bg-black text-white"
                    : "bg-white text-clay-secondary hover:bg-slate-50"
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => {
                  const qs = form.questions?.length ? form.questions : [{ text: "", marks: 1 }];
                  setForm({ ...form, taskMode: "questions", questions: qs });
                  setActiveQIdx(0);
                }}
                className={`flex-1 py-2 text-sm font-medium transition ${
                  form.taskMode === "questions"
                    ? "bg-black text-white"
                    : "bg-white text-clay-secondary hover:bg-slate-50"
                }`}
              >
                Questions
              </button>
            </div>
          </div>

          {/* Question index quick-jump */}
          {isQuestionMode && form.questions?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-clay-muted uppercase tracking-wider">Questions</p>
              {form.questions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveQIdx(i)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition border ${
                    i === activeQIdx
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white  text-clay-secondary hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold">Q{i + 1}</span>
                  <span className="text-xs ml-2 opacity-60">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                </button>
              ))}
            </div>
          )}

          {!isQuestionMode && (
            <div className="clay-tint-sky p-4 rounded-xl border border-purple-100">
              <p className="text-sm text-blue-800 leading-relaxed font-medium">
                <strong>Tip:</strong> Provide clear instructions to help students understand the task.
              </p>
            </div>
          )}
        </div>

        {/* Main editor area */}
        {isQuestionMode ? (
          /* Question card editor */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Title input at top */}
            <div className="px-8 pt-7 pb-3 bg-white border-b  shrink-0">
              <input
                type="text"
                placeholder="Task Title..."
                className="w-full text-3xl font-extrabold border-none outline-none placeholder:text-slate-300 bg-transparent text-clay-text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <QuestionEditor
              questions={form.questions || []}
              activeIdx={activeQIdx}
              onNavigate={setActiveQIdx}
              onChange={updateQuestion}
              onAdd={addQuestion}
              onRemove={removeQuestion}
            />
          </div>
        ) : (
          /* Plain description editor */
          <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-100 to-transparent z-10 pointer-events-none opacity-40" />
            <div className="flex-1 overflow-y-auto flex flex-col items-center py-8 px-4 sm:px-8">
              <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border flex flex-col pb-12 overflow-hidden shrink-0 mt-2 mb-12 min-h-[800px]">
                <div className="px-10 lg:px-14 pt-12 pb-4">
                  <input
                    type="text"
                    placeholder="Task Title..."
                    className="w-full text-4xl lg:text-5xl font-extrabold border-none outline-none placeholder:text-slate-300 bg-transparent text-clay-text leading-tight tracking-tight"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="flex-1 flex flex-col custom-quill-wrapper relative">
                  <ReactQuill
                    theme="snow"
                    value={form.description}
                    onChange={(content) => setForm({ ...form, description: content })}
                    className="flex-1 flex flex-col bg-white text-lg w-full"
                    placeholder="Write the task details, attachments, and instructions here..."
                    modules={QUILL_MODULES}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   FacultyTasks — main page component
   ════════════════════════════════════════════════════════ */
export default function FacultyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const location = useLocation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ ...EMPTY_TASK });

  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_TASK });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // { [submissionId]: [{ questionIndex, score }] }
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [savingScore, setSavingScore] = useState(null);

  useEffect(() => {
    fetchTasks();
    if (location.state?.openCreate) {
      setShowCreateModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchTasks = async () => {
    try {
      const res = await fetch("http://localhost:5002/api/tasks", {
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
      const res = await fetch(`http://localhost:5002/api/submissions/task/${task._id}`, {
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

  /* ── helpers ── */
  // Strip questions with blank text before sending to backend
  const sanitiseQuestions = (form) => {
    if (form.taskMode !== "questions") return [];
    return (form.questions || []).filter((q) => q.text && q.text.trim() !== "" && q.text !== "<p><br></p>");
  };

  /* ── CREATE ── */
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newTask, questions: sanitiseQuestions(newTask) };
      const res = await fetch("http://localhost:5002/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setTasks([data.task, ...tasks]);
        setShowCreateModal(false);
        setNewTask({ ...EMPTY_TASK });
      } else {
        alert("Failed to create task: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to create task", err);
      alert("Failed to create task. Check console for details.");
    }
  };

  /* ── EDIT ── */
  const openEditModal = (task) => {
    const hasQ = Array.isArray(task.questions) && task.questions.length > 0;
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      topic: task.topic,
      difficulty: task.difficulty,
      type: task.type,
      bloomLevel: task.bloomLevel,
      taskMode: hasQ ? "questions" : "single",
      questions: task.questions || [],
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const payload = { ...editForm, questions: sanitiseQuestions(editForm) };
      const res = await fetch(`http://localhost:5002/api/tasks/${editingTask._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(tasks.map((t) => (t._id === editingTask._id ? data.task : t)));
        setEditingTask(null);
      } else {
        alert("Failed to update task: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to update task", err);
    } finally {
      setSavingEdit(false);
    }
  };

  /* ── DELETE ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:5002/api/tasks/${deleteTarget._id}`, {
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

  /* ── GRADING ── */
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
      const res = await fetch(`http://localhost:5002/api/submissions/${sub._id}/score`, {
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

  const handleCreateBack = useCallback(() => setShowCreateModal(false), []);
  const handleEditBack = useCallback(() => setEditingTask(null), []);

  /* ════════ RENDER ════════ */
  if (loading) return <p className="p-6">Loading tasks...</p>;

  if (showCreateModal)
    return (
      <TaskFormOverlay
        form={newTask}
        setForm={setNewTask}
        onSave={handleCreateTask}
        onBack={handleCreateBack}
        isSaving={false}
        isEdit={false}
      />
    );

  if (editingTask)
    return (
      <TaskFormOverlay
        form={editForm}
        setForm={setEditForm}
        onSave={handleEditSave}
        onBack={handleEditBack}
        isSaving={savingEdit}
        isEdit={true}
      />
    );

  return (
    <div className="p-8 space-y-8 relative">
      {/* Header */}
      <div className="flex justify-between items-end">
        <p className="text-clay-muted mt-1">
          Total tasks created: <span className="font-medium">{tasks.length}</span>
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
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
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-bold text-xl text-slate-900">{task.title}</p>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                          task.type === "project"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {task.type}
                      </span>
                      {Array.isArray(task.questions) && task.questions.length > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-700">
                          {task.questions.length} Qs
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md px-2">Topic: {task.topic}</span>
                      <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md px-2">Diff: {task.difficulty}</span>
                      <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-md px-2 text-slate-600">Bloom: <span className="font-bold">{task.bloomLevel}</span></span>
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
                    onClick={() => openEditModal(task)}
                    title="Edit task"
                    className="p-3 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-400 transition-all font-bold"
                  >
                    <Pencil size={18} />
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
                <p className="text-clay-muted text-sm">Student Submissions</p>
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
                <div className="text-center py-10 text-clay-muted">Loading submissions...</div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
                  <p className="text-clay-muted text-lg">No submissions yet.</p>
                </div>
              ) : (
                submissions.map((sub) => {
                  const questions = selectedTaskForReview?.questions || [];
                  const isQBased = questions.length > 0;
                  const draftScore = isQBased ? calcDraftScore(sub._id, questions) : null;

                  return (
                    <div key={sub._id} className="bg-white p-6 rounded-2xl shadow-sm ">
                      {/* Student info */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-clay-secondary">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-clay-text">{sub.userId?.name || "Student"}</p>
                            <div className="flex gap-2 text-xs">
                              <span className="text-clay-muted">{sub.userId?.email || "No Email"}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-clay-muted">{sub.userId?.rollNumber}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2 text-xs text-clay-muted bg-slate-50 px-3 py-1 rounded-full border">
                            <Clock size={12} />
                            {new Date(sub.createdAt).toLocaleString()}
                          </div>
                          <span className="text-xs font-mono font-bold text-clay-muted">
                            Score: {sub.performanceScore}/10
                          </span>
                        </div>
                      </div>

                      {/* Question-based */}
                      {isQBased ? (
                        <div className="space-y-4">
                          {questions.map((q, i) => {
                            const answerObj = (sub.questionAnswers || []).find((a) => a.questionIndex === i);
                            const draft = getScoreDraft(sub._id, questions);
                            const scoreDraft = draft.find((d) => d.questionIndex === i) || { score: 0 };

                            return (
                              <div key={i} className=" rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                                  <div
                                    className="text-xs font-bold text-clay-secondary flex-1 prose prose-xs max-w-none"
                                    dangerouslySetInnerHTML={{ __html: `Q${i + 1} — ${q.text}` }}
                                  />
                                  <span className="shrink-0 text-xs text-clay-muted font-medium ml-2">
                                    Max: {q.marks} mark{q.marks !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                <div className="p-4 space-y-3">
                                  {answerObj?.fileUrl && (
                                    <div className="mb-3">
                                      <p className="text-xs font-semibold text-clay-muted mb-1">Attached Image:</p>
                                      <a href={answerObj.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block border rounded-lg overflow-hidden hover:opacity-90 transition shadow-sm">
                                        <img src={answerObj.fileUrl} alt={`Q${i + 1} attachment`} className="h-32 w-auto object-cover max-w-[300px]" />
                                      </a>
                                    </div>
                                  )}
                                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-clay-secondary whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto ">
                                    {answerObj?.answer || <span className="italic text-clay-muted">No text answer provided.</span>}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <label className="text-xs font-semibold text-clay-secondary">Score:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={q.marks}
                                      value={scoreDraft.score}
                                      onChange={(e) => updateScoreDraft(sub._id, i, e.target.value, questions)}
                                      className="w-20 border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <span className="text-xs text-clay-muted">/ {q.marks}</span>
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
                              className="flex items-center gap-2 bg-white text-clay-text px-5 py-2 rounded-full font-semibold text-sm hover:bg-slate-100 transition disabled:opacity-60"
                            >
                              <CheckCircle size={16} />
                              {savingScore === sub._id ? "Saving…" : "Save Score"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Plain text submission */
                        <>
                          <div className="bg-slate-50 rounded-xl p-4  text-sm text-clay-secondary whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                            {sub.code || "No text content submitted."}
                          </div>
                          {sub.fileUrl && (
                            <div className="mt-4 border-t pt-4">
                              <p className="text-xs font-bold text-clay-muted uppercase mb-2 tracking-wider">
                                Attachment
                              </p>
                              {sub.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block border rounded-lg overflow-hidden hover:opacity-90 transition shadow-sm mt-1">
                                  <img src={sub.fileUrl} alt="Submitted attachment" className="max-h-64 w-auto object-contain" />
                                </a>
                              ) : (
                                <a
                                  href={sub.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 clay-tint-sky text-blue-700 rounded-xl hover:bg-blue-100 transition border border-purple-100 font-medium text-sm"
                                >
                                  <FileText size={18} /> View Submitted File
                                </a>
                              )}
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