import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Profile from "./pages/Profile";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Faculty Pages
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyTasks from "./pages/FacultyTasks";
import FacultyAttendance from "./pages/FacultyAttendance";
import FacultyReviews from "./pages/FacultyReviews";
import FacultyPerformanceReport from "./pages/FacultyPerformanceReport";
import FacultyMaterials from "./pages/FacultyMaterials";
import FacultySubmissions from "./pages/FacultySubmissions";
import FacultyCreateTask from "./pages/FacultyCreateTask";
import StudentOverview from "./pages/StudentOverview";

// Student Pages
import StudentDashboard from "./pages/StudentDashboard";
import StudentTasks from "./pages/StudentTasks";
import StudentAttendance from "./pages/StudentAttendance";
import StudentProgress from "./pages/StudentProgress";
import StudentProject from "./pages/StudentProject";
import AdaptiveLearning from "./pages/AdaptiveLearning";
import StudentMaterials from "./pages/StudentMaterials";
import Leaderboard from "./pages/Leaderboard";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminStudents from "./pages/AdminStudents";
import AdminProfileApprovals from "./pages/AdminProfileApprovals";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminUserApprovals from "./pages/AdminUserApprovals";




export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />

      {/* Faculty */}
      <Route element={<ProtectedRoute role="faculty"><DashboardLayout role="faculty" /></ProtectedRoute>}>
        <Route path="/faculty" element={<FacultyDashboard />} />
        <Route path="/faculty/tasks" element={<FacultyTasks />} />
        <Route path="/faculty/attendance" element={<FacultyAttendance />} />
        <Route path="/faculty/reviews" element={<FacultyReviews />} />
        <Route path="/faculty/students" element={<StudentOverview />} />
        <Route path="/faculty/performance-report" element={<FacultyPerformanceReport />} />
        <Route path="/faculty/materials" element={<FacultyMaterials />} />
        <Route path="/faculty/submissions" element={<FacultySubmissions />} />
        <Route path="/faculty/tasks/create" element={<FacultyCreateTask />} />
        <Route path="/faculty/profile" element={<Profile />} />
      </Route>

      {/* Student */}
      <Route element={<ProtectedRoute role="student"><DashboardLayout role="student" /></ProtectedRoute>}>
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/tasks" element={<StudentTasks />} />
        <Route path="/student/attendance" element={<StudentAttendance />} />
        <Route path="/student/progress" element={<StudentProgress />} />
        <Route path="/student/project" element={<StudentProject />} />
        <Route path="/student/adaptive-learning" element={<AdaptiveLearning />} />
        <Route path="/student/materials" element={<StudentMaterials />} />
        <Route path="/student/leaderboard" element={<Leaderboard />} />
        <Route path="/student/profile" element={<Profile />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute role="admin"><DashboardLayout role="admin" /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/approvals" element={<AdminProfileApprovals />} />
        <Route path="/admin/user-approvals" element={<AdminUserApprovals />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />


        <Route path="/admin/settings" element={<div className="p-8">Settings (Coming Soon)</div>} />
        <Route path="/admin/profile" element={<Profile />} />
      </Route>

      </Routes>
    </ErrorBoundary>
  );
}
