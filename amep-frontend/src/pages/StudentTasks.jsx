import { useState, useEffect } from "react";
import axios from "axios";
import { Search, Filter, ChevronRight, Upload, FileText, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [submissionText, setSubmissionText] = useState("");
    const [submissionFile, setSubmissionFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("http://localhost:5002/api/tasks", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data.tasks || []);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch tasks", err);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTask) return;

        setSubmitting(true);
        try {
            // Mock submission for now as backend might expect specific payload
            // Ideally: POST /api/submissions
            const payload = {
                taskId: selectedTask._id,
                content: submissionText,
                // Passing mock file url for now since file storage isn't ready
                // In real app, we would upload file first, get URL, then submit
                fileUrl: submissionFile ? `https://fake-storage.com/${submissionFile.name}` : null,
                code: submissionText, // Using text area as 'code' for now
            };
            console.log("Submitting:", payload);

            const token = localStorage.getItem("token");
            await axios.post("http://localhost:5002/api/submissions", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistic update
            setTasks(prev => prev.map(t => t._id === selectedTask._id ? { ...t, status: 'completed' } : t));
            setSelectedTask(null);
            setSubmissionText("");
            setSubmissionFile(null);
            alert("Task submitted successfully!");
        } catch (error) {
            console.error("Submission failed", error);
            alert("Failed to submit task: " + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Assignments</h1>
                        <p className="text-slate-500 mt-2">Manage and submit your daily tasks.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white border rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                            <Search size={18} className="text-slate-400" />
                            <input placeholder="Search tasks..." className="outline-none text-sm" />
                        </div>
                    </div>
                </div>

                {/* TASK LIST */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading tasks...</div>
                    ) : tasks.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No tasks assigned yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {tasks.map(task => (
                                <div key={task._id} className="p-6 hover:bg-slate-50 transition flex items-center justify-between group">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {task.status === 'completed' ? <CheckCircle size={24} /> : <FileText size={24} />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{task.title || "Untitled Task"}</h3>
                                            <div className="flex gap-3 mt-1 text-sm text-slate-500">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${task.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                                    task.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {task.difficulty || "Medium"}
                                                </span>
                                                <span>• Due: Tomorrow</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedTask(task)}
                                        className="px-5 py-2 rounded-full border border-slate-200 text-sm font-medium hover:bg-black hover:text-white transition group-hover:border-black"
                                    >
                                        {task.status === 'completed' ? 'View Submission' : 'Start Task'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* SUBMISSION MODAL */}
            <AnimatePresence>
                {selectedTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedTask(null)}
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
                                <p className="text-base text-slate-600 mt-2">{selectedTask.description || "No description provided."}</p>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Detailed Answer</label>
                                    <textarea
                                        value={submissionText}
                                        onChange={e => setSubmissionText(e.target.value)}
                                        className="w-full h-40 border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-black focus:outline-none resize-none bg-slate-50"
                                        placeholder="Type your answer or solution explanation here..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Upload File (PDF)</label>
                                    <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition group">
                                        <Upload className="text-slate-400 group-hover:text-black transition mb-2" />
                                        <span className="text-sm text-slate-500">Click to upload or drag and drop</span>
                                        <input type="file" className="hidden" accept=".pdf" onChange={e => setSubmissionFile(e.target.files[0])} />
                                    </label>
                                    {submissionFile && (
                                        <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                                            <CheckCircle size={14} /> {submissionFile.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="px-6 py-2.5 rounded-full border border-slate-200 font-medium hover:bg-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-8 py-2.5 rounded-full bg-black text-white font-medium hover:scale-105 active:scale-95 transition disabled:opacity-50"
                                >
                                    {submitting ? "Submitting..." : "Submit Assignment"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
