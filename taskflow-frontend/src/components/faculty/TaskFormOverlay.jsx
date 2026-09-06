import { useState } from "react";
import {
  ArrowLeft, Save, Plus, ChevronLeft, ChevronRight, BarChart2,
  Trash2, Layers, Sparkles
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/* ── Default Capstone Project Phases ─────────────────────────── */
export const DEFAULT_PROJECT_PHASES = [
  {
    milestone: "Phase 1: Project Overview & System Specifications",
    task: "Review system requirements, dataset schemas, and architectural guidelines.",
    content: "### Project Architecture & Guidelines\nProvide detailed guidelines, architectural instructions, and data models here.",
    type: "INFO",
    bloomLevel: "REMEMBER"
  },
  {
    milestone: "Phase 2: Pseudocode & Logic Design Proposal",
    task: "Write a high-level pseudocode proposal detailing your core algorithms and design patterns.",
    content: "Submit your pseudocode logic and architectural proposal for faculty review.",
    type: "CODE",
    bloomLevel: "UNDERSTAND"
  },
  {
    milestone: "Phase 3: Core Implementation & Use Case Code",
    task: "Implement the complete solution code for all core use cases.",
    content: "Write and execute your implementation code.",
    type: "CODE",
    bloomLevel: "APPLY"
  },
  {
    milestone: "Phase 4: Final Deliverable - GitHub Repo & Live Demo Link",
    task: "Submit your public GitHub repository URL and live deployed application URL.",
    content: "Provide your repository URL and live demo link.",
    type: "URL",
    bloomLevel: "CREATE"
  }
];

/* ── Shared constants ───────────────────────────────────────── */
export const EMPTY_TASK = {
  title: "",
  description: "",
  topic: "",
  difficulty: "medium",
  type: "task",
  bloomLevel: "REMEMBER",
  taskMode: "single",   // "single" | "questions"
  hasMarks: true,
  singleMarks: 25,      // marks for single-mode graded tasks
  dueDate: null,
  questions: [],
  phases: DEFAULT_PROJECT_PHASES,
};

export const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "code-block"],
    ["clean"],
  ],
};

/** Strip blank questions before API call */
export const sanitiseQuestions = (form) => {
  if (form.taskMode !== "questions") return [];
  return (form.questions || []).filter(
    (q) => q.text && q.text.trim() !== "" && q.text !== "<p><br></p>"
  );
};

