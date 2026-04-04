import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, CheckCircle, ChevronRight, Code, PlayCircle, Loader2, Lightbulb, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TOPICS = [
    { id: "arrays", title: "Arrays", desc: "Fundamental data structure for storing elements sequentially." },
    { id: "strings", title: "Strings", desc: "Sequence of characters, foundational for text processing and manipulation." },
    { id: "linked-lists", title: "Linked Lists", desc: "Linear collection of non-contiguous data elements called nodes." },
    { id: "stacks-queues", title: "Stacks & Queues", desc: "LIFO and FIFO data structures for sequence management." },
    { id: "trees", title: "Trees", desc: "Hierarchical data structure composed of a root and subtrees." },
    { id: "graphs", title: "Graphs", desc: "Non-linear data structure consisting of nodes and interconnected edges." },
    { id: "dynamic-programming", title: "Dynamic P.", desc: "Advanced algorithmic technique for solving optimization problems." },
];

export default function AdaptiveLearning() {
    const [view, setView] = useState("topics"); // topics | notes | questions
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [notes, setNotes] = useState(null);
    const [notePage, setNotePage] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [unlockedHints, setUnlockedHints] = useState([]);
    const [loadingTopic, setLoadingTopic] = useState(null);

    /* ---------------- COMPILER LOGIC ---------------- */
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState(`function twoSum(nums, target) {\n  // Write your code here\n  \n\n\n}`);
    const [output, setOutput] = useState(null); // { text, time, error }
    const [isExecuting, setIsExecuting] = useState(false);

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

            // Backend returns { topic: "...", notes: [["...", "..."], ["..."]] }
            if (res.data && res.data.notes) {
                // Compatibility check if old AI data or fallback
                const fetchedNotes = res.data.notes;
                if (fetchedNotes.length > 0 && typeof fetchedNotes[0] === 'string') {
                    setNotes([fetchedNotes]); // Wrap legacy 1D array in a 2D array page
                } else {
                    setNotes(fetchedNotes);
                }
            } else {
                setNotes([["No notes available for this topic."]]);
            }
            setNotePage(0);
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

    const handleNotesCompleted = async () => {
        // Mark as viewed: axios.post(`/api/topics/${selectedTopic.id}/mark-viewed`)
        try {
            const token = getToken();
            const res = await axios.post(`http://localhost:5002/api/adaptive/next-question`, {
                topicId: selectedTopic.id,
                currentQuestionId: null,
                executionTime: null
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            if (res.data.completed) {
                alert(`🏅 ${res.data.feedback}`);
                setView("topics");
                setSelectedTopic(null);
                return;
            }

            if (res.data.success && res.data.question) {
                setView("questions");
                setCurrentQuestion(res.data.question);
                setUnlockedHints([]);
                const mapping = {
                    'javascript': res.data.question.defaultCodeJS,
                    'python': res.data.question.defaultCodePY,
                    'c': res.data.question.defaultCodeC,
                    'cpp': res.data.question.defaultCodeCPP,
                    'java': res.data.question.defaultCodeJAVA,
                };
                setCode(mapping[language] || res.data.question.defaultCodeJS);
            }
        } catch (err) {
            console.error("Failed to fetch adaptive problem:", err);
            alert("Could not load the next topic question.");
        }
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
            setUnlockedHints([]);
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

    const handleRunCode = async () => {
        setIsExecuting(true);
        setOutput({ text: "Compiling in secure Docker Sandbox...", time: null, error: false });
        try {
            const token = getToken();
            const res = await axios.post("http://localhost:5002/api/compiler/execute", {
                code,
                language,
                questionId: currentQuestion?.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setOutput({ text: res.data.output || "Execution finished (No Output)", time: res.data.executionTime, error: false });
            } else {
                setOutput({ text: res.data.output || res.data.message || "Execution Failed", time: res.data.executionTime, error: true });
            }
        } catch (err) {
            console.error(err);
            setOutput({ text: "Server error or timeout. Ensure Docker Desktop is running.", time: null, error: true });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleSubmitCode = async () => {
        setIsExecuting(true);
        setOutput({ text: "Evaluating submission for correctness...", time: null, error: false });
        
        try {
            const token = getToken();
            const res = await axios.post("http://localhost:5002/api/compiler/execute", {
                code,
                language,
                questionId: currentQuestion?.id
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            const passed = !res.data.isError && res.data.output && !res.data.output.includes("Error");
            
            if (!passed) {
                setOutput({ text: "Submission failed test cases:\n" + res.data.output, time: res.data.executionTime, error: true });
                return;
            }

            setOutput({ text: "All tests passed! Consulting adaptive AI for your next challenge...", time: res.data.executionTime, error: false });
            
            const adaptiveRes = await axios.post(`http://localhost:5002/api/adaptive/next-question`, {
                topicId: selectedTopic.id,
                currentQuestionId: currentQuestion.id,
                executionTime: res.data.executionTime,
                hintsUsed: unlockedHints.length
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            if (adaptiveRes.data.success) {
                if (adaptiveRes.data.completed) {
                    alert(`Topic Completed! Feedback: ${adaptiveRes.data.feedback}`);
                    setView("topics");
                    setCurrentQuestion(null);
                    setSelectedTopic(null);
                } else {
                    alert(`Level Up! AI Feedback: ${adaptiveRes.data.feedback}`);
                    setCurrentQuestion(adaptiveRes.data.question);
                    setUnlockedHints([]);
                    const mapping = {
                        'javascript': adaptiveRes.data.question.defaultCodeJS,
                        'python': adaptiveRes.data.question.defaultCodePY,
                        'c': adaptiveRes.data.question.defaultCodeC,
                        'cpp': adaptiveRes.data.question.defaultCodeCPP,
                        'java': adaptiveRes.data.question.defaultCodeJAVA,
                    };
                    setCode(mapping[language] || adaptiveRes.data.question.defaultCodeJS);
                    setOutput(null);
                }
            }
        } catch (err) {
            console.error(err);
            setOutput({ text: "Server error during submission.", time: null, error: true });
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="h-screen w-full bg-slate-50 font-sans text-clay-text flex flex-col overflow-hidden">
            <main className={`flex-1 w-full flex flex-col min-h-0 ${view !== "questions" ? "max-w-6xl mx-auto p-8 pb-20 pt-10 overflow-y-auto" : "p-4"}`}>

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

                        <div className="space-y-5 min-h-[300px]">
                            {notes[notePage]?.map((note, idx) => (
                                <motion.div
                                    key={`page-${notePage}-note-${idx}`}
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

                        <div className="mt-14 flex items-center justify-between border-t pt-8">
                            <div className="flex gap-2">
                                {notes.map((_, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setNotePage(i)}
                                        className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${notePage === i ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20 scale-110' : 'bg-white border text-clay-secondary hover:bg-slate-50 hover:border-purple-300 hover:text-purple-600'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>

                            {notePage < notes.length - 1 ? (
                                <button
                                    onClick={() => setNotePage(prev => prev + 1)}
                                    className="px-8 py-3.5 bg-white border border-purple-200 text-purple-700 text-lg font-bold rounded-2xl hover:bg-purple-50 transition flex items-center gap-2 shadow-sm"
                                >
                                    Next Page <ChevronRight size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleNotesCompleted}
                                    className="px-10 py-4 bg-purple-600 focus:outline-none text-white text-lg font-bold rounded-2xl hover:bg-blue-700 hover:shadow-xl active:scale-[0.98] transition-all flex items-center gap-3 shadow-purple-900/20"
                                >
                                    Finished — Practice Now <ChevronRight size={20} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* VIEW: QUESTIONS (LEETCODE STYLE) */}
                {view === "questions" && currentQuestion && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 w-full h-full min-h-0">
                        <PanelGroup direction="horizontal" orientation="horizontal" className="h-full w-full">
                            {/* Left: Problem Description */}
                            <Panel defaultSize={45} minSize={30} className="bg-white border rounded-3xl p-8 overflow-y-auto shadow-sm relative h-full">
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

                                {currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="font-bold text-xl mb-4 border-b pb-2">Constraints</h3>
                                        <ul className="list-disc pl-5 text-clay-secondary space-y-2 text-sm font-mono bg-slate-50 p-5 rounded-xl border shadow-inner">
                                            {currentQuestion.constraints.map((c, i) => (
                                                <li key={i}>{c}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                                    <div className="mt-10 flex flex-col gap-3">
                                        <h3 className="font-bold text-xl mb-2 flex items-center gap-2"><Lightbulb size={20} className="text-yellow-500"/> Hints</h3>
                                        {currentQuestion.hints.map((hint, i) => {
                                            const isUnlocked = unlockedHints.includes(i);
                                            // Only show the next hint to unlock if the previous is unlocked (or if it's the first hint)
                                            const canUnlock = i === 0 || unlockedHints.includes(i - 1);
                                            
                                            if (!canUnlock && !isUnlocked) return null;

                                            return (
                                                <div key={i} className="w-full">
                                                    {isUnlocked ? (
                                                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm text-clay-secondary shadow-sm flex gap-3 leading-relaxed transition-all">
                                                            <span className="font-bold text-yellow-600 shrink-0">Hint {i + 1}:</span>
                                                            <span>{hint}</span>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.target.blur();
                                                                setUnlockedHints([...unlockedHints, i]);
                                                            }}
                                                            className="w-full bg-white border border-slate-200 p-4 rounded-xl text-left text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-purple-600 transition flex items-center justify-between"
                                                        >
                                                            <span>Click to unlock Hint {i + 1}</span>
                                                            <Lock size={16} className="opacity-50" />
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            </Panel>

                            <PanelResizeHandle className="w-6 flex flex-col justify-center items-center group cursor-col-resize relative outline-none">
                                <div className="w-1.5 h-16 bg-slate-300 rounded-full group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors shadow-sm" />
                            </PanelResizeHandle>

                            {/* Right: Code Editor & Output */}
                            <Panel defaultSize={55} minSize={30} className="flex flex-col bg-[#0d1117] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-white h-full">
                            <PanelGroup direction="vertical" orientation="vertical" className="w-full h-full">
                                <Panel defaultSize={70} minSize={20} className="flex flex-col relative h-full">
                                {/* Editor Header */}
                                <div className="p-4 bg-[#161b22] border-b border-slate-800 flex justify-between items-center text-sm font-semibold text-slate-300 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <Code size={18} className="text-blue-400" />
                                        <select 
                                            value={language} 
                                            onChange={(e) => {
                                                const newLang = e.target.value;
                                                setLanguage(newLang);
                                                if (currentQuestion) {
                                                    const mapping = {
                                                        'javascript': currentQuestion.defaultCodeJS,
                                                        'python': currentQuestion.defaultCodePY,
                                                        'c': currentQuestion.defaultCodeC,
                                                        'cpp': currentQuestion.defaultCodeCPP,
                                                        'java': currentQuestion.defaultCodeJAVA,
                                                    };
                                                    setCode(mapping[newLang] || "");
                                                }
                                            }}
                                            className="bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                            <option value="javascript">JavaScript (Node.js)</option>
                                            <option value="python">Python (3.9)</option>
                                            <option value="c">C (GCC)</option>
                                            <option value="cpp">C++ (GCC)</option>
                                            <option value="java">Java (JDK)</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Editor Body */}
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="flex-1 bg-transparent p-6 font-mono text-sm focus:outline-none resize-none text-slate-300 leading-loose selection:bg-blue-900/50"
                                    spellCheck={false}
                                />
                                </Panel>

                                <PanelResizeHandle className="h-4 flex justify-center items-center group cursor-row-resize relative outline-none bg-[#161b22] border-t border-b border-slate-800 z-10 hover:bg-[#1d232b] transition-colors">
                                    <div className="h-1 w-16 bg-slate-600 rounded-full group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors shadow-sm" />
                                </PanelResizeHandle>

                                <Panel defaultSize={30} minSize={15} className="flex flex-col h-full bg-[#0d1117]">
                                {/* Output Console */}
                                <div className="flex-1 p-5 overflow-y-auto font-mono text-sm shrink-0">
                                {output ? (
                                    <div className={output.error ? "text-rose-400" : "text-emerald-400"}>
                                        <p className="mb-2 uppercase text-xs tracking-widest text-slate-500 font-bold flex items-center gap-2">
                                            Execution Result
                                            {output.time && <span className="text-slate-600 lowercase bg-slate-900 px-2 py-0.5 rounded-full">{output.time}ms</span>}
                                        </p>
                                        <pre className="whitespace-pre-wrap font-mono mt-1">{output.text}</pre>
                                    </div>
                                ) : (
                                    <div className="text-slate-600 italic mt-2">Ready for execution...</div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="p-5 bg-[#161b22] border-t border-slate-800 flex justify-end gap-3 shrink-0">
                                <button 
                                    onClick={handleRunCode} 
                                    disabled={isExecuting}
                                    className="px-6 py-2.5 rounded-xl border border-slate-700 bg-slate-800 focus:outline-none text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isExecuting && <Loader2 size={16} className="animate-spin" />} Run Code
                                </button>
                                <button 
                                    onClick={handleSubmitCode} 
                                    disabled={isExecuting}
                                    className="px-8 py-2.5 bg-green-600 shadow-lg shadow-green-900/20 text-white rounded-xl text-sm font-bold hover:bg-green-500 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                >
                                    Submit <PlayCircle size={18} />
                                </button>
                            </div>
                            </Panel>
                        </PanelGroup>
                            </Panel>
                        </PanelGroup>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
