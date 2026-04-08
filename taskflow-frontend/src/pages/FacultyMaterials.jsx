import { API_URL } from "../utils/api";
import { useState, useEffect } from "react";
import { getToken } from "../utils/auth";
import { Upload, FileText, Trash2, File, X } from "lucide-react";
import ConfirmationModal from "../components/common/ConfirmationModal";

const FILE_ICONS = {
  pdf: "📄",
  ppt: "📊",
  pptx: "📊",
  doc: "📝",
  docx: "📝",
  txt: "📃",
};

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function FacultyMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("description", description);
      formData.append("subject", subject);

      const res = await fetch(`${API_URL}/api/materials/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setMaterials([data.material, ...materials]);
        setTitle("");
        setDescription("");
        setSubject("");
        setFile(null);
      } else {
        alert("Upload failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/materials/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setMaterials(materials.filter((m) => m._id !== deleteTarget._id));
        setDeleteTarget(null);
      } else {
        alert("Delete failed: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to connect to server. Is the backend running?");
    } finally {
      setDeleting(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  };

  if (loading) return <p className="p-8 text-clay-muted">Loading materials...</p>;

  return (
    <div className="p-8 space-y-8">
      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border">
        <h2 className="text-xl font-bold text-clay-text mb-6 flex items-center gap-2">
          <Upload size={22} className="text-purple-500" />
          Upload Study Material
        </h2>

        <form onSubmit={handleUpload} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-clay-secondary mb-1.5">
                Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 5 — Sorting Algorithms"
                className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50 font-medium text-clay-text"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-clay-secondary mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50 font-medium text-clay-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-clay-secondary mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the material..."
              rows={2}
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50 font-medium text-clay-text resize-none"
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-purple-400 bg-purple-50"
                : file
                ? "border-green-300 bg-green-50/50"
                : "border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-purple-50/30"
            }`}
            onClick={() => document.getElementById("material-file-input").click()}
          >
            <input
              id="material-file-input"
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <File size={24} className="text-green-600" />
                <div className="text-left">
                  <p className="font-semibold text-clay-text">{file.name}</p>
                  <p className="text-xs text-clay-muted">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="p-1.5 hover:bg-red-100 rounded-full text-red-400 hover:text-red-600 transition ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-clay-secondary">
                  Drop a file here or <span className="text-purple-600 underline">browse</span>
                </p>
                <p className="text-xs text-clay-muted mt-1">
                  PDF, PPT, PPTX, DOC, DOCX, TXT — Max 10MB
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="flex items-center gap-2 bg-black text-white px-8 py-2.5 rounded-full font-medium hover:bg-slate-800 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={18} />
              {uploading ? "Uploading…" : "Upload Material"}
            </button>
          </div>
        </form>
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border">
        <h2 className="text-xl font-bold text-clay-text mb-4 flex items-center gap-2">
          <FileText size={22} className="text-blue-500" />
          Uploaded Materials
          <span className="text-sm font-normal text-clay-muted ml-2">({materials.length})</span>
        </h2>

        {materials.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-clay-muted text-lg">No materials uploaded yet</p>
            <p className="text-sm text-clay-muted mt-1">Upload your first study material above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {materials.map((m) => (
              <div
                key={m._id}
                className="bg-slate-50 rounded-xl p-5 border hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{FILE_ICONS[m.fileType] || "📄"}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-clay-text truncate">{m.title}</p>
                      {m.subject && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                          {m.subject}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(m)}
                    className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-400 hover:text-red-600 transition"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {m.description && (
                  <p className="text-sm text-clay-muted mb-3 line-clamp-2">{m.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-clay-muted">
                  <span>{m.originalName}</span>
                  <span>{formatFileSize(m.fileSize)}</span>
                </div>
                <div className="text-xs text-clay-muted mt-1">
                  {new Date(m.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Material"
        message={`Are you sure you want to delete "${deleteTarget ? deleteTarget.title : ''}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        loading={deleting}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
