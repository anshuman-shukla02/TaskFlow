import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Users, 
  Clock, 
  Bell, 
  CheckCircle,
  Search,
  Filter
} from "lucide-react";
import CreateAnnouncementModal from "../components/announcements/CreateAnnouncementModal";

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAudience, setFilterAudience] = useState("all");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("http://localhost:5002/api/announcements", {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const res = await fetch(`http://localhost:5002/api/announcements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(prev => prev.filter(a => a._id !== id));
        alert("Announcement deleted successfully!");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         ann.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterAudience === "all" || ann.targetAudience === filterAudience;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="clay-spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-clay-text flex items-center gap-3">
            <Megaphone className="text-purple-600" size={32} />
            System Announcements
          </h1>
          <p className="text-clay-muted mt-1">Broadcast important updates to faculty and students across the institution.</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 clay-btn-primary"
        >
          <Plus size={20} />
          Create New Broadcast
        </motion.button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm  flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-clay-muted" size={18} />
          <input 
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2 clay-input transition"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="text-clay-muted" size={18} />
          <select 
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value)}
            className="bg-slate-50  rounded-xl px-4 py-2 text-sm font-medium text-clay-secondary outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Everywhere</option>
            <option value="faculty">Faculty Only</option>
            <option value="student">Students Only</option>
            <option value="all_role">System Wide (All)</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((ann) => (
              <motion.div
                key={ann._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="clay-card-solid p-6 hover:shadow-md transition group overflow-hidden relative"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg clay-tint-sky text-purple-600`}>
                        <Bell size={18} />
                      </div>
                      <h3 className="text-xl font-bold text-clay-text group-hover:text-purple-600 transition tracking-tight">
                        {ann.title}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ann.targetAudience === 'all' ? 'clay-tint-purple text-purple-600' :
                        ann.targetAudience === 'faculty' ? 'clay-tint-amber text-amber-600' : 'clay-tint-mint text-emerald-600'
                      }`}>
                        {ann.targetAudience}
                      </span>
                    </div>
                    
                    <p className="text-clay-secondary leading-relaxed text-sm whitespace-pre-wrap">
                      {ann.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] font-medium text-clay-muted">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} />
                        By {ann.createdBy?.name || "System Admin"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {new Date(ann.createdAt).toLocaleDateString()} at {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDelete(ann._id)}
                    className="p-2.5 text-slate-300 hover:text-rose-600 hover:clay-tint-rose rounded-xl transition duration-300"
                    title="Delete Announcement"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed ">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <Megaphone size={32} />
              </div>
              <h3 className="text-lg font-bold text-clay-secondary">No announcements found</h3>
              <p className="text-clay-muted text-sm mt-1">Try adjusting your filters or create a new broadcast.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <CreateAnnouncementModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userRole="admin"
        onSuccess={(newAnn) => {
          setAnnouncements([newAnn, ...announcements]);
        }}
      />
    </div>
  );
}
