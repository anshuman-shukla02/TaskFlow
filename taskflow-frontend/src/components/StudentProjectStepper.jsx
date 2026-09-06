import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Lock, CheckCircle2, Clock, AlertTriangle, Send, Code, Link, FileText, ChevronRight, Sparkles, Trash2 
} from "lucide-react";

const formatMarkdownText = (text) => {
  if (!text) return "";
  let formatted = text.replace(/\r\n/g, "\n");
  formatted = formatted.replace(/^["']|["']$/g, "").trim();
  formatted = formatted
    .replace(/([^\n])\s*(\d+\.\s*\*\*)/gi, "$1\n\n$2")
    .replace(/([^\n])\s*(\b[a-z]\.\s*\*\*)/gi, "$1\n\n$2")
    .replace(/([^\n])\s*(\d+\.\s+[A-Z])/g, "$1\n\n$2")
    .replace(/([^\n])\s*(\b[a-z]\.\s+[A-Z])/g, "$1\n\n$2");
  return formatted.trim();
};

/* ── Unified Phase Instruction & Specification Renderer ── */
function PhaseInstructionRenderer({ phase }) {
  const task = phase.task || "";
  const content = phase.content || "";

  let textToRender = content.trim() ? content : task;
  if (!textToRender.trim()) {
    textToRender = "No specific instructions provided for this phase.";
  }

  // Determine whether content is raw HTML (e.g., produced by an HTML rich-text editor like Quill starting with <p>...)
  // vs Markdown text (with ##, **, lists, code blocks, or standard text).
  const hasMarkdownFormatting = /^(\s*(#|##|###|\*\*|1\.|- |\* |```))/m.test(textToRender) || 
                                textToRender.includes("```") || 
                                textToRender.includes("## ") || 
                                textToRender.includes("**") ||
                                textToRender.includes("### ");

  const isPureHtml = !hasMarkdownFormatting && (
    /^\s*<(p|div|span|h[1-6]|ul|ol|table|article|section)/i.test(textToRender) ||
    /<\/(p|div|h[1-6]|ul|ol|table|section)>/i.test(textToRender)
  );

  // Pre-process markdown text to ensure headings, bold sections, and lists have proper double line breaks if needed
  const sanitizedMarkdown = textToRender
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n(##|###|\*\*|1\.|- |\* )/g, "$1\n\n$2");

  const showTaskObjective = task.trim() && content.trim() && task.trim() !== content.trim();

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      {/* Objective Banner */}
      {showTaskObjective && (
        <div className="bg-purple-50/90 border border-purple-200/90 rounded-2xl p-4 flex items-start gap-3 text-purple-950 shadow-2xs">
          <Sparkles size={18} className="text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed min-w-0">
            <span className="font-extrabold uppercase tracking-wider text-purple-700 block mb-0.5 text-[10px]">
              Phase Objective & Deliverable
            </span>
            <span className="font-semibold text-slate-800 break-words">{task}</span>
          </div>
        </div>
      )}

      {/* Specification Body */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-purple-50/20 p-6 rounded-3xl border border-slate-200/80 shadow-xs min-w-0 max-w-full overflow-hidden">
        <div className="text-sm text-slate-800 leading-relaxed font-sans min-w-0 max-w-full overflow-x-auto">
          {isPureHtml ? (
            <div 
              className="prose prose-purple max-w-none text-sm leading-relaxed break-words"
              dangerouslySetInnerHTML={{ __html: textToRender }} 
            />
          ) : (
            <div className="prose prose-purple max-w-none text-sm leading-relaxed break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-extrabold text-slate-900 mt-6 mb-3 border-b pb-2 border-slate-200">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-extrabold text-slate-900 mt-5 mb-2 border-b pb-1 border-slate-200">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-bold text-slate-800 mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-slate-700 leading-relaxed mb-3 text-sm">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-slate-700 text-sm pl-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-700 text-sm pl-2">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-700 text-sm leading-relaxed mb-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                  code({ node, inline, className, children, ...props }) {
                    if (inline) {
                      return (
                        <code className="bg-purple-100/80 text-purple-900 px-1.5 py-0.5 rounded font-mono text-xs font-semibold border border-purple-200/60" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <div className="my-4 bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs border border-slate-800 overflow-x-auto shadow-inner">
                        <pre className="whitespace-pre overflow-x-auto tab-size-2 leading-relaxed text-slate-200 font-mono">
                          {String(children).replace(/\n$/, '')}
                        </pre>
                      </div>
                    );
                  }
                }}
              >
                {sanitizedMarkdown}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentProjectStepper({ 
  task, 
  submissions = [], 
  activePhase, 
  setActivePhase, 
  onSubmitPhase, 
  submitting 
}) {
  const [inputText, setInputText] = useState("");
  const [fileUrlInput, setFileUrlInput] = useState("");

  const phases = task.phases || [];

  // Map submissions by milestoneId for quick lookup
  const submissionMap = {};
  submissions.forEach((s) => {
    if (s.milestoneId !== undefined && s.milestoneId !== null) {
      const idx = Number(s.milestoneId);
      submissionMap[idx] = s;
    }
  });

  const currentPhase = phases[activePhase] || phases[0] || {
    milestone: "Phase Details",
    bloomLevel: "REMEMBER",
    task: "Please select a phase to view details.",
    content: "",
    type: "INFO"
  };
  const currentSub = submissionMap[activePhase];

  // Synchronize state when activePhase or currentSub changes
  useEffect(() => {
    if (currentSub) {
      setInputText(currentSub.code || "");
      setFileUrlInput(currentSub.fileUrl || "");
    } else {
      setInputText("");
      setFileUrlInput("");
    }
  }, [activePhase, currentSub?._id, currentSub?.code, currentSub?.fileUrl]);

  // Check if a phase index is unlocked
  const isPhaseUnlocked = (idx) => {
    if (idx === 0) return true; // Phase 1 is always unlocked
    const prevPhase = phases[idx - 1];
    const prevSub = submissionMap[idx - 1];

    if (prevPhase && prevPhase.type === "INFO") {
      return true;
    }

    return prevSub && (prevSub.reviewStatus === "APPROVED" || prevSub.reviewStatus === "accepted");
  };

  const unlocked = isPhaseUnlocked(activePhase);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!unlocked || submitting) return;

    onSubmitPhase({
      milestoneId: activePhase,
      bloomLevel: currentPhase.bloomLevel,
      task: currentPhase.task,
      code: inputText,
      fileUrl: fileUrlInput,
      type: currentPhase.type,
    });
  };

  if (!phases || phases.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 font-medium my-6">
        <Lock size={36} className="mx-auto mb-3 text-slate-400" />
        <p className="text-base font-bold text-slate-800">No Milestones Configured</p>
        <p className="text-xs text-slate-500 mt-1">This project capstone does not have any active milestones published by faculty.</p>
      </div>
    );
  }

  const codeLines = (inputText || "").split("\n");

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      
      {/* Left Stepper Sidebar */}
      <div className="w-full md:w-80 bg-slate-50/90 border-r border-slate-200 p-5 space-y-3 shrink-0">
        <div className="mb-4">
          <span className="text-[11px] font-extrabold text-purple-700 bg-purple-100 border border-purple-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Multi-Phase Capstone
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-2 truncate leading-snug">
            {task.title}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Complete each phase to unlock the next.
          </p>
        </div>

        <div className="space-y-2">
          {phases.map((p, idx) => {
            const isUnlocked = isPhaseUnlocked(idx);
            const sub = submissionMap[idx];
            const isActive = activePhase === idx;

            let statusIcon = <Lock size={15} className="text-slate-400 shrink-0" />;
            let statusBadgeClass = "bg-slate-200 text-slate-600";
            let statusText = "Locked";

            if (isUnlocked) {
              if (!sub) {
                statusIcon = <Clock size={15} className="text-amber-500 shrink-0" />;
                statusBadgeClass = "bg-amber-100 text-amber-800 font-semibold";
                statusText = "Action Needed";
              } else if (sub.reviewStatus === "APPROVED" || sub.reviewStatus === "accepted") {
                statusIcon = <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />;
                statusBadgeClass = "bg-emerald-100 text-emerald-800 font-bold";
                statusText = "Approved";
              } else if (sub.reviewStatus === "REJECTED") {
                statusIcon = <AlertTriangle size={15} className="text-rose-600 shrink-0" />;
                statusBadgeClass = "bg-rose-100 text-rose-800 font-bold";
                statusText = "Try Again";
              } else {
                statusIcon = <Clock size={15} className="text-indigo-600 animate-pulse shrink-0" />;
                statusBadgeClass = "bg-indigo-100 text-indigo-800 font-semibold";
                statusText = "Pending Review";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => isUnlocked && setActivePhase(idx)}
                disabled={!isUnlocked}
                className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between group ${
                  isActive
                    ? "bg-white border-purple-500 shadow-sm ring-2 ring-purple-500/20"
                    : isUnlocked
                    ? "bg-white/60 border-slate-200 hover:bg-white"
                    : "bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-xs"
                        : isUnlocked
                        ? "bg-slate-200 text-slate-700"
                        : "bg-slate-300 text-slate-500"
                    }`}
                  >
                    P{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 truncate">
                      {p.milestone || `Phase ${idx + 1}`}
                    </p>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${statusBadgeClass}`}>
                      {statusText}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">{statusIcon}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content & Submission Area */}
      <div className="flex-1 p-6 md:p-8 space-y-6 flex flex-col justify-between min-w-0">
        
        {/* Phase Details Section */}
        <div className="space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-3.5 py-1 rounded-full border border-purple-200 uppercase tracking-wider shrink-0">
              Phase {activePhase + 1} • {currentPhase.bloomLevel || "REMEMBER"}
            </span>
            {currentSub && (
              <span
                className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase border shrink-0 ${
                  currentSub.reviewStatus === "APPROVED"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : currentSub.reviewStatus === "REJECTED"
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : "bg-indigo-100 text-indigo-800 border-indigo-200"
                }`}
              >
                {currentSub.reviewStatus === "APPROVED" ? "✓ Approved" : currentSub.reviewStatus === "REJECTED" ? "✗ Revision Requested" : "⏳ Pending Review"}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {currentPhase.milestone}
          </h2>

          {/* Unified Phase Instruction Renderer */}
          <PhaseInstructionRenderer phase={currentPhase} />
        </div>

        {/* Faculty Reviewer Feedback Card */}
        {currentSub && currentSub.reviewFeedback && (
          <div
            className={`p-5 rounded-3xl border space-y-3 shadow-xs transition ${
              currentSub.reviewStatus === "APPROVED"
                ? "bg-emerald-50/90 border-emerald-200/90 text-emerald-950"
                : currentSub.reviewStatus === "REJECTED"
                ? "bg-rose-50/90 border-rose-200/90 text-rose-950"
                : "bg-indigo-50/90 border-indigo-200/90 text-indigo-950"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-2.5">
              <div className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider">
                {currentSub.reviewStatus === "APPROVED" ? (
                  <>
                    <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                    <span className="text-emerald-950">Faculty Reviewer Feedback (Approved)</span>
                  </>
                ) : currentSub.reviewStatus === "REJECTED" ? (
                  <>
                    <AlertTriangle size={17} className="text-rose-600 shrink-0" />
                    <span className="text-rose-950">Faculty Reviewer Feedback (Revision Requested)</span>
                  </>
                ) : (
                  <>
                    <Clock size={17} className="text-indigo-600 shrink-0" />
                    <span className="text-indigo-950">Faculty Reviewer Notes</span>
                  </>
                )}
              </div>
              {currentSub.performanceScore !== undefined && (
                <span className="text-xs font-black px-3.5 py-1 rounded-full bg-white text-slate-900 border border-slate-200 shadow-2xs">
                  Score: {currentSub.performanceScore} / 100
                </span>
              )}
            </div>

            <div className="bg-white/95 p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-xs text-slate-800 font-sans leading-relaxed break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-sm font-extrabold text-slate-900 mt-3 mb-1 border-b pb-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xs font-bold text-slate-900 mt-2 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-bold text-slate-800 mt-2 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="text-xs text-slate-800 leading-relaxed mb-2.5 font-normal">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 mb-2.5 text-slate-800 text-xs pl-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 mb-2.5 text-slate-800 text-xs pl-2">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-800 text-xs leading-relaxed mb-1">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-extrabold text-purple-950 bg-purple-100/90 px-1.5 py-0.5 rounded text-[11px] border border-purple-200/80 inline-block my-0.5">
                      {children}
                    </strong>
                  ),
                  code: ({ children }) => (
                    <code className="font-mono text-purple-900 bg-purple-100/90 px-1.5 py-0.5 rounded text-[11px] border border-purple-200">
                      {children}
                    </code>
                  ),
                }}
              >
                {formatMarkdownText(currentSub.reviewFeedback)}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Phase Action / Submission Area */}
        <div className="space-y-4 min-w-0">
          {!unlocked ? (
            <div className="p-8 text-center bg-slate-100/80 rounded-3xl border border-dashed border-slate-300 text-slate-500">
              <Lock size={36} className="mx-auto mb-2 text-slate-400" />
              <p className="font-bold text-sm text-slate-700">Phase {activePhase + 1} is Currently Locked</p>
              <p className="text-xs text-slate-500 mt-1">
                You must complete Phase {activePhase} and receive Faculty approval before proceeding.
              </p>
            </div>
          ) : currentPhase.type === "INFO" ? (
            <div className="p-6 bg-purple-50/80 rounded-3xl border border-purple-200 text-center space-y-3">
              <CheckCircle2 size={32} className="text-purple-600 mx-auto" />
              <p className="text-sm font-extrabold text-purple-900">Project Guidelines & Architecture Read</p>
              <p className="text-xs text-purple-700 font-medium">You are ready to proceed with Phase {activePhase + 2} deliverable!</p>
              <button
                onClick={async () => {
                  if (!currentSub || currentSub.reviewStatus !== "APPROVED") {
                    await onSubmitPhase({
                      milestoneId: activePhase,
                      bloomLevel: currentPhase.bloomLevel || "REMEMBER",
                      task: currentPhase.task || "Read Guidelines",
                      code: "Marked as read",
                      type: "INFO",
                    });
                  }
                  if (activePhase < phases.length - 1) {
                    setActivePhase(activePhase + 1);
                  }
                }}
                className="px-6 py-3 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-purple-700 transition cursor-pointer"
              >
                Proceed to Phase {activePhase + 2} →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
              {currentPhase.type === "CODE" && (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Code size={15} className="text-purple-600 shrink-0" />
                      {activePhase === 1 ? "Write your Pseudocode / Algorithm Design:" : "Write your Implementation Code:"}
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {codeLines.length} lines • {inputText.length} chars
                    </span>
                  </div>

                  {/* IDE-styled Student Code Editor Box */}
                  <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden font-mono text-xs shadow-inner min-w-0">
                    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-slate-400">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                        <span>{activePhase === 1 ? "pseudocode_design.txt" : "implementation_code.js"}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-purple-300 font-mono bg-purple-950/70 px-2.5 py-1 rounded-lg border border-purple-800/60">
                          💡 Press Tab to insert 2 spaces
                        </span>
                        {inputText && currentSub?.reviewStatus !== "APPROVED" && (
                          <button
                            type="button"
                            onClick={() => setInputText("")}
                            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition px-2 py-0.5 rounded hover:bg-slate-800"
                            title="Clear Editor"
                          >
                            <Trash2 size={12} /> Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 flex font-mono text-xs">
                      {/* Line Numbers Gutter */}
                      <div className="select-none text-slate-600 pr-3 text-right border-r border-slate-800 font-mono shrink-0 py-1">
                        {codeLines.map((_, i) => (
                          <div key={i} className="leading-relaxed">{i + 1}</div>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        rows={11}
                        placeholder={activePhase === 1 ? "// Write step-by-step pseudocode logic here..." : "// Write code implementation here..."}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Tab") {
                            e.preventDefault();
                            const start = e.target.selectionStart;
                            const end = e.target.selectionEnd;
                            const val = e.target.value;
                            const updated = val.substring(0, start) + "  " + val.substring(end);
                            setInputText(updated);
                            setTimeout(() => {
                              e.target.selectionStart = e.target.selectionEnd = start + 2;
                            }, 0);
                          }
                        }}
                        disabled={currentSub?.reviewStatus === "APPROVED"}
                        className="w-full pl-3 pr-2 py-1 bg-transparent text-slate-100 font-mono text-xs focus:outline-none leading-relaxed disabled:opacity-75 whitespace-pre tab-size-2 resize-y min-h-[180px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentPhase.type === "URL" && (
                <div className="space-y-3 min-w-0">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      GitHub Repository URL:
                    </label>
                    <input
                      type="url"
                      placeholder="https://github.com/username/project-repo"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={currentSub?.reviewStatus === "APPROVED"}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Live Deployed Demo URL (Optional):
                    </label>
                    <input
                      type="url"
                      placeholder="https://my-app.vercel.app"
                      value={fileUrlInput}
                      onChange={(e) => setFileUrlInput(e.target.value)}
                      disabled={currentSub?.reviewStatus === "APPROVED"}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>
              )}

              {currentSub?.reviewStatus !== "APPROVED" && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={16} />
                  <span>{currentSub?.reviewStatus === "REJECTED" ? "Resubmit Milestone for Review" : "Submit Milestone to Faculty"}</span>
                </button>
              )}
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
