import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCheck, 
  XSquare, 
  UserPlus, 
  Search, 
  Filter,
  Mail,
  Shield,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import ConfirmationModal from "../components/common/ConfirmationModal";

export default function AdminUserApprovals() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "Confirm",
    onConfirm: () => {},
    loading: false
  });

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch("http://localhost:5002/api/admin/pending-users", {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setPendingUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch pending users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id, name) => {
    setModalConfig({
      isOpen: true,
      title: "Approve Account",
      message: `Are you sure you want to approve the account for ${name}?`,
      type: "success",
      confirmText: "Approve",
      onConfirm: () => executeApprove(id, name),
      loading: false
    });
  };

  const executeApprove = async (id, name) => {
    setModalConfig(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`http://localhost:5002/api/admin/users/${id}/approve`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        setPendingUsers(prev => prev.filter(u => u._id !== id));
        setModalConfig({
          isOpen: true,
          title: "Approved!",
          message: data.message,
          type: "success",
          confirmText: "Close",
          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
          loading: false
        });
      } else {
        setModalConfig({
          isOpen: true,
          title: "Error",
          message: data.message || "Failed to approve user.",
          type: "danger",
          confirmText: "Close",
          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
          loading: false
        });
      }
    } catch (err) {
      setModalConfig({
        isOpen: true,
        title: "Connection Error",
        message: "Failed to reach the server.",
        type: "danger",
        confirmText: "Close",
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        loading: false
      });
    }
  };

  const handleReject = (id, name) => {
    setModalConfig({
      isOpen: true,
      title: "Reject Account",
      message: `Are you sure you want to reject the application from ${name}?`,
      type: "danger",
      confirmText: "Reject",
      onConfirm: () => executeReject(id, name),
      loading: false
    });
  };

  const executeReject = async (id, name) => {
    setModalConfig(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`http://localhost:5002/api/admin/users/${id}/reject`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        setPendingUsers(prev => prev.filter(u => u._id !== id));
        setModalConfig({
          isOpen: true,
          title: "Rejected",
          message: data.message,
          type: "success",
          confirmText: "Close",
          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
          loading: false
        });
      } else {
        setModalConfig({
          isOpen: true,
          title: "Error",
          message: data.message || "Failed to reject user.",
          type: "danger",
          confirmText: "Close",
          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
          loading: false
        });
      }
    } catch (err) {
      setModalConfig({
        isOpen: true,
        title: "Connection Error",
        message: "Failed to reach the server.",
        type: "danger",
        confirmText: "Close",
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        loading: false
      });
    }
  };

  const filteredUsers = pendingUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserPlus className="text-blue-600" size={32} />
            Registration Approvals
          </h1>
          <p className="text-slate-500 mt-1">Review new student and faculty applications for access to the system.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="text-slate-400" size={18} />
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Roles</option>
            <option value="student">Students Only</option>
            <option value="faculty">Faculty Only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition relative flex flex-col"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-xl shadow-inner border border-blue-100">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 truncate max-w-[150px]">{user.name}</h3>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'faculty' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-6 flex-1">
                   <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail size={14} className="text-slate-400" />
                      <span className="truncate">{user.email}</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={14} className="text-slate-400" />
                      <span>Applied: {new Date(user.createdAt).toLocaleDateString()}</span>
                   </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(user._id, user.name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button 
                    onClick={() => handleReject(user._id, user.name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white text-rose-600 border border-rose-100 rounded-xl text-xs font-bold hover:bg-rose-50 transition"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-24 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
               <UserPlus size={48} className="mb-4 opacity-10" />
               <h3 className="text-lg font-bold text-slate-700">No applications pending</h3>
               <p className="text-sm">There are no new registrations waiting for review.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        loading={modalConfig.loading}
      />
    </div>
  );
}
