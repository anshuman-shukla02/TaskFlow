import { useState, useEffect, useRef } from "react";
import { API_URL } from "../../utils/api";
import { getToken, getUser } from "../../utils/auth";
import { MessageSquare, Send, Reply, Trash2, ChevronDown, ChevronUp, User } from "lucide-react";

/**
 * CommentThread — A reusable threaded discussion component.
 *
 * Props:
 *   taskId       — required, the task this thread belongs to
 *   submissionId — optional, scope comments to a specific submission
 *   compact      — optional, if true uses a smaller layout
 */
export default function CommentThread({ taskId, submissionId = null, compact = false }) {
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);        // comment _id being replied to
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef(null);
  const currentUser = getUser();

  useEffect(() => {
    fetchComments();
  }, [taskId, submissionId]);

  const fetchComments = async () => {
    try {
      const endpoint = submissionId
        ? `${API_URL}/api/comments/submission/${submissionId}`
        : `${API_URL}/api/comments/task/${taskId}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (message, parentId = null) => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          taskId,
          submissionId,
          message: message.trim(),
          parentId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments((prev) => [...prev, data.comment]);
        setNewMessage("");
        setReplyTo(null);
        setReplyMessage("");
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (err) {
      console.error("Failed to send comment:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setComments((prev) => prev.filter((c) => c._id !== commentId && c.parentId !== commentId));
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Organize comments into a thread structure
  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId) => comments.filter((c) => c.parentId === parentId);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const roleColor = (role) => {
    switch (role) {
      case "faculty": return "bg-blue-100 text-blue-700";
      case "admin": return "bg-purple-100 text-purple-700";
      default: return "bg-emerald-100 text-emerald-700";
    }
  };

  const CommentBubble = ({ comment, isReply = false }) => {
    const isOwn = currentUser?._id === comment.userId?._id;
    const replies = getReplies(comment._id);

    return (
      <div className={`${isReply ? "ml-8 border-l-2 border-slate-200 pl-4" : ""}`}>
        <div className={`group relative rounded-xl p-3 transition-all hover:shadow-sm ${isOwn ? "bg-blue-50/70" : "bg-white"} border border-slate-100`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                <User size={12} />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {comment.userId?.name || "Unknown"}
              </span>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${roleColor(comment.userId?.role)}`}>
                {comment.userId?.role}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatTime(comment.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReply && (
                <button
                  onClick={() => {
                    setReplyTo(replyTo === comment._id ? null : comment._id);
                    setReplyMessage("");
                  }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition"
                  title="Reply"
                >
                  <Reply size={14} />
                </button>
              )}
              {(isOwn || currentUser?.role === "faculty" || currentUser?.role === "admin") && (
                <button
                  onClick={() => handleDelete(comment._id)}
                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.message}</p>
        </div>

        {/* Reply input */}
        {replyTo === comment._id && (
          <div className="ml-8 mt-2 flex gap-2">
            <input
              type="text"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(replyMessage, comment._id);
                }
              }}
              autoFocus
            />
            <button
              onClick={() => handleSend(replyMessage, comment._id)}
              disabled={!replyMessage.trim() || sending}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <Send size={14} />
            </button>
          </div>
        )}

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map((reply) => (
              <CommentBubble key={reply._id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalCount = comments.length;

  return (
    <div className={`${compact ? "" : "mt-4"}`}>
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition mb-2 group"
      >
        <MessageSquare size={16} className="group-hover:text-blue-600" />
        <span>Discussion {totalCount > 0 && `(${totalCount})`}</span>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-3 max-h-[400px] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-4">Loading comments...</p>
          ) : rootComments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No comments yet. Start the discussion!</p>
          ) : (
            rootComments.map((comment) => (
              <CommentBubble key={comment._id} comment={comment} />
            ))
          )}
          <div ref={bottomRef} />

          {/* New comment input */}
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(newMessage);
                }
              }}
            />
            <button
              onClick={() => handleSend(newMessage)}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 font-medium"
            >
              <Send size={14} />
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
