
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { motion } from "framer-motion";

export default function FacultyPerformanceReport() {
    const location = useLocation();
    const navigate = useNavigate();
    const { report, division } = location.state || {};

    const handleExportPDF = () => {
        window.print();
    };

    if (!report) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900">No Report Found</h2>
                    <p className="text-slate-500 mt-2">Please generate a report from the dashboard first.</p>
                    <button
                        onClick={() => navigate("/faculty")}
                        className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:scale-105 transition"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8 print:p-0 print:bg-white">
            <div className="max-w-4xl mx-auto space-y-8 print:max-w-none print:w-full">
                {/* Header */}
                <div className="flex items-center justify-between print:hidden">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-600 hover:text-black transition"
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border rounded-full bg-white hover:bg-slate-50 transition text-sm font-medium">
                            <Share2 size={16} /> Share
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-slate-800 transition text-sm font-medium"
                        >
                            <Download size={16} /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Title Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Class Performance Analysis
                            </h1>
                            <p className="text-slate-500 mt-2 text-lg">
                                AI-Generated Report for <span className="font-semibold text-slate-800">{division === 'All' ? 'All Divisions' : `Division ${division} `}</span>
                            </p>
                            <div className="mt-4 flex gap-2">
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wide">
                                    AI Generated
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wide">
                                    {new Date().toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                            AI
                        </div>
                    </div>
                </motion.div>

                {/* Report Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl p-10 shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0"
                >
                    <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-h2:text-indigo-600 prose-a:text-blue-600 hover:prose-a:text-blue-500 print:prose-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                    </div>
                </motion.div>

                {/* Footer Suggestion */}
                <div className="text-center text-slate-400 text-sm">
                    Generated by Gemini AI • Insights based on real-time student performance data
                </div>
            </div>
        </div>
    );
}
