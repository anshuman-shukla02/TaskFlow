import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { Puzzle, ChevronRight, ArrowLeft } from "lucide-react";
import axios from "axios";
import StudentProjectStepper from "../components/StudentProjectStepper";

export default function StudentProject() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.tasks) {
        const projList = res.data.tasks.filter(t => t.type === "project" && t.phases && t.phases.length > 0);
        setProjects(projList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSubmissions = async (projectId) => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/api/submissions/project/status/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSubmissionsList(res.data.submissions || []);
      }
    } catch (err) {
      console.error("Fetch submissions error:", err);
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setActivePhaseIndex(0);
    fetchProjectSubmissions(project._id);
  };

  const handlePhaseSubmit = async (phaseData) => {
    setSubmitting(true);
    try {
      const token = getToken();
      const res = await axios.post(`${API_URL}/api/submissions/project`, {
        taskId: selectedProject._id,
        milestoneId: phaseData.milestoneId,
        bloomLevel: phaseData.bloomLevel,
        task: phaseData.task,
        code: phaseData.code,
        fileUrl: phaseData.fileUrl,
        type: phaseData.type,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success && res.data.submission) {
        setSubmissionsList((prev) => {
          const filtered = prev.filter((s) => Number(s.milestoneId) !== Number(res.data.submission.milestoneId));
          return [...filtered, res.data.submission];
        });
        if (phaseData.type !== "INFO" && phaseData.milestoneId !== 0) {
          alert("Submitted for Faculty Review!");
        }
        fetchProjectSubmissions(selectedProject._id);
      }
    } catch (err) {
      alert("Submission error: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Full Screen Projects Grid List View
  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col justify-center items-center text-center mb-10 pt-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent tracking-tight">
                Project Based Learning & Capstone
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-lg mx-auto">
                Complete multi-phase capstone projects. Each phase requires faculty approval before unlocking the next.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500 font-medium">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xs border p-12 text-center text-slate-500 font-medium">
              No project capstones assigned yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((proj) => (
                <div
                  key={proj._id}
                  onClick={() => handleSelectProject(proj)}
                  className="min-h-[220px] bg-white rounded-3xl p-6 shadow-xs border border-slate-100 hover:border-purple-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                        <Puzzle size={26} />
                      </div>
                      <span className="text-xs font-bold px-3 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                        {proj.phases?.length || 0} Phases
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold mb-2 text-slate-900 leading-tight">{proj.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{proj.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 capitalize">Difficulty: {proj.difficulty}</span>
                    <div className="p-2.5 rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Full Screen Selected Project Gated Stepper View
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-6 md:p-8 relative">
      {/* Floating Back Button (replaces DashboardLayout button when project is selected to return to project list) */}
      <div className="fixed top-6 left-6 z-[110]">
        <button
          onClick={() => setSelectedProject(null)}
          className="p-2.5 bg-white text-slate-700 hover:bg-slate-100 rounded-full shadow-lg border border-slate-200 transition-colors flex items-center justify-center group cursor-pointer"
          title="Back to Projects List"
        >
          <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4 pl-14 md:pl-16">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{selectedProject.title}</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Topic: {selectedProject.topic}</p>
          </div>
        </div>

        <StudentProjectStepper
          task={selectedProject}
          submissions={submissionsList}
          activePhase={activePhaseIndex}
          setActivePhase={setActivePhaseIndex}
          onSubmitPhase={handlePhaseSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
