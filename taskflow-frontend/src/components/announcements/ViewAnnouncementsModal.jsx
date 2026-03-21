import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar } from "lucide-react";

export default function ViewAnnouncementsModal({ isOpen, onClose, announcements }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[80vh] flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold mb-6 text-slate-800">All Announcements</h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {announcements.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No announcements available.</p>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-slate-800">{announcement.title}</h3>
                    <div className="flex items-center text-xs text-slate-500 bg-white px-2 py-1 rounded-full shadow-sm">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm whitespace-pre-wrap">{announcement.content}</p>
                  <div className="mt-3 text-xs text-slate-400 font-medium">
                    Posted by {announcement.createdBy?.name || "Admin"}
                    {announcement.targetAudience && ` • Target: ${announcement.targetAudience.charAt(0).toUpperCase() + announcement.targetAudience.slice(1)}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
