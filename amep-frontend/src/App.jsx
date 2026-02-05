import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import FacultyDashboard from "./pages/FacultyDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyTasks from "./pages/FacultyTasks";
import StudentTasks from "./pages/StudentTasks";
import AdaptiveLearning from "./pages/AdaptiveLearning";
import FacultyAttendance from "./pages/FacultyAttendance";
import StudentOverview from "./pages/StudentOverview";
import StudentAttendance from "./pages/StudentAttendance";
import StudentProgress from "./pages/StudentProgress";
import StudentProject from "./pages/StudentProject";
import FacultyReviews from "./pages/FacultyReviews";
import FacultyPerformanceReport from "./pages/FacultyPerformanceReport";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />

        {/* Faculty Routes */}
        <Route path="/faculty/tasks" element={<FacultyTasks />} />
        <Route
          path="/faculty"
          element={
            <ErrorBoundary>
              <FacultyDashboard />
            </ErrorBoundary>
          }
        />
        <Route path="/faculty/attendance" element={<FacultyAttendance />} />
        <Route path="/faculty/reviews" element={<FacultyReviews />} />
        <Route path="/faculty/students" element={<StudentOverview />} />
        <Route path="/faculty/performance-report" element={<FacultyPerformanceReport />} />

        {/* Student Routes */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/tasks" element={<StudentTasks />} />
        <Route path="/student/attendance" element={<StudentAttendance />} />
        <Route path="/student/progress" element={<StudentProgress />} />


        <Route path="/student/project" element={<StudentProject />} />

        {/* Keeping flat for now as per dashboard links */}
        <Route path="/student/adaptive-learning" element={<AdaptiveLearning />} />
      </Routes>
    </BrowserRouter>
  );
}