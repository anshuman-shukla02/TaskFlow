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
            const res = await axios.get("http://localhost:5002/api/submissions/pending", {
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
            await axios.post(`http://localhost:5002/api/submissions/${id}/review`,
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
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-slate-400">
                    No pending reviews found.
                </div>
            ) : (
                <div className="grid gap-6">
                    {reviews.map(review => (
                        <div key={review._id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{review.userId?.name || "Unknown Student"}</h3>
                                    <p className="text-sm text-slate-500 mb-1">{review.userId?.email} • {review.topic}</p>
                                    {review.taskId?.type === "project" && (
                                       <div className="bg-slate-100 px-3 py-1.5 inline-flex flex-col rounded-lg mt-1">
                                          <span className="text-xs text-slate-500 font-medium">Project: <span className="text-slate-700 font-bold">{review.taskId.title}</span></span>
                                          <span className="text-xs text-slate-500 font-medium mt-0.5">
                                            Phase {review.milestoneId}: <span className="text-slate-700 font-bold">
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
                                <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs uppercase font-bold">
                                    <Code size={12} /> Submission Content
                                </div>
                                {review.code ? (
                                    <pre>{review.code}</pre>
                                ) : review.fileUrl ? (
                                    <a 
                                        href={review.fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-blue-600 flex items-center gap-2 underline font-bold"
                                    >
                                        <ExternalLink size={16} /> 
                                        {review.fileUrl.includes("/uploads/") ? "View Attached PDF" : "Open Project Link"}
                                    </a>
                                ) : (
                                    <span className="text-slate-400 italic">No content provided</span>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => handleReview(review._id, "REJECTED")}
                                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium flex items-center gap-2"
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                                <button
                                    onClick={() => handleReview(review._id, "APPROVED")}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 font-bold shadow-sm flex items-center gap-2"
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
