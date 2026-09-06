import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LogOut, User, Menu, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ErrorBoundary from "../common/ErrorBoundary";

export default function DashboardLayout({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Restore activeRole in sessionStorage so getToken() works across tabs/refreshes
    sessionStorage.setItem("activeRole", role);
    
    const userData = localStorage.getItem(`user_${role}`);
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error("Failed to parse user data in DashboardLayout:", err);
      }
    }
  }, [role]);


  const handleLogout = () => {
    // Clear this role's persisted token/user data
    localStorage.removeItem(`token_${role}`);
    localStorage.removeItem(`user_${role}`);
    // Clear this tab's active role from sessionStorage
    sessionStorage.removeItem("activeRole");
    navigate("/");
  };

  const studentLinks = [
    { section: "Main", items: [
      { name: "Dashboard", path: "/student" },
      { name: "Tasks", path: "/student/tasks" },
      { name: "Adaptive Learning", path: "/student/adaptive-learning" },
      { name: "Study Materials", path: "/student/materials" },
      { name: "Project", path: "/student/project" }
    ]},
    { section: "Academics", items: [
      { name: "Attendance", path: "/student/attendance" },
      { name: "Progress", path: "/student/progress" },
      { name: "Leaderboard", path: "/student/leaderboard" }
    ]}
  ];

  const facultyLinks = [
    { section: "Main", items: [
      { name: "Dashboard", path: "/faculty" },
      { name: "Students", path: "/faculty/students" },
      { name: "Tasks", path: "/faculty/tasks" },
      { name: "Study Materials", path: "/faculty/materials" },
      { name: "Reviews", path: "/faculty/reviews" },
      { name: "Submissions", path: "/faculty/submissions" }
    ]},
    { section: "Academics", items: [
      { name: "Attendance", path: "/faculty/attendance" },
      { name: "Performance Report", path: "/faculty/performance-report" }
    ]}
  ];

  const adminLinks = [
    { section: "Administration", items: [
      { name: "Dashboard", path: "/admin" },
      { name: "Students Overview", path: "/admin/students" },
      { name: "Profile Approvals", path: "/admin/approvals" },
      { name: "Account Approvals", path: "/admin/user-approvals" },
      { name: "Announcements", path: "/admin/announcements" }, // Keeping existing for now
      { name: "Settings", path: "/admin/settings" }
    ]}


  ];

  const links = role === "admin" ? adminLinks : role === "faculty" ? facultyLinks : studentLinks;

  const titleMap = {
    "/student": "Student Dashboard",
    "/student/tasks": "My Tasks",
    "/student/adaptive-learning": "Adaptive Learning",
    "/student/attendance": "My Attendance",
    "/student/progress": "My Progress",
    "/student/project": "Project Based Learning",
    "/faculty": "Faculty Dashboard",
    "/faculty/tasks": "Manage Tasks",
    "/faculty/students": "Student Overview",
    "/faculty/reviews": "Project Reviews",
    "/faculty/attendance": "Class Attendance",
    "/faculty/performance-report": "Performance Reports",
    "/faculty/materials": "Study Materials",
    "/faculty/submissions": "Submissions Hub",
    "/faculty/profile": "My Profile",
    "/student/profile": "My Profile",
    "/student/materials": "Study Materials",
    "/student/leaderboard": "Leaderboard & Badges",
    "/admin/students": "Student Registration & Growth",
    "/admin/approvals": "Profile Change Requests",
    "/admin/user-approvals": "Account Registration Requests",
    "/admin/announcements": "System Announcements",
    "/admin/settings": "System Settings",
    "/admin/profile": "My Profile"


  };

  const currentTitle = titleMap[location.pathname] || (role === "admin" ? "Admin Portal" : role === "faculty" ? "Faculty Portal" : "Student Portal");

  const isRootDashboard = location.pathname === "/faculty" || location.pathname === "/student" || location.pathname === "/admin";

  // Determine if the current route should be fullscreen (no navbar, no sidebar)
  const fullScreenRoutes = [
    "/student/tasks",
    "/student/adaptive-learning",
    "/student/materials",
    "/student/project",
    "/faculty/tasks/create",
    "/faculty/performance-report"
  ];
  const isFullScreen = fullScreenRoutes.includes(location.pathname);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 font-sans text-slate-900 print:h-auto print:overflow-visible">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && !isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      {!isFullScreen && (
        <div className={`fixed lg:static top-0 left-0 h-screen w-64 bg-slate-900 text-white p-6 space-y-6 flex flex-col z-50 transform transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="flex justify-between items-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">TASKFLOW</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
          {links.map((group) => (
            <div key={group.section} className="space-y-2">
              <p className="text-xs uppercase text-slate-400 tracking-wider mb-2">{group.section}</p>
              {group.items.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition ${location.pathname === item.path ? "bg-blue-600/20 text-blue-400 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          ))}
          <div className="border-t border-slate-700/50 my-4" />
        </div>

        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-3 rounded-xl bg-slate-800/50 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition flex items-center gap-3 font-medium"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        {/* TOP NAVBAR */}
        {!isFullScreen && (
          <header className="flex items-center justify-between px-6 lg:px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 lg:hidden focus:outline-none">
              <Menu size={24} className="text-slate-600" />
            </button>
            <div className="flex gap-4 items-center">
              {!isRootDashboard && (
                  <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full transition-colors flex items-center justify-center h-10 w-10">
                      <ArrowLeft size={20} />
                  </button>
              )}
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                  {currentTitle}
                </h1>
                <div className="h-1 w-16 bg-blue-600 rounded-full mt-1.5 opacity-80" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div 
                onClick={() => navigate(`/${role}/profile`)}
                className="flex items-center gap-3 px-4 py-2 border border-slate-200 bg-slate-50 flex-row rounded-full shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-inner overflow-hidden border border-slate-200">
                   {localStorage.getItem(`avatar_${user?._id}`) ? (
                      <img src={localStorage.getItem(`avatar_${user._id}`)} alt="User Avatar" className="w-full h-full object-cover" />
                   ) : (
                      <User size={16} />
                   )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-slate-800 leading-tight">{user.name}</p>
                  <p className="text-xs font-medium text-slate-500 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </header>
        )}

        {/* PAGE CONTENT */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 ${isFullScreen ? "" : "p-6 lg:p-8"} print:overflow-visible print:p-0`}>
          {isFullScreen && (
            <button
              onClick={() => {
                if (location.pathname.startsWith("/faculty")) {
                  navigate("/faculty/tasks");
                } else if (location.pathname.startsWith("/student")) {
                  navigate("/student");
                } else if (location.pathname.startsWith("/admin")) {
                  navigate("/admin");
                } else {
                  navigate("/");
                }
              }}
              className="fixed top-6 left-6 z-[100] p-2.5 bg-white text-slate-700 hover:bg-slate-100 rounded-full shadow-lg border border-slate-200 transition-colors flex items-center justify-center group shadow-md cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
