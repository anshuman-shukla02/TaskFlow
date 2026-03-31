import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import axios from "axios";
import { Search, Upload, FileText, CheckCircle, Image as ImageIcon, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [submissionText, setSubmissionText] = useState("");
    const [submissionFile, setSubmissionFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    // Per-question answers: { [questionIndex]: answerText }
    const [questionAnswers, setQuestionAnswers] = useState({});
    
    // Per-question images (File objects): { [questionIndex]: File }
    const [questionImages, setQuestionImages] = useState({});

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const token = getToken();
            const [tasksRes, subsRes] = await Promise.all([
                axios.get("http://localhost:5002/api/tasks", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get("http://localhost:5002/api/submissions/me", { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            const fetchedTasks = tasksRes.data.tasks || [];
            const mySubmissions = subsRes.data.submissions || [];
            
            // Reconcile status
            const completedTaskIds = new Set(mySubmissions.map(s => s.taskId));
            
            const reconciledTasks = fetchedTasks.map(t => ({
                ...t,
                status: completedTaskIds.has(t._id) ? "completed" : t.status
            }));

            setTasks(reconciledTasks);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch tasks or submissions", err);
            setLoading(false);
        }
    };

    const openTask = (task) => {
        if (task.status === "completed") return; // Prevent opening completed tasks
        
        setSelectedTask(task);
        setSubmissionText("");
        setSubmissionFile(null);
        setQuestionImages({});
        
        // Init per-question answer map
        const initText = {};
        (task.questions || []).forEach((_, i) => { initText[i] = ""; });
        setQuestionAnswers(initText);
    };

    const closeModal = () => {
        setSelectedTask(null);
        setSubmissionText("");
        setSubmissionFile(null);
        setQuestionAnswers({});
        setQuestionImages({});
    };

    const handleImageChange = (index, file) => {
        if (file) {
            setQuestionImages(prev => ({ ...prev, [index]: file }));
        }
    };

    const removeImage = (index) => {
        setQuestionImages(prev => {
            const copy = { ...prev };
            delete copy[index];
            return copy;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTask) return;

        const isQBased = Array.isArray(selectedTask.questions) && selectedTask.questions.length > 0;

        setSubmitting(true);
        try {
            let fileUrl = null;
            const token = getToken();

            // 1. Upload main file (for plain tasks) if exists
            if (submissionFile) {
                const formData = new FormData();
                formData.append("file", submissionFile);
                const uploadRes = await axios.post("http://localhost:5002/api/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` }
                });
                if (uploadRes.data.success) {
                    fileUrl = uploadRes.data.fileUrl;
                }
            }

            const payload = {
                taskId: selectedTask._id,
                content: submissionText,
                code: submissionText,
                fileUrl: fileUrl,
            };

            // 2. Upload per-question images & build questionAnswers array
            if (isQBased) {
                const finalAnswers = [];
                for (let idx = 0; idx < selectedTask.questions.length; idx++) {
                    let qFileUrl = null;
                    const imgFile = questionImages[idx];
                    
                    if (imgFile) {
                        const qFormData = new FormData();
                        qFormData.append("file", imgFile);
                        const qUploadRes = await axios.post("http://localhost:5002/api/upload", qFormData, {
                            headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` }
                        });
                        if (qUploadRes.data.success) {
                            qFileUrl = qUploadRes.data.fileUrl;
                        }
                    }

                    finalAnswers.push({
                        questionIndex: idx,
                        answer: questionAnswers[idx] || "",
                        fileUrl: qFileUrl
                    });
                }
                payload.questionAnswers = finalAnswers;
            }

            // 3. Submit final payload
            await axios.post("http://localhost:5002/api/submissions", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistic update
            setTasks(prev => prev.map(t => t._id === selectedTask._id ? { ...t, status: 'completed' } : t));
            closeModal();
            alert("Task submitted successfully!");
        } catch (error) {
            console.error("Submission failed", error);
            alert("Failed to submit task: " + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const isQBased = selectedTask && Array.isArray(selectedTask.questions) && selectedTask.questions.length > 0;
    const totalTaskMarks = isQBased
        ? (selectedTask.questions || []).reduce((s, q) => s + (q.marks || 0), 0)
        : 0;

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-clay-text">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-clay-muted mt-2">Manage and submit your daily tasks.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white border rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                            <Search size={18} className="text-clay-muted" />
                            <input placeholder="Search tasks..." className="outline-none text-sm" />
                        </div>
                    </div>
                </div>

                {/* TASK LIST */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="p-8 text-center bg-white rounded-2xl shadow-sm text-clay-muted">Loading tasks...</div>
                    ) : tasks.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-2xl shadow-sm text-clay-muted">No tasks assigned yet.</div>
                    ) : (
                        tasks.map(task => (
                            <div 
                                key={task._id} 
                                onClick={() => openTask(task)}
                                className={`p-6 rounded-3xl border transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
                                    task.status === 'completed' 
                                    ? 'bg-slate-50 opacity-80 border-transparent cursor-not-allowed' 
                                    : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex flex-shrink-0 items-center justify-center ${task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {task.status === 'completed' ? <CheckCircle size={28} /> : <FileText size={28} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-semibold text-xl ${task.status === 'completed' ? 'text-slate-500' : 'text-slate-900'}`}>
                                                {task.title || "Untitled Task"}
                                            </h3>
                                            {Array.isArray(task.questions) && task.questions.length > 0 && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${task.status === 'completed' ? 'bg-slate-200 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                                                    {task.questions.length} Qs
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-3 mt-2 text-sm text-slate-500 items-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                task.status === 'completed' ? 'bg-slate-200 text-slate-500' :
                                                task.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                                                task.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                                {task.difficulty || "Medium"}
                                            </span>
                                            {Array.isArray(task.questions) && task.questions.length > 0 && (
                                                <span className="font-medium text-slate-400">
                                                    • {task.questions.reduce((s, q) => s + (q.marks || 0), 0)} Marks Total
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side Actions */}
                                <div className="flex items-center">
                                    {task.status === 'completed' ? (
                                        <div className="font-bold text-emerald-600 px-4 py-2 bg-emerald-50 rounded-xl flex items-center gap-2">
                                            <CheckCircle size={18} /> Submitted
                                        </div>
                                    ) : (
                                        <div className="absolute right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                            <div className="p-3 rounded-full bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
                                                <ChevronRight size={20} className="stroke-[3]" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
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
                            onClick={closeModal}
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative clay-modal w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                        >
                            {/* Task header */}
                            <div className="p-8 border-b  bg-slate-50/50 shrink-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
                                        {isQBased && (
                                            <p className="text-xs text-amber-600 font-medium mt-1 bg-amber-50 px-2 py-0.5 rounded-full inline-block">
                                                {selectedTask.questions.length} questions · {totalTaskMarks} total marks
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {selectedTask.description && (
                                    <div
                                        className="text-sm text-clay-secondary mt-3 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: selectedTask.description }}
                                    />
                                )}
                            </div>

                            {/* Scrollable body */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {isQBased ? (
                                    /* ── Per-question answer boxes with Image Upload ── */
                                    (selectedTask.questions || []).map((q, i) => (
                                        <div key={i} className="space-y-3 bg-white  p-5 rounded-2xl shadow-sm relative overflow-hidden">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <label className="text-sm font-semibold text-clay-text flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: `Q${i + 1}. ${q.text}` }} />
                                                <span className="shrink-0 text-xs bg-slate-100 text-clay-secondary px-2 py-0.5 rounded-full font-medium border">
                                                    {q.marks} mark{q.marks !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            
                                            {/* Answer Textarea */}
                                            <textarea
                                                value={questionAnswers[i] || ""}
                                                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                                                className="w-full min-h-[100px] border rounded-xl p-4 text-sm focus:ring-2 focus:ring-black focus:outline-none resize-none bg-slate-50 placeholder:text-clay-muted"
                                                placeholder={`Type your written answer for Q${i + 1} here if needed…`}
                                            />

                                            {/* Image Upload Area */}
                                            <div className="mt-3">
                                                {questionImages[i] ? (
                                                    <div className="relative inline-block border rounded-xl overflow-hidden group">
                                                        <img 
                                                            src={URL.createObjectURL(questionImages[i])} 
                                                            alt="preview" 
                                                            className="h-24 w-auto object-cover max-w-[200px]"
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => removeImage(i)}
                                                            className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-black"
                                                            title="Remove image"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium text-clay-secondary hover:bg-slate-50 hover:text-black cursor-pointer transition shadow-sm">
                                                        <ImageIcon size={16} />
                                                        <span>Attach Image</span>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            className="hidden" 
                                                            onChange={(e) => handleImageChange(i, e.target.files[0])}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    /* ── Plain text + file upload ── */
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-clay-secondary mb-2">Detailed Answer</label>
                                            <textarea
                                                value={submissionText}
                                                onChange={e => setSubmissionText(e.target.value)}
                                                className="w-full h-40  rounded-xl p-4 text-sm focus:ring-2 focus:ring-black focus:outline-none resize-none bg-slate-50"
                                                placeholder="Type your answer or solution explanation here..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-clay-secondary mb-2">Upload Attachment (PDF or Image)</label>
                                            <label className="border-2 border-dashed  rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition group">
                                                <Upload className="text-clay-muted group-hover:text-black transition mb-2" />
                                                <span className="text-sm text-clay-muted">Click to upload or drag and drop</span>
                                                <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => setSubmissionFile(e.target.files[0])} />
                                            </label>
                                            {submissionFile && (
                                                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                                                    <CheckCircle size={14} /> {submissionFile.name}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-slate-50 border-t  flex justify-end gap-3 shrink-0">
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-2.5 rounded-full border font-medium hover:bg-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
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
