import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Download, Share2, Sparkles, BarChart, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

/* ── Custom Markdown Components for a Premium UI ────────────────── */
const MarkdownComponents = {
  // Headers
  h1: ({ node, ...props }) => (
    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2 mb-8 pb-4 border-b-2 border-slate-100" {...props} />
  ),
  h2: ({ node, children, ...props }) => {
    // We can pick an icon based on header text for a cooler look
    const text = String(children).toLowerCase();
    let Icon = BarChart;
    if (text.includes("executive")) Icon = Sparkles;
    else if (text.includes("bloom")) Icon = GraduationCap;
    
    return (
      <div className="mt-12 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
          <Icon size={20} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 m-0" {...props}>
          {children}
        </h2>
      </div>
    );
  },
  h3: ({ node, ...props }) => (
    <h3 className="text-lg font-bold text-slate-700 mt-8 mb-4 border-l-4 border-indigo-500 pl-3" {...props} />
  ),

  // Paragraphs
  p: ({ node, ...props }) => (
    <p className="text-slate-600 text-base leading-relaxed mb-6" {...props} />
  ),

  // Lists
  ul: ({ node, ...props }) => (
    <ul className="space-y-3 mb-8 pl-1" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal space-y-3 mb-8 pl-5 text-slate-600 marker:text-indigo-600 marker:font-bold" {...props} />
  ),
  li: ({ node, ordered, ...props }) => (
    <li className={`text-slate-600 text-base leading-relaxed ${ordered ? "" : "flex items-start gap-3"}`} {...props}>
      {!ordered && (
        <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
      )}
      <span>{props.children}</span>
    </li>
  ),

  // Emphasis
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-slate-900 bg-indigo-50 px-1 py-0.5 rounded text-[15px]" {...props} />
  ),
  em: ({ node, ...props }) => (
    <em className="italic text-slate-500" {...props} />
  ),

  // Blockquotes
  blockquote: ({ node, ...props }) => (
    <blockquote className="my-6 border-l-4 border-indigo-200 bg-indigo-50/50 p-5 rounded-r-2xl italic text-slate-700 font-medium" {...props} />
  ),
};

export default function FacultyPerformanceReport() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // The report might have the "fallback" note from previous executions, so we strip it out cleanly here too just in case.
  const rawReport = (location.state?.report || "").replace(
    /\*Note: This is a fallback report\. Configure a valid Gemini API key for AI-powered analysis\.\*/g, 
    ""
  ).trim();

  const handleExportPDF = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Class Performance Insights',
          text: 'Here is the generated class performance insights report from TaskFlow.',
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Report link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  if (!rawReport) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <BarChart size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">No Report Found</h2>
          <p className="text-slate-500 mt-2">Please run an analysis from the dashboard first.</p>
          <button
            onClick={() => navigate("/faculty")}
            className="mt-6 px-8 py-2.5 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-700 transition shadow-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 font-sans print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:w-full">
        
        {/* ── Top Header Bar ── */}
        <div className="flex justify-end print:hidden mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition text-sm font-semibold shadow-sm"
            >
              <Share2 size={16} /> Share
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition text-sm font-semibold shadow-sm"
            >
              <Download size={16} /> Export as PDF
            </button>
          </div>
        </div>

        {/* ── Abstract / Meta Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-3xl p-8 lg:p-10 text-white shadow-xl flex items-center justify-between relative overflow-hidden print:bg-white print:text-black print:border print:shadow-none"
        >
          {/* Decorative faint circles */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none print:hidden" />
          <div className="absolute bottom-0 left-10 -mb-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none print:hidden" />

          <div className="relative z-10 flex-1 min-w-0 pr-8">
            <div className="flex gap-3 mb-4 flex-wrap">
              <span className="px-3 py-1 bg-white/15 text-white text-[10px] font-bold rounded-full uppercase tracking-wider print:bg-slate-100 print:text-slate-500">
                AI Generated Analysis
              </span>
              <span className="px-3 py-1 bg-white/15 text-white text-[10px] font-bold rounded-full uppercase tracking-wider print:bg-slate-100 print:text-slate-500">
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight">
              Class Performance Insights
            </h1>
            <p className="text-slate-400 mt-3 text-sm font-medium">
              Data-driven analysis powered by Google Gemini.
            </p>
          </div>

          <div className="relative z-10 shrink-0 hidden sm:flex h-20 w-20 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl items-center justify-center text-white shadow-lg border border-white/10 print:hidden">
            <Sparkles size={32} />
          </div>
        </motion.div>

        {/* ── Main Report Body ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-8 lg:p-14 shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0"
        >
          <div className="report-markdown print:text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {rawReport}
            </ReactMarkdown>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-xs font-semibold uppercase tracking-widest pt-4 pb-8 print:hidden">
          Generated automatically by TaskFlow platform
        </div>
      </div>
    </div>
  );
}