/* ── PhaseEditor (For Capstone Projects) ───────────────────── */
function extractPlainText(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function PhaseEditor({ phases = [], activeIdx = 0, onNavigate, onChange, onAdd, onRemove }) {
  const currentPhases = (phases && phases.length > 0) ? phases : DEFAULT_PROJECT_PHASES;
  const phase = currentPhases[activeIdx] || currentPhases[0] || {
    milestone: `Phase ${activeIdx + 1}`,
    task: "",
    content: "",
    type: "CODE",
    bloomLevel: "APPLY"
  };
  const total = currentPhases.length;

  const handleContentChange = (content) => {
    const plainText = extractPlainText(content);
    const autoTask = plainText.length > 0 ? (plainText.slice(0, 140) + (plainText.length > 140 ? "..." : "")) : phase.milestone;
    onChange(activeIdx, {
      ...phase,
      content: content,
      task: autoTask
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Horizontal Phase Tabs */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shrink-0 gap-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {currentPhases.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(i)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                i === activeIdx
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
              }`}
            >
              <span>Phase {i + 1}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${i === activeIdx ? "bg-purple-700 text-purple-100" : "bg-slate-100 text-slate-500"}`}>
                {p.type}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition border border-purple-200 ml-1"
          >
            <Plus size={14} /> Add Phase
          </button>
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(activeIdx)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition border border-rose-200"
          >
            <Trash2 size={13} /> Delete Phase {activeIdx + 1}
          </button>
        )}
      </div>

      {/* Phase Settings Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Phase Title / Milestone Name
            </label>
            <input
              type="text"
              value={phase.milestone || ""}
              onChange={(e) => onChange(activeIdx, { ...phase, milestone: e.target.value })}
              placeholder="e.g. Phase 1: Architecture & Guidelines"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Phase Type / Expected Output
            </label>
            <select
              value={phase.type || "CODE"}
              onChange={(e) => onChange(activeIdx, { ...phase, type: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="INFO">INFO (Read-only Guidelines)</option>
              <option value="CODE">CODE (Pseudocode / Solution Code)</option>
              <option value="URL">URL (GitHub Repo / Live Demo Link)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Bloom's Taxonomy Level
            </label>
            <select
              value={phase.bloomLevel || "REMEMBER"}
              onChange={(e) => onChange(activeIdx, { ...phase, bloomLevel: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="REMEMBER">REMEMBER</option>
              <option value="UNDERSTAND">UNDERSTAND</option>
              <option value="APPLY">APPLY</option>
              <option value="ANALYZE">ANALYZE</option>
              <option value="EVALUATE">EVALUATE</option>
              <option value="CREATE">CREATE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Phase Main Rich-Text Writing Box (Quill Editor) */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1 min-h-[440px]">
          <div className="px-5 py-3 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
            <span className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-purple-600" /> Phase {activeIdx + 1} Review Requirements & Instructions (Formatted Content)
            </span>
            <span className="text-[11px] text-purple-700 font-semibold">
              Supports Bold, Italic, URLs/Links, Bullet Lists, Headers & Code
            </span>
          </div>
          <ReactQuill
            theme="snow"
            value={phase.content || ""}
            onChange={handleContentChange}
            className="flex-1 flex flex-col bg-white text-sm border-none"
            placeholder="Write full phase requirements, architectural specs, links, bullet points, and code samples here..."
            modules={QUILL_MODULES}
          />
        </div>
      </div>
    </div>
  );
}

/* ── QuestionEditor ─────────────────────────────────────────── */
function QuestionEditor({ questions, activeIdx, onNavigate, onChange, onAdd, onRemove, hasMarks }) {
  const q = questions[activeIdx] || { text: "", marks: 1 };
  const total = questions.length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
      {/* ── Question Nav Bar (Horizontal) ── */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0 gap-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(i)}
              className={`shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                i === activeIdx
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-500 hover:bg-slate-100 border-slate-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition border border-slate-200 ml-1"
          >
            <Plus size={14} /> Add Q
          </button>
        </div>
        
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(activeIdx)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg transition hover:bg-rose-100 border border-rose-100"
          >
            <Trash2 size={13} /> Remove Q{activeIdx + 1}
          </button>
        )}
      </div>

      {/* ── Question Content ── */}
      <div className="flex-1 flex flex-col px-6 py-6 overflow-hidden">
        <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[480px]">
          
          {/* Active Question Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold text-slate-800">Question {activeIdx + 1}</span>
            </div>
            {hasMarks && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Marks:</label>
                <input
                  type="number"
                  min="0"
                  value={q.marks}
                  onChange={(e) => onChange(activeIdx, "marks", parseInt(e.target.value, 10) || 0)}
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-center focus:ring-2 focus:ring-slate-300 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Question Text Editor */}
          <ReactQuill
            theme="snow"
            value={q.text}
            onChange={(content) => onChange(activeIdx, "text", content)}
            className="flex-1 flex flex-col bg-white text-base w-full border-none"
            placeholder="Write your question details, instructions, or code samples here..."
            modules={QUILL_MODULES}
          />
        </div>
      </div>
    </div>
  );
}

/* ── TaskFormOverlay ─────────────────────────────────────────── */
export default function TaskFormOverlay({ form, setForm, onSave, onBack, isSaving, isEdit }) {
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);

  const isQuestionMode = form.taskMode === "questions";
  const isProjectMode = form.type === "project";
  const isSaveDisabled = isSaving || !form.title || form.title.trim() === "";

  const addQuestion = () => {
    setForm((prev) => {
      const qs = prev.questions || [];
      const newQs = [...qs, { text: "", marks: 1 }];
      setActiveQIdx(newQs.length - 1);
      return { ...prev, questions: newQs };
    });
  };

  const removeQuestion = (i) => {
    setForm((prev) => {
      const qs = prev.questions || [];
      if (qs.length <= 1) return prev;
      return { ...prev, questions: qs.filter((_, idx) => idx !== i) };
    });
    setActiveQIdx((prev) => Math.min(i, Math.max(0, (form.questions || []).length - 2)));
  };

  const updateQuestion = (i, field, value) => {
    setForm((prev) => {
      const qs = prev.questions || [];
      return { ...prev, questions: qs.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)) };
    });
  };

  const addPhase = () => {
    setForm((prev) => {
      const currentPhases = prev.phases?.length ? prev.phases : DEFAULT_PROJECT_PHASES;
      const newPhases = [
        ...currentPhases,
        {
          milestone: `Phase ${currentPhases.length + 1}: Custom Milestone`,
          task: "Phase objective description.",
          content: "Detailed guidelines and instructions.",
          type: "CODE",
          bloomLevel: "APPLY"
        }
      ];
      setActivePhaseIdx(newPhases.length - 1);
      return { ...prev, phases: newPhases };
    });
  };

  const removePhase = (i) => {
    setForm((prev) => {
      const currentPhases = prev.phases?.length ? prev.phases : DEFAULT_PROJECT_PHASES;
      if (currentPhases.length <= 1) return prev;
      const newPhases = currentPhases.filter((_, idx) => idx !== i);
      return { ...prev, phases: newPhases };
    });
    setActivePhaseIdx((prev) => Math.min(i, Math.max(0, (form.phases || []).length - 2)));
  };

  const updatePhase = (i, updatedPhase) => {
    setForm((prev) => {
      const currentPhases = prev.phases?.length ? prev.phases : DEFAULT_PROJECT_PHASES;
      const newPhases = currentPhases.map((p, idx) => (idx === i ? updatedPhase : p));
      return { ...prev, phases: newPhases };
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-[999] flex flex-col overflow-hidden font-sans">
      
      {/* ── Top App Bar ── */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {isEdit ? (isProjectMode ? "Edit Capstone Project" : "Edit Task") : (isProjectMode ? "Create Multi-Phase Capstone Project" : "Create New Task")}
          </h2>
        </div>
        <button
          onClick={onSave}
          disabled={isSaveDisabled}
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-semibold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
            isProjectMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
          }`}
        >
          <Save size={16} />
          {isEdit ? (isSaving ? "Saving…" : "Save Changes") : (isSaving ? "Publishing…" : isProjectMode ? "Publish Project" : "Publish Task")}
        </button>
      </div>

      {/* ── Horizontal Settings Bar ── */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-4 shrink-0 shadow-xs z-10">
        
        {/* Topic */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Topic</span>
          <input
            type="text"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none transition shadow-2xs placeholder:text-slate-400 font-medium"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="e.g. Distributed Systems & Database Design"
          />
        </div>

        {/* Vertical Divider */}
        <div className="hidden sm:block w-px h-6 bg-slate-200 shrink-0" />

        {/* Inline Options Group */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</span>
            <select
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-2xs cursor-pointer"
              value={form.type}
              onChange={(e) => {
                const newType = e.target.value;
                setForm({
                  ...form,
                  type: newType,
                  phases: newType === "project" ? (form.phases?.length ? form.phases : DEFAULT_PROJECT_PHASES) : form.phases
                });
              }}
            >
              <option value="task">Task (Single Submission)</option>
              <option value="project">Project (Multi-Phase Gated)</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diff</span>
            <select
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-2xs cursor-pointer"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Bloom (for tasks) */}
          {!isProjectMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bloom</span>
              <select
                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-2xs cursor-pointer"
                value={form.bloomLevel}
                onChange={(e) => setForm({ ...form, bloomLevel: e.target.value })}
              >
                <option value="none">None</option>
                <option value="REMEMBER">Remember</option>
                <option value="UNDERSTAND">Understand</option>
                <option value="APPLY">Apply</option>
                <option value="ANALYZE">Analyze</option>
                <option value="EVALUATE">Evaluate</option>
                <option value="CREATE">Create</option>
              </select>
            </div>
          )}

          {/* Due Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due</span>
            <input
              type="date"
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-2xs cursor-pointer"
              value={form.dueDate ? form.dueDate.slice(0, 10) : ""}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
            />
          </div>
        </div>

        {/* Mode switch (for tasks only) */}
        {!isProjectMode && (
          <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200 shadow-2xs ml-auto">
            <button
              type="button"
              onClick={() => setForm({ ...form, taskMode: "single", questions: [] })}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                form.taskMode === "single"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Single Prompt
            </button>
            <button
              type="button"
              onClick={() => {
                const qs = form.questions?.length ? form.questions : [{ text: "", marks: 1 }];
                setForm({ ...form, taskMode: "questions", questions: qs });
                setActiveQIdx(0);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                form.taskMode === "questions"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Questions
            </button>
          </div>
        )}

      </div>

      {/* ── Main Editor Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
        <div className="px-6 py-6 border-b border-slate-100 bg-white shrink-0 flex items-center justify-center shadow-2xs z-0">
          <input
            type="text"
            placeholder={isProjectMode ? "Capstone Project Title..." : "Task Title..."}
            className="w-full max-w-5xl text-3xl font-extrabold border-none outline-none placeholder:text-slate-300 bg-transparent text-slate-900 leading-tight tracking-tight text-center"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {isProjectMode ? (
          <PhaseEditor
            phases={form.phases || DEFAULT_PROJECT_PHASES}
            activeIdx={activePhaseIdx}
            onNavigate={setActivePhaseIdx}
            onChange={updatePhase}
            onAdd={addPhase}
            onRemove={removePhase}
          />
        ) : isQuestionMode ? (
          <QuestionEditor
            questions={form.questions || []}
            activeIdx={activeQIdx}
            onNavigate={setActiveQIdx}
            onChange={updateQuestion}
            onAdd={addQuestion}
            onRemove={removeQuestion}
            hasMarks={form.hasMarks}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-y-auto items-center py-6 px-6 relative">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xs border border-slate-200 flex flex-col overflow-hidden shrink-0 min-h-[600px] mb-12">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Task Instructions & Prompt
                </p>
                {form.hasMarks && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Marks:</label>
                    <input
                      type="number"
                      min="1"
                      value={form.singleMarks ?? 10}
                      onChange={(e) => setForm({ ...form, singleMarks: parseInt(e.target.value, 10) || 1 })}
                      className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center focus:ring-2 focus:ring-slate-300 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <ReactQuill
                theme="snow"
                value={form.description}
                onChange={(content) => setForm({ ...form, description: content })}
                className="flex-1 flex flex-col bg-white text-base w-full border-none"
                placeholder="Write the full task instructions, context, or code samples here..."
                modules={QUILL_MODULES}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
