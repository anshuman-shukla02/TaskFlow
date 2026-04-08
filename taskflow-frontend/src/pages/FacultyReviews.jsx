import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, XCircle, Clock, ExternalLink, Code } from "lucide-react";

export default function FacultyReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const token = getToken();
            const res = await axios.get("${API_URL}/api/submissions/pending", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setReviews(res.data.submissions);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id, status) => {
        const feedback = prompt(status === "APPROVED" ? "Optional Feedback:" : "Reason for Rejection:");
        if (feedback === null) return;

        try {
            const token = getToken();
            await axios.post(`${API_URL}/api/submissions/${id}/review`,
                { status, feedback },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(`Submission ${status}`);
            // Remove from list locally
            setReviews(prev => prev.filter(r => r._id !== id));
        } catch (err) {
            alert("Failed to update status");
        }
    };

    if (loading) return <div className="p-8">Loading Pending Reviews...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {reviews.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-clay-muted">
                    No pending reviews found.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {reviews.map(review => (
                        <div key={review._id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{review.userId?.name || "Unknown Student"}</h3>
                                    <p className="text-sm text-clay-muted mb-1">{review.userId?.email} • {review.topic}</p>
                                    {review.taskId?.type === "project" && (
                                       <div className="bg-slate-100 px-3 py-1.5 inline-flex flex-col rounded-lg mt-1">
                                          <span className="text-xs text-clay-muted font-medium">Project: <span className="text-clay-secondary font-bold">{review.taskId.title}</span></span>
                                          <span className="text-xs text-clay-muted font-medium mt-0.5">
                                            Phase {review.milestoneId}: <span className="text-clay-secondary font-bold">
                                              {review.taskId.phases?.[review.milestoneId - 1]?.milestone || "Phase"}
                                            </span>
                                          </span>
                                       </div>
                                    )}
                                </div>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full uppercase">
                                    Pending Review
                                </span>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm mb-6 border overflow-x-auto">
                                <div className="flex items-center gap-2 mb-2 text-clay-muted text-xs uppercase font-bold">
                                    <Code size={12} /> Submission Content
                                </div>
                                {review.code ? (
                                    <pre>{review.code}</pre>
                                ) : review.fileUrl ? (
                                    <a 
                                        href={review.fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-purple-600 flex items-center gap-2 underline font-bold"
                                    >
                                        <ExternalLink size={16} /> 
                                        {review.fileUrl.includes("/uploads/") ? "View Attached PDF" : "Open Project Link"}
                                    </a>
                                ) : (
                                    <span className="text-clay-muted italic">No content provided</span>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end mt-4">
                                <button
                                    onClick={() => handleReview(review._id, "REJECTED")}
                                    className="px-5 py-2.5 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-all font-bold flex items-center gap-2"
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                                <button
                                    onClick={() => handleReview(review._id, "APPROVED")}
                                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm transition-all font-bold flex items-center gap-2"
                                >
                                    <CheckCircle size={18} /> Approve & Unlock
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
