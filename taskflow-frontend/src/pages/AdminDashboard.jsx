import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { 
  Users, 
  UserCheck, 
  MessageSquarePlus, 
  TrendingUp, 
  PieChart, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  School,
  IdCard,
  UserPlus,
  XCircle
} from "lucide-react";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import CreateAnnouncementModal from "../components/announcements/CreateAnnouncementModal";
import ConfirmationModal from "../components/common/ConfirmationModal";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalAnnouncements: 0,
    pendingRequests: 0,
    pendingUsers: 0,
    recentRegistrations: 0
  });
  const [divisionStats, setDivisionStats] = useState([]);
  const [growthData, setGrowthData] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", shadow: "shadow-blue-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", shadow: "shadow-emerald-200" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", shadow: "shadow-rose-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", shadow: "shadow-amber-200" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", shadow: "shadow-purple-200" },
  };

  const actionColors = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "hover:border-blue-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "hover:border-amber-200" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "hover:border-purple-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "hover:border-emerald-200" },
  };

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "Confirm",
    onConfirm: () => {},
    loading: false,
    showReasonInput: false,
    reason: ""
  });

  useEffect(() => {
    fetchDashboardData();
    fetchPendingUsers();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch stats
      const statsRes = await fetch("${API_URL}/api/admin/dashboard-stats", { headers });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
        setDivisionStats(statsData.divisionStats);
      }

      // Fetch growth
      const growthRes = await fetch("${API_URL}/api/admin/student-growth", { headers });
      const growthResult = await growthRes.json();
      if (growthResult.success && growthResult.growth) {
        setGrowthData(growthResult.growth.map(g => ({ name: g._id, users: g.count })));
      } else {
        setGrowthData([]);
      }


      // Fetch pending requests
      const requestsRes = await fetch("${API_URL}/api/admin/profile-requests", { headers });
      const requestsData = await requestsRes.json();
      if (requestsData.success) {
        setPendingRequests(requestsData.requests);
      }

      // Fetch announcements
      const annRes = await fetch("${API_URL}/api/announcements", { headers });
      const annData = await annRes.json();
      if (annData.success) {
        setAnnouncements(annData.announcements);
      }

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch("${API_URL}/api/admin/pending-users", {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setPendingUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch pending users:", err);
    }
  };

  const handleApprove = (id) => {
    setModalConfig({
      isOpen: true,
      title: "Approve Profile Update",
      message: "Are you sure you want to approve this profile change request? The user's information will be updated immediately.",
      type: "success",
      confirmText: "Approve",
      onConfirm: () => executeApproveProfile(id),
      loading: false
    });
  };

  const executeApproveProfile = async (id) => {
    setModalConfig(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`${API_URL}/api/admin/profile-requests/${id}/approve`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        setPendingRequests(prev => prev.filter(r => r._id !== id));
        setStats(prev => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
        setModalConfig({
          isOpen: true,
          title: "Profile Approved",
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
          message: data.message || "Failed to approve profile request.",
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
        message: "Failed to reach server.",
        type: "danger",
        confirmText: "Close",
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        loading: false
      });
    }
  };

  const handleReject = (id) => {
    const reason = prompt("Enter reason for rejection:"); // Still using prompt for reason, but let's at least handle it.
    if (reason === null) return;
    executeRejectProfile(id, reason);
  };

  const executeRejectProfile = async (id, reason) => {
    setModalConfig({
      isOpen: true,
      title: "Rejecting...",
      message: "Processing rejection request.",
      type: "warning",
      confirmText: "Wait",
      onConfirm: () => {},
      loading: true
    });
    try {
      const res = await fetch(`${API_URL}/api/admin/profile-requests/${id}/reject`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        setPendingRequests(prev => prev.filter(r => r._id !== id));
        setStats(prev => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
        setModalConfig({
          isOpen: true,
          title: "Profile Rejected",
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
          message: data.message || "Failed to reject profile request.",
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
        message: "Failed to reach server.",
        type: "danger",
        confirmText: "Close",
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        loading: false
      });
    }
  };

  const handleApproveUser = (id, name) => {
    setModalConfig({
      isOpen: true,
      title: "Approve Account",
      message: `Are you sure you want to approve the account for ${name}?`,
      type: "success",
      confirmText: "Approve",
      onConfirm: () => executeApproveUser(id, name),
      loading: false
    });
  };

  const executeApproveUser = async (id, name) => {
    setModalConfig(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/approve`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        setPendingUsers(prev => prev.filter(u => u._id !== id));
        setStats(prev => ({ ...prev, pendingUsers: prev.pendingUsers - 1 }));
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
        message: "Failed to reach server.",
        type: "danger",
        confirmText: "Close",
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        loading: false
      });
    }
  };

  const handleRejectUser = (id, name) => {
    setModalConfig({
      isOpen: true,
      title: "Reject Account",
      message: `Are you sure you want to reject the application from ${name}?`,
      type: "danger",
      confirmText: "Reject",
      onConfirm: () => executeRejectUser(id, name),
      loading: false
    });
  };

  const executeRejectUser = async (id, name) => {
    setModalConfig(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/reject`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        setPendingUsers(prev => prev.filter(u => u._id !== id));
        setStats(prev => ({ ...prev, pendingUsers: prev.pendingUsers - 1 }));
        setModalConfig({
          isOpen: true,
          title: "Rejected",
          message: data.message,
          type: "success", // Success icon but for rejection confirmation
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
        message: "Failed to reach server.",
        type: "danger",
        confirmText: "Close",
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        loading: false
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Approval/Rejection helpers can stay here as they are not Hooks

  const quickActions = [
    { name: "Manage Accounts", icon: <UserPlus size={24} />, desc: "Approve or reject registrations", color: "blue", action: () => navigate("/admin/user-approvals") },
    { name: "Review Profiles", icon: <Clock size={24} />, desc: "Verify profile update requests", color: "amber", action: () => navigate("/admin/profile-approvals") },
    { name: "Broadcast MSG", icon: <MessageSquarePlus size={24} />, desc: "Publish system announcements", color: "purple", action: () => setShowAnnouncementModal(true) },
    { name: "Student Roster", icon: <School size={24} />, desc: "View and manage students", color: "emerald", action: () => navigate("/admin/students") },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Institution Overview</h1>
          <p className="text-slate-500 mt-1">Management dashboard for system-wide monitoring and controls.</p>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((item) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={item.action}
            className={`min-h-[160px] bg-white rounded-3xl p-6 shadow-sm border border-slate-100 ${actionColors[item.color].border} hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden`}
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-2xl ${actionColors[item.color].bg} ${actionColors[item.color].text}`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-lg text-slate-800">{item.name}</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-[85%]">{item.desc}</p>
            </div>
            
            <div className="absolute right-6 bottom-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              <div className={`p-3 rounded-full ${actionColors[item.color].bg} ${actionColors[item.color].text} shadow-sm`}>
                <ChevronRight size={20} className="stroke-[3]" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Students", value: stats.totalStudents, icon: Users, color: "blue", trend: `+${stats.recentRegistrations} this month` },
          { label: "Active Faculty", value: stats.totalFaculty, icon: UserCheck, color: "emerald", trend: "Full staff active" },
          { label: "Account Requests", value: stats.pendingUsers, icon: UserPlus, color: "rose", trend: "Action required" },
          { label: "Profile Requests", value: stats.pendingRequests, icon: Clock, color: "amber", trend: "Verification needed" },
          { label: "Announcements", value: stats.totalAnnouncements, icon: MessageSquarePlus, color: "purple", trend: "System wide" }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${colorMap[item.color].bg} ${colorMap[item.color].text}`}>
                <item.icon size={24} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${colorMap[item.color].bg} ${colorMap[item.color].text} uppercase`}>
                {item.label.split(' ')[0]}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-slate-800">{item.value}</p>
              <p className="text-xs text-slate-500 mt-1">{item.label}</p>
              <div className="mt-3 flex items-center gap-1.5">
                 <span className={`text-[10px] font-bold ${colorMap[item.color].text}`}>{item.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Account Requests & Profile Requests — Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Requests */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                <UserPlus size={20} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">Account Requests</h2>
            </div>
            <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold">{pendingUsers.length} Pending</span>
          </div>
          <div className="flex-1 p-5 space-y-3">
            {pendingUsers.length > 0 ? (
              pendingUsers.slice(0, 3).map(user => (
                <div key={user._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.role} • {user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveUser(user._id, user.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleRejectUser(user._id, user.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-50 transition"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <UserPlus size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No pending accounts</p>
                <p className="text-xs mt-1">All registrations are processed</p>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/admin/user-approvals')}
            className="p-4 text-center text-sm font-bold text-blue-600 border-t border-slate-100 hover:bg-blue-50/50 rounded-b-3xl transition flex items-center justify-center gap-1"
          >
            See All Registrations <ChevronRight size={16} />
          </button>
        </div>

        {/* Profile Requests */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                <Clock size={20} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">Profile Requests</h2>
            </div>
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{pendingRequests.length} Pending</span>
          </div>
          <div className="flex-1 p-5 space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.slice(0, 3).map(req => (
                <div key={req._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {req.userId?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{req.userId?.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{req.userId?.role} • Div {req.userId?.division}</p>
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    {Object.entries(req.requestedChanges).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 capitalize w-16">{key}:</span>
                          <span className="text-slate-800 font-medium">{value}</span>
                        </div>
                      )
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(req._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-50 transition"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CheckCircle size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-1">No pending profile requests</p>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/admin/approvals')}
            className="p-4 text-center text-sm font-bold text-blue-600 border-t border-slate-100 hover:bg-blue-50/50 rounded-b-3xl transition flex items-center justify-center gap-1"
          >
            See All Requests <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Student Performance Charts */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-1">
          <TrendingUp className="text-blue-600" size={22} /> Student Performance
        </h2>
        <p className="text-sm text-slate-500 px-1 mb-4">Growth trends and enrollment distribution across divisions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Registration Growth</h3>
            <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-600 focus:ring-0 focus:outline-none">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData.length > 0 ? growthData : [{name: 'Jan', users: 10}, {name: 'Feb', users: 25}, {name: 'Mar', users: 45}]}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Division Breakdown Bar Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Enrollment by Division</h3>
            <span className="text-xs text-slate-400 font-medium">{stats.totalStudents} total students</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionStats.length > 0 ? divisionStats.map(d => ({ name: `Div ${d._id || 'N/A'}`, count: d.count })) : [{name: 'Div A', count: 45}, {name: 'Div B', count: 32}, {name: 'Div C', count: 28}]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={48}>
                  {(divisionStats.length > 0 ? divisionStats : [{},{},{}]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Faculty Performance — Coming Soon */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center">
        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <UserCheck size={24} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-600 mb-2">Faculty Performance Analytics</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">Faculty performance charts, task assignment metrics, and review statistics will appear here in a future update.</p>
      </div>

      <CreateAnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        userRole="admin"
        onSuccess={(newAnn) => {
          setAnnouncements([newAnn, ...announcements]);
          setStats(prev => ({ ...prev, totalAnnouncements: prev.totalAnnouncements + 1 }));
        }}
      />

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
