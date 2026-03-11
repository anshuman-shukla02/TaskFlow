import { useEffect, useState } from "react";
import { X, User, Clock, FileText } from "lucide-react";

export default function FacultyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("http://localhost:5002/api/tasks", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
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
      const res = await fetch(`http://localhost:5002/api/submissions/task/${task._id}`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error("Failed to fetch submissions", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  /* ---------------- CREATE TASK STATE ---------------- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    topic: "",
    difficulty: "medium",
    type: "task",
    bloomLevel: "REMEMBER"
  });

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5002/api/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(newTask),
      });
      const data = await res.json();
      if (data.success) {
        setTasks([data.task, ...tasks]);
        setShowCreateModal(false);
        setNewTask({
          title: "",
          description: "",
          topic: "",
          difficulty: "medium",
          type: "task",
          bloomLevel: "REMEMBER"
        });
      } else {
        alert("Failed to create task");
      }
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };


  if (loading) {
    return <p className="p-6">Loading tasks...</p>;
  }

  return (
    <div className="p-8 space-y-8 relative">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold">Tasks</h1>
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
              <div key={task._id} className="py-4 flex justify-between items-start bg-white hover:bg-slate-50 px-4 -mx-4 transition">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-lg">{task.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${task.type === 'project' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReviewClick(task)}
                    className="text-sm px-5 py-2.5 rounded-full border border-slate-200 hover:bg-black hover:text-white transition font-medium"
                  >
                    Review Submissions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create New Task</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={24} /></button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Implement Binary Search"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none h-24"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                  <input
                    required
                    type="text"
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                    value={newTask.topic}
                    onChange={(e) => setNewTask({ ...newTask, topic: e.target.value })}
                    placeholder="e.g. Algorithms"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                    value={newTask.type}
                    onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                  >
                    <option value="task">Task</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                    value={newTask.difficulty}
                    onChange={(e) => setNewTask({ ...newTask, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bloom Level</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                    value={newTask.bloomLevel}
                    onChange={(e) => setNewTask({ ...newTask, bloomLevel: e.target.value })}
                  >
                    <option value="REMEMBER">Remember</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYZE">Analyze</option>
                    <option value="EVALUATE">Evaluate</option>
                    <option value="CREATE">Create</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-3 rounded-full hover:bg-slate-800 transition mt-2"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

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
                          <span className="text-xs font-mono font-bold text-slate-300">Score: {sub.performanceScore}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                        {sub.code || "No text content submitted."}
                      </div>

                      {sub.fileUrl && (
                        <div className="mt-3">
                          <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-2 text-sm">
                            <FileText size={16} /> View Attached PDF
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
    </div>
  );
}