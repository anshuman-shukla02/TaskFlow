import { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, CheckCircle, ChevronRight, Code, PlayCircle } from "lucide-react";
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

    /* ---------------- REAL NOTES FETCH ---------------- */
    const fetchNotes = async (topicId) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Please login to view notes");
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
            const token = localStorage.getItem("token");
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


    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col">
            {/* HEADER */}
            <header className="px-8 py-5 border-b sticky top-0 bg-white/80 backdrop-blur z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-black text-white rounded-lg">
                        <BookOpen size={20} />
                    </div>
                    <h1 className="text-xl font-bold">Adaptive Learning</h1>
                </div>
                {selectedTopic && (
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium">
                        Topic: {selectedTopic.title}
                    </span>
                )}
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-8">

                {/* VIEW: TOPIC SELECTION */}
                {view === "topics" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="text-center py-10">
                            <h2 className="text-4xl font-extrabold mb-4">What do you want to master today?</h2>
                            <p className="text-slate-500 text-lg">Select a topic to start your personalized learning journey.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {TOPICS.map(topic => (
                                <div
                                    key={topic.id}
                                    onClick={() => handleTopicSelect(topic)}
                                    className="bg-slate-50 hover:bg-white hover:shadow-xl border border-transparent hover:border-slate-100 rounded-3xl p-8 cursor-pointer transition-all duration-300 group"
                                >
                                    <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition">{topic.title}</h3>
                                    <p className="text-slate-500 leading-relaxed mb-6">{topic.desc}</p>
                                    <div className="flex items-center gap-2 font-medium text-sm group-hover:translate-x-2 transition p-0">
                                        Start Learning <ChevronRight size={16} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* VIEW: NOTES */}
                {view === "notes" && notes && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <button onClick={() => setView("topics")} className="text-sm text-slate-400 hover:text-black mb-4">← Back to topics</button>
                            <h2 className="text-3xl font-bold">Key Concepts: {selectedTopic.title}</h2>
                        </div>

                        <div className="space-y-6">
                            {notes.map((note, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl flex gap-4"
                                >
                                    <div className="mt-1 text-blue-600 flex-shrink-0">
                                        <CheckCircle size={20} />
                                    </div>
                                    <div className="text-lg text-slate-700 font-medium leading-relaxed prose prose-blue max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note}</ReactMarkdown>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-12 flex justify-end">
                            <button
                                onClick={handleNotesCompleted}
                                className="px-8 py-4 bg-black text-white text-lg font-bold rounded-full hover:scale-105 active:scale-95 transition shadow-lg flex items-center gap-3"
                            >
                                Detailed Notes Read - Practice Now <ChevronRight />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* VIEW: QUESTIONS (LEETCODE STYLE) */}
                {view === "questions" && currentQuestion && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[80vh] flex gap-6">
                        {/* Left: Problem Description */}
                        <div className="flex-1 bg-white border rounded-2xl p-6 overflow-y-auto shadow-sm relative">
                            {warnings > 0 && (
                                <div className="absolute top-4 right-4 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                    Warning {warnings}/2
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold">{currentQuestion.id}. {currentQuestion.title}</h2>
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    {currentQuestion.difficulty}
                                </span>
                            </div>

                            <div className="prose prose-slate max-w-none">
                                <p>{currentQuestion.description}</p>

                                <h3 className="font-bold mt-6 mb-2">Examples</h3>
                                {currentQuestion.examples.map((ex, i) => (
                                    <div key={i} className="bg-slate-50 p-4 rounded-lg font-mono text-sm border">
                                        <p><span className="font-semibold text-slate-500">Input:</span> {ex.input}</p>
                                        <p><span className="font-semibold text-slate-500">Output:</span> {ex.output}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Code Editor (Mock) */}
                        <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-xl text-white">
                            <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2 text-sm text-slate-400">
                                <Code size={16} /> JavaScript
                            </div>
                            <textarea
                                className="flex-1 bg-slate-900 p-4 font-mono text-sm focus:outline-none resize-none text-slate-300"
                                defaultValue={`function twoSum(nums, target) {
  // Write your code here
}`}
                            />
                            <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-3">
                                <button className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 text-slate-300 transition">Run Code</button>
                                <button className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 transition flex items-center gap-2">
                                    Submit <PlayCircle size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
