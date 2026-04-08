import { API_URL } from "../utils/api";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { User, Mail, Shield, CheckCircle, Camera, Clock, AlertCircle, IdCard, School } from "lucide-react";
import { motion } from "framer-motion";

const AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo"
];

/**
 * Derives the role from the URL path.
 * /admin/profile -> "admin"
 * /faculty/profile -> "faculty"
 * /student/profile -> "student"
 * This is 100% reliable — it always matches the DashboardLayout wrapper.
 */
function getRoleFromPath(pathname) {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/faculty")) return "faculty";
  return "student";
}

/**
 * Gets the auth token for a specific role from localStorage.
 * Avoids any shared/global state.
 */
function getTokenForRole(role) {
  // Try new scoped key first
  const scoped = localStorage.getItem(`token_${role}`);
  if (scoped) return scoped;
  // Fallback to legacy key (for sessions created before the fix)
  return localStorage.getItem("token");
}

export default function Profile() {
  const location = useLocation();
  const currentRole = getRoleFromPath(location.pathname);

  const [user, setUser] = useState({ name: "", email: "", role: currentRole, rollNumber: "", division: "" });
  const [editData, setEditData] = useState({ name: "", email: "", rollNumber: "", division: "" });
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const token = getTokenForRole(currentRole);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.user) {
          const freshUser = data.user;
          // Update the role-scoped localStorage key (not the shared "user" key)
          localStorage.setItem(`user_${currentRole}`, JSON.stringify(freshUser));
          setUser(freshUser);
          setEditData({
            name: freshUser.name || "",
            email: freshUser.email || "",
            rollNumber: freshUser.rollNumber || "",
            division: freshUser.division || ""
          });
          const savedAvatar = localStorage.getItem(`avatar_${freshUser._id}`) || AVATARS[0];
          setSelectedAvatar(savedAvatar);
          checkPendingRequest(token);
        }
      } catch (err) {
        console.error("Failed to load profile from server:", err);
        // Fallback to role-scoped localStorage
        const userData = localStorage.getItem(`user_${currentRole}`);
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            if (parsedUser) {
              setUser(parsedUser);
              setEditData({
                name: parsedUser.name || "",
                email: parsedUser.email || "",
                rollNumber: parsedUser.rollNumber || "",
                division: parsedUser.division || ""
              });
              const savedAvatar = localStorage.getItem(`avatar_${parsedUser._id}`) || AVATARS[0];
              setSelectedAvatar(savedAvatar);
              checkPendingRequest(token);
            }
          } catch (parseErr) {
            console.error("Failed to parse user data:", parseErr);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentRole]);


  const checkPendingRequest = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/profile-request`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.hasPending) {
        setHasPendingRequest(true);
      }
    } catch (err) {
      console.error("Failed to check requests:", err);
    }
  };


  const handleSaveAvatar = () => {
    localStorage.setItem(`avatar_${user._id}`, selectedAvatar);
    alert("Avatar updated successfully!");
  };

  const handleSubmitRequest = async () => {
    if (currentRole !== "admin" && hasPendingRequest) {
      alert("You already have a pending request. Please wait for admin approval.");
      return;
    }

    const token = getTokenForRole(currentRole);
    if (!token) {
      alert("Error: No security token found. Please log out and log back in.");
      return;
    }

    setSaving(true);
    try {
      const changedFields = {};
      if (editData.name !== user.name) changedFields.name = editData.name;
      if (editData.email !== user.email) changedFields.email = editData.email;
      if (editData.rollNumber !== user.rollNumber) changedFields.rollNumber = editData.rollNumber;
      if (editData.division !== user.division) changedFields.division = editData.division;

      if (Object.keys(changedFields).length === 0) {
        alert("No changes detected.");
        setSaving(false);
        return;
      }

      // Admin direct update vs Student/Faculty approval request
      const endpoint = currentRole === "admin"
        ? `${API_URL}/api/auth/profile-update`
        : `${API_URL}/api/auth/profile-change-request`;

      const method = currentRole === "admin" ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(changedFields)
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        if (currentRole === "admin") {
          setUser(data.user);
          localStorage.setItem(`user_${currentRole}`, JSON.stringify(data.user));
        } else {
          setHasPendingRequest(true);
        }
      } else {
        alert(data.message || "Failed to submit request");
      }

    } catch (err) {
      console.error("Submit request error:", err);
      alert("Server error occurred");
    } finally {
      setSaving(false);
    }
  };


  const isDataChanged =
    user && editData && (
      editData.name !== user.name ||
      editData.email !== user.email ||
      editData.rollNumber !== user.rollNumber ||
      editData.division !== user.division
    );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="clay-spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-10 pb-20 text-white relative shadow-lg overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
         
         <div className="relative z-10 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-extrabold mb-2">My Profile</h1>
              <p className="text-blue-100 text-lg">Update your profile data and submit for approval.</p>
            </div>
            <div className="px-4 py-1.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-sm font-bold tracking-wider uppercase">
               {currentRole} Account
            </div>
         </div>
      </div>

      {/* Main Profile Content Panel */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 -mt-16 relative z-20  p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
        
        {/* Left Column: Avatar Selection */}
        <div className="md:col-span-1 flex flex-col items-center border-r  pr-4">
            <div className="relative mb-6">
               <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-slate-50 overflow-hidden flex items-center justify-center">
                    {selectedAvatar.includes('dicebear') ? (
                       <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                       <span className="text-4xl font-bold text-clay-muted">{user.name?.charAt(0)}</span>
                    )}
               </div>
               <button 
                 onClick={handleSaveAvatar}
                 className="absolute bottom-0 right-0 p-2 clay-btn-primary shadow-lg cursor-pointer hover:bg-blue-700 transition transform hover:scale-105"
               >
                 <Camera size={18} />
               </button>
            </div>

            <h3 className="text-lg font-bold text-clay-text mb-4 w-full text-center">Customize Avatar</h3>
            <div className="flex flex-wrap gap-3 justify-center">
                {AVATARS.map((avatarUrl, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedAvatar(avatarUrl)}
                      className={`w-12 h-12 rounded-full cursor-pointer p-0.5 transition-all ${selectedAvatar === avatarUrl ? 'ring-2 ring-blue-600 ring-offset-2 clay-tint-sky' : 'bg-slate-50 hover:bg-slate-100'}`}
                    >
                        <img src={avatarUrl} alt={`Avatar ${idx}`} className="w-full h-full rounded-full" />
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Right Column: User Details Form */}
        <div className="md:col-span-2 space-y-6">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-clay-text flex items-center gap-2">
                  <User className="text-purple-600" size={24} /> Basic Information
               </h2>
               {hasPendingRequest && currentRole !== "admin" && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold">
                     <Clock size={14} /> Pending Approval
                  </span>
               )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                    <label className="text-sm font-semibold text-clay-secondary">Full Name</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-clay-muted" size={18} />
                       <input 
                           type="text" 
                           value={editData.name} 
                           onChange={(e) => setEditData({...editData, name: e.target.value})}
                           disabled={currentRole !== "admin" && hasPendingRequest}
                           className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-clay-secondary font-medium transition focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none ${currentRole !== "admin" && hasPendingRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
                       />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-clay-secondary">Email Address</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-clay-muted" size={18} />
                       <input 
                           type="email" 
                           value={editData.email} 
                           onChange={(e) => setEditData({...editData, email: e.target.value})}
                           disabled={currentRole !== "admin" && hasPendingRequest}
                           className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-clay-secondary font-medium transition focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none ${currentRole !== "admin" && hasPendingRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
                       />
                    </div>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-semibold text-clay-secondary">Roll / ID Number</label>
                   <div className="relative">
                      <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-clay-muted" size={18} />
                      <input 
                          type="text" 
                          value={editData.rollNumber} 
                          onChange={(e) => setEditData({...editData, rollNumber: e.target.value})}
                          disabled={currentRole !== "admin" && hasPendingRequest}
                          className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-clay-secondary font-medium transition focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none ${currentRole !== "admin" && hasPendingRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                   </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-clay-secondary">Division</label>
                    <div className="relative">
                       <School className="absolute left-4 top-1/2 -translate-y-1/2 text-clay-muted" size={18} />
                       <select 
                           value={editData.division} 
                           onChange={(e) => setEditData({...editData, division: e.target.value})}
                           disabled={currentRole !== "admin" && hasPendingRequest}
                           className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-clay-secondary font-medium transition focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none appearance-none ${currentRole !== "admin" && hasPendingRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
                       >
                          <option value="">Select Division</option>
                          <option value="A">Division A</option>
                          <option value="B">Division B</option>
                          <option value="C">Division C</option>
                       </select>
                    </div>
                </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50  flex items-start gap-4">
                <AlertCircle className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                <p className="text-xs text-clay-secondary leading-relaxed">
                   {currentRole === "admin"
                     ? <><span className="font-bold text-clay-text">Admin note:</span> Changes are applied immediately to your account.</>
                     : <><span className="font-bold text-clay-text">Note:</span> Demographic changes require admin approval. Your profile will be updated automatically upon approval.</>
                   }
                </p>
            </div>

            <div className="pt-6 border-t  flex justify-end">
                 <button 
                  onClick={handleSubmitRequest}
                  disabled={saving || !isDataChanged || (currentRole !== "admin" && hasPendingRequest)}
                  className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center gap-2"
                >
                    {saving
                      ? "Saving..."
                      : currentRole === "admin"
                      ? <><CheckCircle size={18}/> Save Changes</>
                      : hasPendingRequest
                      ? <><Clock size={18}/> Request Pending</>
                      : <><CheckCircle size={18}/> Submit for Approval</>
                    }
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
