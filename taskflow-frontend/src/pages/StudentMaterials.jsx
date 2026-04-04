import { useState, useEffect, useRef } from "react";
import { getToken } from "../utils/auth";
import { FileText, Download, X, BookOpen, Sparkles, Loader2, ChevronRight, ArrowLeft } from "lucide-react";
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
  { key: "summary", label: "📋 Summary", description: "Get a concise summary" },
  { key: "keypoints", label: "🎯 Key Points", description: "Extract key points" },
  { key: "5_questions", label: "❓ 5 Questions", description: "5 exam-style Q&A" },
  { key: "10_questions", label: "📝 10 Questions", description: "10 exam-style Q&A" },
  { key: "20_questions", label: "📚 20 Questions", description: "20 comprehensive Q&A" },
  { key: "explain_simple", label: "💡 Explain Simply", description: "Simple explanation" },
  { key: "formulas_theorems", label: "📐 Formulas & Theorems", description: "All formulas & definitions" },
];

export default function StudentMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
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
      const res = await fetch("http://localhost:5002/api/materials", {
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
    setAiLoading(true);

    try {
      const res = await fetch(`http://localhost:5002/api/materials/${material._id}/chats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.chats.length > 0) {
        const history = [];
        data.chats.forEach(chat => {
          const queryLabel = PRESET_QUERIES.find((q) => q.key === chat.queryType)?.label || chat.queryType;
          history.push({ type: "query", label: queryLabel, key: chat.queryType });
          history.push({ type: "response", text: chat.response });
        });
        setChatHistory(history);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiQuery = async (queryType) => {
    if (aiLoading || !selectedMaterial) return;

    const queryLabel = PRESET_QUERIES.find((q) => q.key === queryType)?.label || queryType;

    setChatHistory((prev) => [...prev, { type: "query", label: queryLabel, key: queryType }]);
    setAiLoading(true);

    try {
      const res = await fetch(
        `http://localhost:5002/api/materials/${selectedMaterial._id}/ai-query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ queryType }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setChatHistory((prev) => [...prev, { type: "response", text: data.response }]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { type: "error", text: data.message || "Failed to get AI response" },
        ]);
      }
    } catch (err) {
      console.error("AI query error:", err);
      setChatHistory((prev) => [
        ...prev,
        { type: "error", text: "Network error. Please try again." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <p className="p-8 text-clay-muted">Loading materials...</p>;

  // ────────────── AI Chat View ──────────────
  if (selectedMaterial) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 bg-white border-b shadow-sm shrink-0">
          <button
            onClick={() => setSelectedMaterial(null)}
            className="p-2 hover:bg-slate-100 rounded-full text-clay-muted transition"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl">{FILE_ICONS[selectedMaterial.fileType] || "📄"}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-clay-text truncate">
                {selectedMaterial.title}
              </h2>
              <p className="text-xs text-clay-muted">
                {selectedMaterial.subject && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium mr-2">
                    {selectedMaterial.subject}
                  </span>
                )}
                {selectedMaterial.originalName} • {formatFileSize(selectedMaterial.fileSize)}
              </p>
            </div>
          </div>
          <a
            href={selectedMaterial.fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-clay-secondary transition"
          >
            <Download size={16} />
            Download
          </a>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-slate-50/70">
          {/* Welcome message */}
          {chatHistory.length === 0 && !aiLoading && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles size={36} className="text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-clay-text mb-2">AI Study Assistant</h3>
              <p className="text-clay-muted max-w-md mx-auto">
                Select a question below to analyze <strong>"{selectedMaterial.title}"</strong> using AI.
                The assistant will read your study material and generate helpful content.
              </p>
            </div>
          )}

          {/* Chat messages */}
          {chatHistory.map((msg, i) => (
            <div key={i}>
              {msg.type === "query" && (
                <div className="flex justify-end">
                  <div className="bg-black text-white px-5 py-3 rounded-2xl rounded-br-md max-w-sm shadow-sm">
                    <p className="font-medium text-sm">{msg.label}</p>
                  </div>
                </div>
              )}
              {msg.type === "response" && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-3xl rounded-bl-md px-7 py-6 max-w-4xl shadow-sm max-h-[65vh] overflow-y-auto">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-extrabold text-slate-800 mt-6 mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-5 mb-3 border-b pb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-800 mt-4 mb-2" {...props} />,
                        p: ({node, ...props}) => <p className="text-slate-600 leading-relaxed mb-4 text-[15px]" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-5 text-slate-600 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-5 text-slate-600 space-y-2" {...props} />,
                        li: ({node, ...props}) => <li className="leading-relaxed pl-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-slate-800" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-400 pl-4 py-1 italic bg-purple-50/50 text-slate-700 mb-5 rounded-r" {...props} />,
                        code: ({node, inline, ...props}) => inline 
                          ? <code className="bg-slate-100 text-purple-700 px-1.5 py-0.5 rounded text-[13px] font-mono border" {...props} />
                          : <div className="bg-slate-800 rounded-xl overflow-hidden mb-5"><code className="block text-slate-50 p-4 text-[13px] font-mono overflow-x-auto" {...props} /></div>,
                        table: ({node, ...props}) => <div className="overflow-x-auto mb-5 border rounded-lg"><table className="w-full text-left text-sm text-slate-600" {...props} /></div>,
                        th: ({node, ...props}) => <th className="bg-slate-50 px-4 py-3 font-semibold text-slate-800 border-b" {...props} />,
                        td: ({node, ...props}) => <td className="px-4 py-3 border-b last:border-0" {...props} />,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {msg.type === "error" && (
                <div className="flex justify-start">
                  <div className="bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-5 py-3 max-w-lg">
                    <p className="text-red-600 text-sm font-medium">⚠️ {msg.text}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-white border rounded-2xl rounded-bl-md px-6 py-4 shadow-sm flex items-center gap-3">
                <Loader2 size={18} className="text-purple-500 animate-spin" />
                <span className="text-sm text-clay-muted font-medium">Analyzing your material...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Preset buttons — fixed at bottom */}
        <div className="bg-white border-t px-6 py-4 shrink-0">
          <p className="text-xs font-semibold text-clay-muted uppercase tracking-wider mb-3">
            Ask AI about this material
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((q) => (
              <button
                key={q.key}
                onClick={() => handleAiQuery(q.key)}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 text-sm font-medium text-clay-secondary transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow"
              >
                {q.label}
                <ChevronRight size={14} className="opacity-50" />
              </button>
            ))}
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
