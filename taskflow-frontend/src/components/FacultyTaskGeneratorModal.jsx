import { useState, useEffect } from "react";
import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { Sparkles, X, Loader2, BookOpen, Layers, CheckCircle2, Rocket, FileText, Zap, AlertTriangle } from "lucide-react";

export default function FacultyTaskGeneratorModal({ isOpen, onClose, onTaskCreated }) {
  const [sourceType, setSourceType] = useState("topic"); // "topic" | "material"
  const [topic, setTopic] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [bloomLevel, setBloomLevel] = useState("CREATE");
  const [difficulty, setDifficulty] = useState("medium");
  const [type, setType] = useState("project"); // "task" | "project"
  
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchMaterials();
      setErrorMsg(null);
    }
  }, [isOpen]);

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${API_URL}/api/materials`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setMaterials(data.materials || []);
      if (data.materials?.length > 0 && !materialId) {
        setMaterialId(data.materials[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    }
  };

  const handleGenerate = async () => {
    if (sourceType === "topic" && !topic.trim()) {
      setErrorMsg("Please enter a topic prompt.");
      return;
    }
    if (sourceType === "material" && !materialId) {
      setErrorMsg("Please select a study material.");
      return;
    }

    setGenerating(true);
    setDraft(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/tasks/ai-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          sourceType,
          topic,
          materialId,
          bloomLevel,
          difficulty,
          type,
        }),
      });

      const data = await res.json();
      if (data.success && data.draft) {
        setDraft(data.draft);
      } else {
        setErrorMsg(data.message || "Failed to generate AI task draft.");
      }
    } catch (err) {
      console.error("AI Task Generation error:", err);
      setErrorMsg("Network error while generating task.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    setPublishing(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/tasks/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          topic: draft.topic,
          difficulty: draft.difficulty,
          type: draft.type,
          bloomLevel: draft.bloomLevel,
          phases: draft.phases || [],
          questions: draft.questions || [],
          hasMarks: draft.hasMarks !== undefined ? draft.hasMarks : true,
          singleMarks: draft.singleMarks || 20,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onTaskCreated) onTaskCreated(data.task);
        onClose();
      } else {
        setErrorMsg(data.message || "Failed to publish task.");
      }
    } catch (err) {
      console.error("Publish task error:", err);
      setErrorMsg("Network error while publishing task. Please try again.");
    } finally {
      setPublishing(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Sparkles className="text-amber-300 animate-spin" style={{ animationDuration: "8s" }} size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">AI Exam & Capstone Generator</h2>
              <p className="text-xs text-purple-200">Automatically build Bloom's Taxonomy multi-phase projects & tasks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-purple-200 hover:text-white rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-extrabold text-rose-900">AI Task Generation Notice</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Controls Form (Shown if no draft generated yet) */}
          {!draft && (
            <div className="space-y-5">
              
              {/* Source Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Select Generation Source
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSourceType("topic")}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border text-sm font-semibold transition ${
                      sourceType === "topic"
                        ? "bg-purple-50 border-purple-500 text-purple-700 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Zap size={16} /> Custom Topic Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("material")}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border text-sm font-semibold transition ${
                      sourceType === "material"
                        ? "bg-purple-50 border-purple-500 text-purple-700 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen size={16} /> From Uploaded Study Material
                  </button>
                </div>
              </div>

              {/* Source Specific Field */}
              {sourceType === "topic" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Topic / Concept Prompt
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Key-Value Store & Raft Consensus"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Uploaded Study Material
                  </label>
                  <select
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    {materials.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.title} ({m.fileType?.toUpperCase() || "FILE"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Task Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assessment Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="project">🏆 Multi-Phase Capstone Project</option>
                    <option value="task">📝 Single Problem / Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Bloom's Level
                  </label>
                  <select
                    value={bloomLevel}
                    onChange={(e) => setBloomLevel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="REMEMBER">Remember</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYZE">Analyze</option>
                    <option value="EVALUATE">Evaluate</option>
                    <option value="CREATE">Create (Capstone)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Designing Project & 4 Gated Milestones via Gemini AI (approx. 15-20s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>✨ Generate Task with AI</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Generated Draft Live Preview Card */}
          {draft && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-purple-50 border border-purple-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2 text-purple-700 text-xs font-bold">
                  <CheckCircle2 size={16} /> AI Generated Draft Ready for Review
                </div>
                <button
                  onClick={() => setDraft(null)}
                  className="text-xs text-purple-700 underline font-semibold hover:text-purple-900"
                >
                  Re-generate
                </button>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                    {draft.bloomLevel}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold uppercase">
                    {draft.type} • {draft.difficulty}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900">{draft.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{draft.description}</p>
              </div>

              {/* Multi-Phase Milestones List */}
              {draft.phases && draft.phases.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <Layers size={14} className="text-purple-600" />
                    Gated Project Milestones ({draft.phases.length} Phases)
                  </h4>
                  <div className="space-y-2">
                    {draft.phases.map((p, idx) => (
                      <div key={idx} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-start gap-3 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                          P{idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-800">{p.milestone}</span>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              [{p.type}] {p.bloomLevel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{p.task}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Publish Action */}
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Publishing Task...</span>
                  </>
                ) : (
                  <>
                    <Rocket size={18} />
                    <span>🚀 Publish Task to Students</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
