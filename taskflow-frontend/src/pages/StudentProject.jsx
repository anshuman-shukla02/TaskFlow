import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { Puzzle, ChevronRight, CheckCircle, Lock, Clock, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import axios from "axios";

const BLOOM_COLORS = {
    REMEMBER: "bg-purple-100 text-purple-700",
    UNDERSTAND: "bg-blue-100 text-blue-700",
    APPLY: "bg-green-100 text-green-700",
    ANALYZE: "bg-yellow-100 text-yellow-700",
    EVALUATE: "bg-orange-100 text-orange-700",
    CREATE: "bg-red-100 text-red-700",
};

export default function StudentProject() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(null);
    const [submission, setSubmission] = useState("");
    const [submissionFile, setSubmissionFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submissionsMap, setSubmissionsMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const token = getToken();
            const res = await axios.get("http://localhost:5002/api/tasks", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.tasks) {
                const projList = res.data.tasks.filter(t => t.type === "project");
                setProjects(projList);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectSubmissions = async (projectId) => {
        try {
            const token = getToken();
            const res = await axios.get(`http://localhost:5002/api/submissions/task/${projectId}`);
            if (res.data.submissions) {
                const myTokenPayload = JSON.parse(atob(token.split('.')[1]));
                const mySubs = res.data.submissions.filter(s => s.userId._id === myTokenPayload.id);
                
                const map = {};
                mySubs.forEach(sub => {
                    if (sub.milestoneId !== null) {
                        map[sub.milestoneId - 1] = sub; // 0-indexed internally based on phase array
                    }
                });
                setSubmissionsMap(map);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelectProject = (project) => {
        setSelectedProject(project);
        setActiveMilestoneIndex(null);
        setSubmission("");
        fetchProjectSubmissions(project._id);
    };

    const getMilestoneStatus = (index) => {
        if (index > 0) {
            const prevSub = submissionsMap[index - 1];
            if (!prevSub || prevSub.reviewStatus !== "APPROVED") {
                return "locked";
            }
        }

        const sub = submissionsMap[index];
        if (!sub) return "in-progress";

        if (sub.reviewStatus === "APPROVED") return "completed";
        if (sub.reviewStatus === "PENDING") return "pending";
        if (sub.reviewStatus === "REJECTED") return "rejected";

        return "in-progress";
    };

    const handleStart = (index, status) => {
        if (status === "locked" || status === "pending") return;
        setActiveMilestoneIndex(index);
        setSubmission("");
    };

    const handleBack = () => {
        setActiveMilestoneIndex(null);
        setSubmission("");
        setSubmissionFile(null);
        fetchProjectSubmissions(selectedProject._id); // Refresh
    };

    const handleSubmit = async () => {
        if (activeMilestoneIndex === null) return;
        const phase = selectedProject.phases[activeMilestoneIndex];

        setSubmitting(true);
        try {
            const token = getToken();
            let fileUrl = phase.type === "URL" ? submission : null;

            if (submissionFile) {
                const formData = new FormData();
                formData.append("file", submissionFile);
                
                const uploadRes = await axios.post("http://localhost:5002/api/upload", formData, {
                    headers: { 
                        "Content-Type": "multipart/form-data",
                        Authorization: `Bearer ${token}`
                    }
                });
                
                if (uploadRes.data.success) {
                    fileUrl = uploadRes.data.fileUrl;
                }
            }

            const res = await axios.post("http://localhost:5002/api/submissions/project", {
                taskId: selectedProject._id,
                milestoneId: activeMilestoneIndex + 1, // 1-indexed for backend readability
                bloomLevel: phase.bloomLevel,
                task: phase.task,
                code: submission,
                fileUrl: fileUrl,
                type: phase.type
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                alert(phase.type === "INFO" ? "Marked as read!" : "Sent for Review!");
                handleBack();
            }
        } catch (err) {
            alert("Error submitting: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!selectedProject) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans text-clay-text p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">Project Based Learning</h1>
                            <p className="text-clay-muted mt-2">Select a project to start working through its phases.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-20">Loading projects...</div>
                    ) : projects.length === 0 ? (
                        <div className="bg-white rounded-3xl shadow-sm border p-12 text-center text-clay-muted">
                            No projects assigned yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map(proj => (
                                <div 
                                    key={proj._id} 
                                    onClick={() => handleSelectProject(proj)}
                                    className="min-h-[220px] bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:border-purple-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                                                <Puzzle size={28} />
                                            </div>
                                            <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                                                {proj.phases?.length || 0} Phases
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-extrabold mb-2 text-slate-900 leading-tight">{proj.title}</h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 max-w-[85%]">{proj.description}</p>
                                    </div>
                                    
                                    <div className="absolute right-6 bottom-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <div className="p-3 rounded-full bg-purple-50 text-purple-600 shadow-sm border border-purple-100">
                                            <ChevronRight size={20} className="stroke-[3]" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const activePhase = selectedProject.phases[activeMilestoneIndex];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-clay-text p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSelectedProject(null)}
                        className="p-2 bg-white border rounded-full hover:bg-slate-100 transition text-clay-muted"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{selectedProject.title}</h1>
                        <p className="text-sm text-clay-muted">{selectedProject.topic}</p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border overflow-hidden min-h-[600px] flex">
                    <div className={`w-1/3 border-r  bg-slate-50/50 p-6 overflow-y-auto ${activeMilestoneIndex !== null ? 'hidden md:block' : 'w-full'}`}>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Puzzle size={20} className="text-green-600" /> Roadmap
                        </h2>
                        <div className="space-y-4">
                            {selectedProject.phases.map((item, index) => {
                                const status = getMilestoneStatus(index);
                                return (
                                    <div
                                        key={index}
                                        className={`p-5 rounded-2xl border transition-all duration-200 
                                            ${activeMilestoneIndex === index ? 'bg-white border-green-500 shadow-md ring-1 ring-green-100' : 'bg-white  hover:border-green-300'}
                                            ${status === 'locked' ? 'opacity-60 grayscale' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wide ${BLOOM_COLORS[item.bloomLevel] || "bg-slate-100"}`}>
                                                {item.bloomLevel}
                                            </span>
                                            {status === "completed" && <CheckCircle size={16} className="text-green-500" />}
                                            {status === "locked" && <Lock size={16} className="text-slate-300" />}
                                            {status === "pending" && <Clock size={16} className="text-yellow-500" />}
                                            {status === "rejected" && <XCircle size={16} className="text-red-500" />}
                                        </div>

                                        <h3 className="font-bold text-clay-text mb-1">{item.milestone}</h3>
                                        <p className="text-sm text-clay-muted mb-4">{item.task}</p>

                                        {status === "rejected" && submissionsMap[index]?.reviewFeedback && (
                                            <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-3 flex items-start gap-2">
                                                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                                {submissionsMap[index].reviewFeedback}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleStart(index, status)}
                                            disabled={status === "locked" || status === "pending"}
                                            className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2
                                                ${status === "locked" ? "bg-slate-100 text-clay-muted" :
                                                status === "pending" ? "bg-yellow-100 text-yellow-600" :
                                                "bg-black text-white hover:bg-slate-800"}
                                            `}
                                        >
                                            {status === "completed" ? "Review" :
                                                status === "pending" ? "Under Review" :
                                                status === "rejected" ? "Try Again" :
                                                "Start"} <ChevronRight size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {activePhase ? (
                        <div className="flex-1 p-8 flex flex-col">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-2">Phase {activeMilestoneIndex + 1}: {activePhase.milestone}</h2>
                                <p className="text-clay-muted">Task: {activePhase.task}</p>
                            </div>

                            <div className="flex-1 clay-card-flat border p-6 flex flex-col">
                                {activePhase.type === "INFO" && (
                                    <div className="prose prose-slate max-w-none">
                                        <ReactMarkdown>{activePhase.content}</ReactMarkdown>
                                    </div>
                                )}
                                {activePhase.type === "CODE" && (
                                    <div className="flex-1 flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-clay-secondary">Code Editor / Pseudocode</label>
                                        <textarea
                                            value={submission}
                                            onChange={(e) => setSubmission(e.target.value)}
                                            className="flex-1 w-full bg-slate-900 text-white font-mono text-sm p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                                            placeholder="// Start typing your solution..."
                                        />
                                    </div>
                                )}
                                {activePhase.type === "URL" && (
                                    <div className="flex flex-col gap-4 justify-center h-full">
                                        <div className="text-center">
                                            <h3 className="text-lg font-bold mb-2">Submit Project Link</h3>
                                            <p className="text-clay-muted text-sm mb-6">Deploy your project or push to GitHub and share the link here.</p>
                                        </div>
                                        <input
                                            type="url"
                                            placeholder="https://github.com/username/project"
                                            value={submission}
                                            onChange={(e) => setSubmission(e.target.value)}
                                            className="w-full p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 mb-6"
                                        />
                                        
                                        <div className="border-t pt-6">
                                            <p className="text-sm font-semibold text-clay-secondary mb-3">Or Upload Report / Diagram (PDF)</p>
                                            <input 
                                                type="file" 
                                                accept=".pdf" 
                                                onChange={e => setSubmissionFile(e.target.files[0])}
                                                className="block w-full text-sm text-clay-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-slate-800 cursor-pointer"
                                            />
                                            {submissionFile && (
                                                <p className="mt-2 text-xs text-green-600">Selected: {submissionFile.name}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end">
                                {activePhase.type === "INFO" ? (
                                    <button onClick={handleSubmit} className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:clay-tint-sky0 shadow-lg active:scale-95 transition">
                                        Mark as Read
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:clay-tint-mint0 shadow-lg active:scale-95 transition disabled:opacity-50"
                                    >
                                        {submitting ? "Processing..." : "Submit Task ✨"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:flex flex-1 items-center justify-center flex-col text-center p-12 text-clay-muted">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                <Puzzle size={40} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-clay-secondary mb-2">Select a Phase</h3>
                            <p>Choose a milestone from the Roadmap to start working.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
