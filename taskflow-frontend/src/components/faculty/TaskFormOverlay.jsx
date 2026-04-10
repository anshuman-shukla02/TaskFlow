import { useState } from "react";
import {
  ArrowLeft, Save, Plus, ChevronLeft, ChevronRight, BarChart2,
  Trash2, Search
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/* ── Shared constants ───────────────────────────────────────── */
export const EMPTY_TASK = {
  title: "",
  description: "",
  topic: "",
  difficulty: "none",
  type: "task",
  bloomLevel: "none",
  taskMode: "single",   // "single" | "questions"
  hasMarks: false,
  singleMarks: 10,      // marks for single-mode graded tasks
  questions: [],
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
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center focus:ring-2 focus:ring-slate-300 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Active Question Text Editor */}
          <div className="flex-1 p-5 flex flex-col">
            <ReactQuill
              key={`qeditor-${activeIdx}`}
              theme="snow"
              value={q.text}
              onChange={(content) => onChange(activeIdx, "text", content)}
              className="flex-1 flex flex-col bg-white w-full border-none"
              placeholder={`Write question ${activeIdx + 1} details here…`}
              modules={QUILL_MODULES}
            />
          </div>

          {/* Active Question Prev/Next Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
            <button
              type="button"
              disabled={activeIdx === 0}
              onClick={() => onNavigate(activeIdx - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition border border-slate-200 bg-white shadow-sm"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              disabled={activeIdx === total - 1}
              onClick={() => onNavigate(activeIdx + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition border border-slate-200 bg-white shadow-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── TaskFormOverlay ─────────────────────────────────────────── */
export default function TaskFormOverlay({ form, setForm, onSave, onBack, isSaving, isEdit }) {
  const [activeQIdx, setActiveQIdx] = useState(0);
  const isQuestionMode = form.taskMode === "questions";
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

  return (
    <div className="fixed inset-0 bg-white z-[999] flex flex-col overflow-hidden">
      
      {/* ── Top App Bar ── */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {isEdit ? "Edit Task" : "Create New Task"}
          </h2>
        </div>
        <button
          onClick={onSave}
          disabled={isSaveDisabled}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {isEdit ? (isSaving ? "Saving…" : "Save Changes") : (isSaving ? "Publishing…" : "Publish Task")}
        </button>
      </div>

      {/* ── Horizontal Settings Bar ── */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-4 shrink-0 shadow-sm z-10">
        
        {/* Topic */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Topic</span>
          <input
            type="text"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-300 focus:outline-none transition shadow-sm placeholder:text-slate-400"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="e.g. Data Structures"
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
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-sm cursor-pointer"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="task">Task</option>
              <option value="project">Project</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diff</span>
            <select
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-sm cursor-pointer"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="none">None</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Bloom */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bloom</span>
            <select
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-sm cursor-pointer"
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
        </div>

        {/* Vertical Divider */}
        <div className="hidden lg:block w-px h-6 bg-slate-200 shrink-0" />

        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {/* Mode switch */}
          <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => setForm({ ...form, taskMode: "single", questions: [] })}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                form.taskMode === "single"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Single Info
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
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Questions
            </button>
          </div>

          {/* Marks Toggle */}
          <button
            type="button"
            onClick={() => setForm({ ...form, hasMarks: !form.hasMarks })}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition border shadow-sm ${
              form.hasMarks
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <BarChart2 size={14} />
            {form.hasMarks ? "Graded Task" : "Practice Task"}
          </button>
        </div>

      </div>

      {/* ── Main Editor Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
        <div className="px-6 py-6 border-b border-slate-100 bg-white shrink-0 flex items-center justify-center shadow-sm z-0">
          <input
            type="text"
            placeholder="Task Title..."
            className="w-full max-w-5xl text-3xl font-extrabold border-none outline-none placeholder:text-slate-300 bg-transparent text-slate-800 leading-tight tracking-tight text-center"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {isQuestionMode ? (
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
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0 min-h-[600px] mb-12">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Task Description &amp; Prompt
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
