import { getToken } from "../utils/auth";
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { X, User, Clock, FileText, ArrowLeft, Save, Pencil, Trash2 } from "lucide-react";
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
};

/* ─── ReactQuill toolbar config (hoisted to prevent re-init on each render) ─── */
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "code-block"],
    ["clean"],
  ],
};

/* ═══════════════════════════════════════════════════════════
   TaskFormOverlay — MUST be defined OUTSIDE FacultyTasks
   so React doesn't re-create the component on each render.
   ═══════════════════════════════════════════════════════════ */
function TaskFormOverlay({ form, setForm, onSave, onBack, isSaving, isEdit }) {
  return (
    <div className="absolute inset-0 bg-white z-40 flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">
            {isEdit ? "Edit Task" : "Create New Task"}
          </h2>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-black text-white px-8 py-2.5 rounded-full font-medium hover:bg-slate-800 transition shadow-md disabled:opacity-60"
        >
          <Save size={18} />
          {isEdit ? (isSaving ? "Saving…" : "Save Changes") : "Publish Task"}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-200 bg-white p-6 overflow-y-auto space-y-6 shadow-sm relative z-10 shrink-0">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Topic</label>
            <input
              required
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50 hover:bg-slate-100/50 transition-all font-medium text-slate-900"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="e.g. Data Structures"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50 hover:bg-slate-100/50 transition-all font-medium text-slate-900"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="task">Task</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50 hover:bg-slate-100/50 transition-all font-medium text-slate-900"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Bloom Level</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50 hover:bg-slate-100/50 transition-all font-medium text-slate-900"
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

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-8">
            <p className="text-sm text-blue-800 leading-relaxed font-medium">
              <strong>Tip:</strong> Provide clear instructions and formatting to help students better understand the task requirements.
            </p>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-100 to-transparent z-10 pointer-events-none opacity-40" />
          <div className="flex-1 overflow-y-auto flex flex-col items-center py-8 px-4 sm:px-8">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col pb-12 overflow-hidden shrink-0 mt-2 mb-12 min-h-[800px]">
              <div className="px-10 lg:px-14 pt-12 pb-4">
                <input
                  type="text"
                  placeholder="Task Title..."
                  className="w-full text-4xl lg:text-5xl font-extrabold border-none outline-none placeholder:text-slate-300 bg-transparent text-slate-900 leading-tight tracking-tight shrink-0"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="flex-1 transition-all flex flex-col custom-quill-wrapper relative">
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
      </div>
    </div>
  );
}

export default function FacultyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const location = useLocation();

  /* ---------------- CREATE TASK STATE ---------------- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ ...EMPTY_TASK });

  /* ---------------- EDIT TASK STATE ---------------- */
  const [editingTask, setEditingTask] = useState(null); // task object being edited
  const [editForm, setEditForm] = useState({ ...EMPTY_TASK });
  const [savingEdit, setSavingEdit] = useState(false);

  /* ---------------- DELETE TASK STATE ---------------- */
  const [deleteTarget, setDeleteTarget] = useState(null); // task to confirm-delete
  const [deleting, setDeleting] = useState(false);

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
    try {
      const res = await fetch(`http://localhost:5002/api/submissions/task/${task._id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error("Failed to fetch submissions", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  /* ---------------- CREATE TASK ---------------- */
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5002/api/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newTask),
      });
      const data = await res.json();
      if (data.success) {
        setTasks([data.task, ...tasks]);
        setShowCreateModal(false);
        setNewTask({ ...EMPTY_TASK });
      } else {
        alert("Failed to create task");
      }
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  /* ---------------- EDIT TASK ---------------- */
  const openEditModal = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      topic: task.topic,
      difficulty: task.difficulty,
      type: task.type,
      bloomLevel: task.bloomLevel,
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`http://localhost:5002/api/tasks/${editingTask._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(editForm),
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

  /* ---------------- DELETE TASK ---------------- */
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

  /* ════════ Stable callbacks for TaskFormOverlay ════════ */
  const handleCreateBack = useCallback(() => setShowCreateModal(false), []);
  const handleEditBack = useCallback(() => setEditingTask(null), []);

  /* ================================================ RENDER ================================================ */

  if (loading) return <p className="p-6">Loading tasks...</p>;

  if (showCreateModal) return (
    <TaskFormOverlay
      form={newTask}
      setForm={setNewTask}
      onSave={handleCreateTask}
      onBack={handleCreateBack}
      isSaving={false}
      isEdit={false}
    />
  );
  if (editingTask) return (
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
        <div>
          <p className="text-slate-500 mt-1">
            Total tasks created: <span className="font-medium">{tasks.length}</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-black text-white px-6 py-2 rounded-full font-medium hover:bg-slate-800 transition"
        >
          + Create New Task
        </button>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Task History</h2>

        {tasks.length === 0 ? (
          <p className="text-slate-500">No tasks created yet.</p>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="py-4 flex justify-between items-start bg-white hover:bg-slate-50 px-4 -mx-4 transition"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-lg">{task.title}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${
                        task.type === "project"
                          ? "bg-purple-50 text-purple-700 border-purple-100"
                          : "bg-blue-50 text-blue-700 border-blue-100"
                      }`}
                    >
                      {task.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 flex gap-2 mt-1">
                    <span className="capitalize">Topic: {task.topic}</span>
                    <span>•</span>
                    <span className="capitalize">Difficulty: {task.difficulty}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-700">Bloom: {task.bloomLevel}</span>
                  </p>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {/* Review Submissions */}
                  <button
                    onClick={() => handleReviewClick(task)}
                    className="text-sm px-5 py-2.5 rounded-full border border-slate-200 hover:bg-black hover:text-white transition font-medium"
                  >
                    Review Submissions
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(task)}
                    title="Edit task"
                    className="p-2.5 rounded-full border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-500 transition"
                  >
                    <Pencil size={16} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(task)}
                    title="Delete task"
                    className="p-2.5 rounded-full border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-500 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SUBMISSIONS MODAL */}
      {selectedTaskForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold">{selectedTaskForReview.title}</h2>
                <p className="text-slate-500 text-sm">Student Submissions</p>
              </div>
              <button
                onClick={() => setSelectedTaskForReview(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loadingSubmissions ? (
                <div className="text-center py-10 text-slate-500">Loading submissions...</div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
                  <p className="text-slate-500 text-lg">No submissions yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <div key={sub._id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{sub.userId?.name || "Student"}</p>
                            <div className="flex gap-2 text-xs">
                              <span className="text-slate-400">{sub.userId?.email || "No Email"}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{sub.userId?.rollNumber}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border">
                            <Clock size={12} />
                            {new Date(sub.createdAt).toLocaleString()}
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            Score: {sub.performanceScore}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                        {sub.code || "No text content submitted."}
                      </div>

                      {sub.fileUrl && (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">
                            Attachment
                          </p>
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition border border-blue-100 font-medium text-sm"
                          >
                            <FileText size={18} /> View Submitted PDF
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        type="danger"
        title="Delete Task?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will permanently remove all student submissions for this task, updating their progress scores.`}
        confirmText="Delete Task"
        loading={deleting}
      />
    </div>
  );
}