import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, CheckCircle, ChevronRight, Code, PlayCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TOPICS = [
    { id: "arrays", title: "Arrays", desc: "Fundamental data structure for storing elements sequentially." },
    { id: "linked-lists", title: "Linked Lists", desc: "Linear collection of data elements called nodes." },
    { id: "trees", title: "Trees", desc: "Hierarchical data structure with a root value and subtrees." },
];

export default function AdaptiveLearning() {
    const [view, setView] = useState("topics"); // topics | notes | questions
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [notes, setNotes] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [loadingTopic, setLoadingTopic] = useState(null);

    /* ---------------- REAL NOTES FETCH ---------------- */
    const fetchNotes = async (topicId) => {
        try {
            setLoadingTopic(topicId);
            const token = getToken();
            if (!token) {
                alert("Please login to view notes");
                setLoadingTopic(null);
                return;
            }

            const res = await axios.get(`http://localhost:5002/api/topics/${topicId}/notes`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Backend returns { topic: "...", notes: ["...", "..."] }
            if (res.data && res.data.notes) {
                setNotes(res.data.notes);
            } else {
                setNotes(["No notes available for this topic."]);
            }
            setView("notes");
        } catch (err) {
            console.error("Failed to fetch notes", err);
            alert("Failed to load notes. Please ensure backend is running.");
        } finally {
            setLoadingTopic(null);
        }
    };

    const handleTopicSelect = (topic) => {
        setSelectedTopic(topic);
        fetchNotes(topic.id);
    };

    const handleNotesCompleted = () => {
        // Mark as viewed: axios.post(`/api/topics/${selectedTopic.id}/mark-viewed`)
        setView("questions");
        // Load first question
        setCurrentQuestion({
            id: 1,
            title: "Two Sum",
            difficulty: "Easy",
            description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
            examples: [
                { input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }
            ]
        });
    };

    /* ---------------- PROCTORING LOGIC ---------------- */
    const [warnings, setWarnings] = useState(0);
    const [isTerminated, setIsTerminated] = useState(false);
    const [tabSwitchTimer, setTabSwitchTimer] = useState(null);

    useEffect(() => {
        // Only active during "questions" view
        if (view !== "questions" || isTerminated) return;

        const handleVisibilityChange = (e) => {
            const isHidden = document.hidden || e?.type === "blur";

            if (isHidden) {
                // Tab hidden or Window minimized: Start 10s timer
                console.log("Tab hidden/blurred, starting timer...");
                // Only start timer if not already running
                if (tabSwitchTimer) return;

                const timer = setTimeout(() => {
                    handleViolation();
                    setTabSwitchTimer(null); // Clear timer ref after violation fired
                }, 10000); // 10 seconds
                setTabSwitchTimer(timer);
            } else {
                // Tab visible: Clear timer
                console.log("Tab visible/focused, clearing timer...");
                if (tabSwitchTimer) {
                    clearTimeout(tabSwitchTimer);
                    setTabSwitchTimer(null);
                }
            }
        };

        const handleViolation = () => {
            setWarnings(prev => {
                const newCount = prev + 1;
                if (newCount > 2) {
                    terminateSession();
                    return newCount;
                }
                alert(`Warning ${newCount}/2: You have been away for too long! Continued absence will terminate your session.`);
                return newCount;
            });
        };

        const terminateSession = () => {
            setIsTerminated(true);
            alert("Session Terminated: You exceeded the allowed tab switches/time away.");

            // Reset Progress Logic (Penalty)
            const token = getToken();
            if (token && selectedTopic) {
                axios.post(
                    "http://localhost:5002/api/progress/reset",
                    { topic: selectedTopic.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(err => console.error("Failed to penalize:", err));
            }

            setView("topics");
            setCurrentQuestion(null);
            setWarnings(0);
            setIsTerminated(false);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleVisibilityChange); // Handle minimize/focus loss
        window.addEventListener("focus", handleVisibilityChange); // Clear timer on return

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleVisibilityChange);
            window.removeEventListener("focus", handleVisibilityChange);
            if (tabSwitchTimer) clearTimeout(tabSwitchTimer);
        };
    }, [view, isTerminated, tabSwitchTimer]);

    const handleRunCode = () => {
        alert("Code running... Tests passed!");
    };

    const handleSubmitCode = () => {
        alert("Solution submitted successfully! You have completed this topic.");
        // Mark as completed and return to topics view
        setView("topics");
        setCurrentQuestion(null);
        setSelectedTopic(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-clay-text flex flex-col">
            <main className="flex-1 max-w-6xl mx-auto w-full p-8 pb-20 pt-10">

                {/* VIEW: TOPIC SELECTION */}
                {view === "topics" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="text-center py-12">
                            <h2 className="text-4xl font-extrabold mb-4 tracking-tight">What do you want to master today?</h2>
                            <p className="text-clay-muted text-lg max-w-2xl mx-auto">Select a topic to start your personalized learning journey. Notes are dynamically tailored using AI.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {TOPICS.map(topic => (
                                <div
                                    key={topic.id}
                                    onClick={() => handleTopicSelect(topic)}
                                    className="bg-white hover:shadow-xl border hover:border-blue-200 rounded-3xl p-8 cursor-pointer transition-all duration-300 group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full clay-tint-sky0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-600 transition">{topic.title}</h3>
                                    <p className="text-clay-muted leading-relaxed mb-6">{topic.desc}</p>
                                    <div className="flex items-center gap-2 font-bold focus:outline-none text-sm text-purple-600 group-hover:translate-x-2 transition p-0">
                                        {loadingTopic === topic.id ? (
                                            <><Loader2 size={16} className="animate-spin" /> Generating AI Notes...</>
                                        ) : (
                                            <>Start Learning <ChevronRight size={16} /></>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* VIEW: NOTES */}
                {view === "notes" && notes && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
                        <div className="mb-10 block">
                            <button onClick={() => { setView("topics"); setSelectedTopic(null); }} className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold text-clay-secondary hover:bg-slate-50 transition mb-6 shadow-sm">
                                ← Back to topics
                            </button>
                            <h2 className="text-4xl font-extrabold tracking-tight">Key Concepts: {selectedTopic.title}</h2>
                        </div>

                        <div className="space-y-5">
                            {notes.map((note, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white border shadow-sm p-6 rounded-2xl flex gap-5 hover:border-blue-200 transition"
                                >
                                    <div className="mt-1 text-blue-500 flex-shrink-0 clay-tint-sky p-1.5 rounded-full h-fit">
                                        <CheckCircle size={22} className="opacity-80" />
                                    </div>
                                    <div className="text-clay-secondary font-medium leading-relaxed prose prose-slate max-w-none text-lg">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note}</ReactMarkdown>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-14 flex justify-end">
                            <button
                                onClick={handleNotesCompleted}
                                className="px-10 py-4 bg-purple-600 focus:outline-none text-white text-lg font-bold rounded-2xl hover:bg-blue-700 hover:shadow-xl active:scale-[0.98] transition-all flex items-center gap-3"
                            >
                                Detailed Notes Read — Practice Now <ChevronRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* VIEW: QUESTIONS (LEETCODE STYLE) */}
                {view === "questions" && currentQuestion && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[75vh] flex gap-6">
                        {/* Left: Problem Description */}
                        <div className="flex-1 bg-white border rounded-3xl p-8 overflow-y-auto shadow-sm relative">
                            {warnings > 0 && (
                                <div className="absolute top-4 right-4 bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse border border-red-200">
                                    Warning {warnings}/2
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-6 pb-6 border-b ">
                                <h2 className="text-3xl font-extrabold tracking-tight">{currentQuestion.id}. {currentQuestion.title}</h2>
                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'} border`}>
                                    {currentQuestion.difficulty}
                                </span>
                            </div>

                            <div className="prose prose-slate max-w-none text-base">
                                <p className="text-clay-secondary leading-relaxed text-lg">{currentQuestion.description}</p>

                                <h3 className="font-bold text-xl mt-8 mb-4 border-b  pb-2">Examples</h3>
                                {currentQuestion.examples.map((ex, i) => (
                                    <div key={i} className="bg-slate-50 p-5 rounded-xl font-mono text-sm border shadow-inner mb-4">
                                        <p className="mb-2"><span className="font-bold text-clay-muted uppercase tracking-widest text-xs mr-2">Input:</span> <span className="text-clay-text">{ex.input}</span></p>
                                        <p><span className="font-bold text-clay-muted uppercase tracking-widest text-xs mr-2">Output:</span> <span className="text-purple-600 font-bold">{ex.output}</span></p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Code Editor (Mock) */}
                        <div className="flex-1 flex flex-col bg-[#0d1117] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-white">
                            <div className="p-4 bg-[#161b22] border-b border-slate-800 flex items-center gap-3 text-sm font-semibold text-slate-300">
                                <Code size={18} className="text-blue-400" /> JavaScript Solution
                            </div>
                            <textarea
                                className="flex-1 bg-transparent p-6 font-mono text-sm focus:outline-none resize-none text-slate-300 leading-loose selection:clay-tint-sky0/30"
                                defaultValue={`function twoSum(nums, target) {\n  // Write your code here\n  \n\n\n}`}
                            />
                            <div className="p-5 bg-[#161b22] border-t border-slate-800 flex justify-end gap-3">
                                <button onClick={handleRunCode} className="px-6 py-2.5 rounded-xl border border-slate-700 bg-slate-800 focus:outline-none text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition">Run Code</button>
                                <button onClick={handleSubmitCode} className="px-8 py-2.5 bg-green-600 shadow-lg shadow-green-900/20 text-white rounded-xl text-sm font-bold hover:clay-tint-mint0 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                    Submit <PlayCircle size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
