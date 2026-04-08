import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Shield, 
  Mail, 
  IdCard, 
  School,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowRight,
  X
} from "lucide-react";
import ConfirmationModal from "../components/common/ConfirmationModal";

export default function AdminProfileApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Modal state
  const [modalConfig, setModalConfig] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection reason modal state
  const [rejectModal, setRejectModal] = useState(null); // { id }
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/profile-requests`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (id) => {
    setModalConfig({
      id,
      type: "success",
      title: "Approve Profile Change",
      message: "Are you sure you want to approve and apply these profile changes?",
      confirmText: "Approve & Apply",
      action: "approve"
    });
  };

  const handleRejectClick = (id) => {
    setRejectReason("");
    setRejectModal({ id });
  };

  const executeApprove = async (id) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/profile-requests/${id}/approve`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRequests(prev => prev.filter(r => r._id !== id));
        setModalConfig({
          id: null,
          type: "success",
          title: "Changes Applied!",
          message: "The profile update has been approved and applied successfully.",
          confirmText: "Done",
          action: "done"
        });
      } else {
        setModalConfig(null);
        alert("Failed to approve: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Approval error:", err);
      setModalConfig(null);
      alert("Network error during approval.");
    } finally {
      setActionLoading(false);
    }
  };

  const executeReject = async () => {
    if (!rejectModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/profile-requests/${rejectModal.id}/reject`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: rejectReason || "No reason provided" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRequests(prev => prev.filter(r => r._id !== rejectModal.id));
        setRejectModal(null);
      } else {
        alert("Failed to reject: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Rejection error:", err);
      alert("Network error during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleModalConfirm = () => {
    if (!modalConfig) return;
    if (modalConfig.action === "approve") {
      executeApprove(modalConfig.id);
    } else if (modalConfig.action === "done") {
      setModalConfig(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="clay-spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">

      {/* Approval Confirmation Modal */}
      {modalConfig && (
        <ConfirmationModal
          isOpen={!!modalConfig}
          onClose={() => { if (!actionLoading) setModalConfig(null); }}
          onConfirm={handleModalConfirm}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          confirmText={modalConfig.confirmText}
          loading={actionLoading}
        />
      )}

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 clay-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-600" />
              <button
                onClick={() => { if (!actionLoading) setRejectModal(null); }}
                className="absolute top-6 right-6 p-2 text-clay-muted hover:text-clay-secondary rounded-xl hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center text-center mt-4 mb-6">
                <div className="w-20 h-20 clay-tint-rose text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                  <XCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-clay-text mb-3">Reject Request</h2>
                <p className="text-clay-muted text-sm">Provide a reason for the rejection (optional).</p>
              </div>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full border rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-slate-50"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setRejectModal(null)}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-3.5 clay-btn-ghost transition font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={executeReject}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-3.5 clay-btn-danger rounded-2xl transition font-bold text-sm shadow-xl shadow-rose-100 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "Reject"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-clay-text">Profile Change Requests</h1>
          <p className="text-clay-muted mt-1">Review and approve demographic data changes requested by users.</p>
        </div>
        <div className="clay-badge clay-tint-amber text-amber-700 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm">
           <Clock size={18} /> {requests.length} Pending
        </div>
      </div>

      {requests.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {requests.map((req) => (
              <motion.div
                key={req._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="clay-card-solid overflow-hidden hover:shadow-md transition"
              >
                {/* Header */}
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition"
                  onClick={() => setExpandedId(expandedId === req._id ? null : req._id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl clay-tint-sky flex items-center justify-center text-purple-600 font-extrabold text-2xl uppercase border border-purple-100 shadow-sm">
                       {req.userId?.name?.charAt(0)}
                    </div>
                    <div>
                       <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-clay-text">{req.userId?.name}</h3>
                          <span className="px-2 py-0.5 bg-slate-100 text-clay-secondary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            {req.userId?.role}
                          </span>
                       </div>
                       <p className="text-sm text-clay-muted flex items-center gap-1.5 mt-0.5">
                          <Mail size={14} /> {req.userId?.email}
                       </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                     <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-clay-muted mb-0.5 uppercase tracking-tighter">Fields to Update</p>
                        <div className="flex gap-1 justify-end">
                           {Object.keys(req.requestedChanges).filter(k => req.requestedChanges[k]).map(field => (
                             <span key={field} className="px-2 py-0.5 clay-tint-sky text-purple-600 rounded text-[9px] font-bold uppercase border border-purple-100">
                                {field}
                             </span>
                           ))}
                        </div>
                     </div>
                     <div className="p-2 rounded-full bg-slate-100 text-clay-muted transition">
                        {expandedId === req._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                     </div>
                  </div>
                </div>

                {/* Expanded View */}
                <AnimatePresence>
                  {expandedId === req._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t  bg-slate-50/50"
                    >
                      <div className="p-8 space-y-8">
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
                           <AlertCircle size={18} /> Comparison Details
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                           {Object.entries(req.requestedChanges).map(([key, value]) => (
                             value && (
                               <div key={key} className="bg-white p-5 rounded-2xl border shadow-sm space-y-3">
                                  <div className="flex items-center gap-2 mb-1">
                                     <div className="p-1.5 bg-slate-100 rounded-lg text-clay-secondary">
                                       {key === 'name' ? <User size={14}/> : key === 'email' ? <Mail size={14}/> : key === 'rollNumber' ? <IdCard size={14}/> : <School size={14}/>}
                                     </div>
                                     <p className="text-xs font-bold text-clay-muted uppercase tracking-widest">{key}</p>
                                  </div>
                                  
                                  <div className="space-y-2">
                                     <div className="p-3 clay-tint-rose border border-rose-100 rounded-xl relative">
                                        <p className="text-[10px] font-bold text-rose-300 absolute -top-2 left-3 bg-white px-1">CURRENT</p>
                                        <p className="text-sm font-medium text-rose-700 line-through opacity-60 truncate">{req.userId?.[key] || "Empty"}</p>
                                     </div>
                                     <div className="flex justify-center -my-2 relative z-10">
                                        <div className="bg-purple-600 text-white p-1 rounded-full shadow-lg border-2 border-white">
                                           <ArrowRight size={12} />
                                        </div>
                                     </div>
                                     <div className="p-3 clay-tint-mint border border-emerald-100 rounded-xl relative">
                                        <p className="text-[10px] font-bold text-emerald-400 absolute -top-2 left-3 bg-white px-1">REQUESTED</p>
                                        <p className="text-sm font-bold text-emerald-900 truncate">{value}</p>
                                     </div>
                                  </div>
                               </div>
                             )
                           ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                           <button 
                             onClick={() => handleRejectClick(req._id)}
                             className="px-6 py-3 bg-white text-rose-600 border border-rose-200 rounded-xl font-bold hover:clay-tint-rose transition active:scale-95"
                           >
                              Reject Request
                           </button>
                           <button 
                             onClick={() => handleApproveClick(req._id)}
                             className="px-8 py-3 clay-btn-success font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition active:scale-95 flex items-center gap-2"
                           >
                              <CheckCircle size={20} /> Approve & Apply Changes
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed ">
           <div className="w-20 h-20 clay-tint-mint rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-inner">
              <CheckCircle size={40} />
           </div>
           <h3 className="text-xl font-bold text-clay-text tracking-tight">System is up to date</h3>
           <p className="text-clay-muted text-sm mt-1">There are no pending profile change requests needing your attention.</p>
        </div>
      )}
    </div>
  );
}
