import { API_URL } from "../utils/api";
import { useState, useEffect, useRef } from "react";
import { getToken } from "../utils/auth";
import { 
  FileText, Download, X, BookOpen, Sparkles, Loader2, ChevronRight, 
  ArrowLeft, Send, Trash2, Copy, Check, Bot, User, Zap
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const FILE_ICONS = {
  pdf: "📄", ppt: "📊", pptx: "📊", doc: "📝", docx: "📝", txt: "📃",
};

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const PRESET_QUERIES = [
  { key: "summary", label: "📋 Summary", prompt: "Summarize this study material in detail with clear bullet points." },
  { key: "keypoints", label: "🎯 Key Points", prompt: "Extract the most important key concepts and takeaways from this material." },
  { key: "5_questions", label: "❓ 5 Practice Qs", prompt: "Generate 5 exam-style practice questions with detailed answers based on this study material." },
  { key: "explain_simple", label: "💡 Explain Simply", prompt: "Explain the core concepts of this study material in very simple terms for a beginner." },
  { key: "formulas_theorems", label: "📐 Formulas & Rules", prompt: "List all key formulas, theorems, definitions, and equations from this material." },
];

function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition ${className}`}
      title="Copy response"
    >
      {copied ? <Check size={13} className="text-emerald-600 font-bold" /> : <Copy size={13} />}
      <span>{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

export default function StudentMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, aiLoading]);

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${API_URL}/api/materials`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setMaterials(data.materials || []);
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMaterial = async (material) => {
    setSelectedMaterial(material);
    setChatHistory([]);
    setInputMessage("");
    setAiLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/materials/${material._id}/conversation`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.messages) {
        setChatHistory(data.messages);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text || !text.trim() || aiLoading || !selectedMaterial) return;

    if (!textToSend) setInputMessage("");

    setChatHistory((prev) => [...prev, { role: "user", content: text }]);
    setAiLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/materials/${selectedMaterial._id}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ message: text }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setChatHistory((prev) => {
          const cleanHistory = prev.slice(0, -1);
          return [...cleanHistory, data.userMessage, data.modelMessage];
        });
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: "model", content: `⚠️ Error: ${data.message || "Failed to get AI response"}` },
        ]);
      }
    } catch (err) {
      console.error("AI chat error:", err);
      setChatHistory((prev) => [
        ...prev,
        { role: "model", content: "⚠️ Network error. Please check if backend is running." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!selectedMaterial || aiLoading) return;
    if (!window.confirm("Are you sure you want to clear this chat history?")) return;

    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/materials/${selectedMaterial._id}/chat/clear`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory([]);
      }
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <p className="p-8 text-clay-muted">Loading materials...</p>;

  // ────────────── UNIFIED HIGH-CONTRAST CHAT VIEW ──────────────
  if (selectedMaterial) {
    return (
      <div className="h-full flex flex-col bg-slate-50 text-slate-800 font-sans overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200/80 shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSelectedMaterial(null)}
              className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 transition"
              title="Back to Materials"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-xl shrink-0 shadow-xs">
                {FILE_ICONS[selectedMaterial.fileType] || "📄"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 truncate max-w-md">
                    {selectedMaterial.title}
                  </h2>
                  {selectedMaterial.subject && (
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] bg-purple-100 border border-purple-200 text-purple-700 font-semibold shrink-0">
                      {selectedMaterial.subject}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {selectedMaterial.originalName} • {formatFileSize(selectedMaterial.fileSize)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleClearChat}
              disabled={chatHistory.length === 0 || aiLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title="Clear Conversation"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear Thread</span>
            </button>
            <a
              href={selectedMaterial.fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 shadow-xs transition shrink-0"
            >
              <Download size={14} />
              <span>Download</span>
            </a>
          </div>
        </div>

        {/* Chat Thread Container with Bottom Padding */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 bg-slate-50/80 pb-20">
          
          {/* Welcome Dashboard State */}
          {chatHistory.length === 0 && !aiLoading && (
            <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl border border-purple-200/80 shadow-sm flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                Interactive AI Study Assistant
              </h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed mb-6">
                Ask any question or choose a quick shortcut below to analyze <strong className="text-purple-700">"{selectedMaterial.title}"</strong>.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-xs mb-1">
                    <Zap size={14} /> Document RAG Analysis
                  </div>
                  <p className="text-slate-500 text-xs leading-normal">Answers are generated strictly from the content inside this document.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
                    <Bot size={14} /> Conversational Memory
                  </div>
                  <p className="text-slate-500 text-xs leading-normal">Ask follow-up questions naturally; the assistant remembers your previous thread.</p>
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {chatHistory.map((msg, i) => (
            <div key={i} className="max-w-4xl mx-auto space-y-1.5">
              
              {/* User Message Bubble */}
              {msg.role === "user" && (
                <div className="flex justify-end items-start gap-2.5">
                  <div className="flex flex-col items-end max-w-2xl">
                    <span className="text-[11px] font-semibold text-slate-400 mb-1">You</span>
                    <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl rounded-tr-xs shadow-md border border-slate-800">
                      <p className="font-medium text-[14.5px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs mt-5">
                    <User size={15} />
                  </div>
                </div>
              )}

              {/* AI Message Card */}
              {msg.role === "model" && (
                <div className="flex justify-start items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md mt-1">
                    <Sparkles size={18} className="text-amber-300" />
                  </div>

                  <div className="flex-1 min-w-0 max-w-3xl">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">TaskFlow AI Assistant</span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 border border-purple-200 text-[10px] font-semibold text-purple-700">RAG Model</span>
                      </div>
                      <CopyButton text={msg.content} />
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-3xl rounded-tl-xs px-6 py-5 shadow-sm">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => (
                            <h1 className="text-xl font-extrabold text-slate-900 mt-5 mb-3 border-b border-slate-200 pb-2" {...props} />
                          ),
                          h2: ({node, ...props}) => (
                            <h2 className="text-lg font-bold text-slate-900 mt-4 mb-2 border-b border-slate-100 pb-1.5" {...props} />
                          ),
                          h3: ({node, ...props}) => (
                            <h3 className="text-base font-semibold text-slate-900 mt-3.5 mb-1.5" {...props} />
                          ),
                          p: ({node, ...props}) => (
                            <p className="text-slate-700 leading-relaxed mb-3 text-[14.5px]" {...props} />
                          ),
                          ul: ({node, ...props}) => (
                            <ul className="list-disc list-outside ml-5 mb-4 text-slate-700 space-y-1.5 text-[14.5px]" {...props} />
                          ),
                          ol: ({node, ...props}) => (
                            <ol className="list-decimal list-outside ml-5 mb-4 text-slate-700 space-y-1.5 text-[14.5px]" {...props} />
                          ),
                          li: ({node, ...props}) => (
                            <li className="leading-relaxed pl-1" {...props} />
                          ),
                          strong: ({node, ...props}) => (
                            <strong className="font-bold text-slate-900" {...props} />
                          ),
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-4 border-purple-500 pl-4 py-2 italic bg-purple-50/70 text-slate-800 mb-4 rounded-r-xl border border-purple-100" {...props} />
                          ),
                          code: ({node, inline, ...props}) => inline 
                            ? <code className="bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded-md text-[13px] font-mono border border-purple-200/80" {...props} />
                            : (
                              <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl overflow-hidden mb-4 shadow-md">
                                <div className="bg-slate-800/90 px-4 py-2 border-b border-slate-700/80 flex justify-between items-center text-xs text-slate-300 font-mono">
                                  <span>Code Snippet</span>
                                  <CopyButton text={props.children} className="bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600" />
                                </div>
                                <code className="block text-slate-100 p-4 text-[13px] font-mono overflow-x-auto leading-relaxed" {...props} />
                              </div>
                            ),
                          table: ({node, ...props}) => (
                            <div className="overflow-x-auto mb-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
                              <table className="w-full text-left text-sm text-slate-700" {...props} />
                            </div>
                          ),
                          th: ({node, ...props}) => (
                            <th className="bg-slate-100/80 px-4 py-2.5 font-bold text-slate-900 border-b border-slate-200" {...props} />
                          ),
                          td: ({node, ...props}) => (
                            <td className="px-4 py-2.5 border-b border-slate-100 last:border-0" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* AI Loading Indicator */}
          {aiLoading && (
            <div className="max-w-4xl mx-auto flex justify-start items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0 animate-pulse">
                <Sparkles size={18} />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-xs flex items-center gap-3">
                <Loader2 size={16} className="text-purple-600 animate-spin" />
                <span className="text-xs font-medium text-slate-600">Analyzing material & generating response...</span>
              </div>
            </div>
          )}

          {/* Dedicated end ref marker with height spacing */}
          <div ref={chatEndRef} className="h-8" />
        </div>

        {/* Sticky Bottom Footer: Presets + Input Bar */}
        <div className="bg-white border-t border-slate-200 shrink-0 shadow-lg z-20">
          
          {/* Preset Action Chips Bar */}
          <div className="px-4 md:px-8 pt-3 pb-1 border-b border-slate-100">
            <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Zap size={12} className="text-amber-500" /> Presets:
              </span>
              {PRESET_QUERIES.map((q) => (
                <button
                  key={q.key}
                  onClick={() => handleSendMessage(q.prompt)}
                  disabled={aiLoading}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 text-xs font-medium text-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-2xs"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input Field */}
          <div className="px-4 md:px-8 py-3.5">
            <div className="max-w-4xl mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  placeholder="Ask any question about this study material..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={aiLoading}
                  className="w-full pl-5 pr-14 py-3.5 bg-slate-50 border border-slate-300 focus:border-purple-600 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 transition disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !inputMessage.trim()}
                  className="absolute right-2 p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // ────────────── Materials Grid View ──────────────
  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col items-center justify-center text-center gap-4 pt-4 mb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Study Materials</h1>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            Browse study materials uploaded by your faculty. Click on any material to use the AI assistant.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white shadow-sm px-4 py-2 rounded-full border border-slate-200 mt-2">
          <BookOpen size={14} className="text-purple-500" />
          {materials.length} material{materials.length !== 1 ? "s" : ""}
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed shadow-sm">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-clay-muted text-lg font-medium">No study materials available yet</p>
          <p className="text-sm text-clay-muted mt-1">Your faculty will upload materials here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {materials.map((m) => (
            <div
              key={m._id}
              onClick={() => handleSelectMaterial(m)}
              className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-lg transition cursor-pointer group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                  {FILE_ICONS[m.fileType] || "📄"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-clay-text group-hover:text-purple-700 transition truncate text-lg">
                    {m.title}
                  </p>
                  {m.subject && (
                    <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium mt-1">
                      {m.subject}
                    </span>
                  )}
                </div>
              </div>

              {m.description && (
                <p className="text-sm text-clay-muted mb-4 line-clamp-2">{m.description}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="text-xs text-clay-muted space-y-0.5">
                  <p className="truncate max-w-[180px]">{m.originalName}</p>
                  <p>{formatFileSize(m.fileSize)} • {new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={m.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-full border hover:bg-slate-100 text-clay-muted hover:text-blue-600 transition"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 text-xs font-semibold border border-purple-100 group-hover:bg-purple-100 transition">
                    <Sparkles size={12} />
                    AI
                  </div>
                </div>
              </div>

              {/* Faculty info */}
              {m.uploadedBy && (
                <div className="mt-3 pt-3 border-t text-xs text-clay-muted">
                  By {m.uploadedBy.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
