import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyTasks from "./pages/FacultyTasks";
import FacultyAttendance from "./pages/FacultyAttendance";
import FacultyReviews from "./pages/FacultyReviews";
import FacultyPerformanceReport from "./pages/FacultyPerformanceReport";
import StudentDashboard from "./pages/StudentDashboard";
import StudentTasks from "./pages/StudentTasks";
import StudentAttendance from "./pages/StudentAttendance";
import StudentProgress from "./pages/StudentProgress";
import StudentProject from "./pages/StudentProject";
import StudentOverview from "./pages/StudentOverview";
import AdaptiveLearning from "./pages/AdaptiveLearning";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />

      {/* Faculty */}
      <Route path="/faculty" element={<FacultyDashboard />} />
      <Route path="/faculty/tasks" element={<FacultyTasks />} />
      <Route path="/faculty/attendance" element={<FacultyAttendance />} />
      <Route path="/faculty/reviews" element={<FacultyReviews />} />
      <Route path="/faculty/students" element={<StudentOverview />} />
      <Route path="/faculty/performance-report" element={<FacultyPerformanceReport />} />

      {/* Student */}
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/student/tasks" element={<StudentTasks />} />
      <Route path="/student/attendance" element={<StudentAttendance />} />
      <Route path="/student/progress" element={<StudentProgress />} />
      <Route path="/student/project" element={<StudentProject />} />
      <Route path="/student/adaptive-learning" element={<AdaptiveLearning />} />
    </Routes>
  );
}
