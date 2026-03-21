import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

export default function CreateTaskModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    topic: "",
    difficulty: "medium",
    type: "task",
    bloomLevel: "REMEMBER",
    phases: [],
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhaseChange = (index, field, value) => {
    const newPhases = [...formData.phases];
    newPhases[index][field] = value;
    setFormData({ ...formData, phases: newPhases });
  };

  const addPhase = () => {
    setFormData({
      ...formData,
      phases: [
        ...formData.phases,
        {
          milestone: "",
          bloomLevel: "REMEMBER",
          task: "",
          type: "INFO",
          content: "",
        },
      ],
    });
  };

  const removePhase = (index) => {
    const newPhases = formData.phases.filter((_, i) => i !== index);
    setFormData({ ...formData, phases: newPhases });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Create New Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              required
              type="text"
              name="title"
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Implement Binary Search"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              required
              name="description"
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none h-24"
              value={formData.description}
              onChange={handleChange}
              placeholder="Task details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
              <input
                required
                type="text"
                name="topic"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                value={formData.topic}
                onChange={handleChange}
                placeholder="e.g. Algorithms"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                name="type"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="task">Task</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
              <select
                name="difficulty"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                value={formData.difficulty}
                onChange={handleChange}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bloom Level</label>
              <select
                name="bloomLevel"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                value={formData.bloomLevel}
                onChange={handleChange}
              >
                <option value="REMEMBER">Remember</option>
                <option value="UNDERSTAND">Understand</option>
                <option value="APPLY">Apply</option>
                <option value="ANALYZE">Analyze</option>
                <option value="EVALUATE">Evaluate</option>
                <option value="CREATE">Create</option>
              </select>
            </div>
          </div>

          {/* DYNAMIC PHASES (ONLY FOR PROJECTS) */}
          {formData.type === "project" && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Project Phases</h3>
                <button
                  type="button"
                  onClick={addPhase}
                  className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-200 transition"
                >
                  <Plus size={16} /> Add Phase
                </button>
              </div>

              {formData.phases.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-4 bg-slate-50 rounded-xl border border-dashed">
                  No phases added. Click "Add Phase" to build your project.
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {formData.phases.map((phase, index) => (
                     <div key={index} className="border border-slate-200 bg-slate-50 p-4 rounded-xl relative group">
                        <button
                          type="button"
                          onClick={() => removePhase(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-md opacity-0 group-hover:opacity-100 transition hover:bg-red-200"
                        >
                          <Trash2 size={16} />
                        </button>
                        
                        <div className="flex gap-2 items-center mb-3">
                           <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</span>
                           <h4 className="font-semibold text-sm">Phase Details</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                           <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Milestone Name</label>
                              <input
                                required
                                type="text"
                                className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-black"
                                value={phase.milestone}
                                onChange={(e) => handlePhaseChange(index, "milestone", e.target.value)}
                                placeholder="e.g. Understand problem"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Bloom Level</label>
                              <select
                                className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-black"
                                value={phase.bloomLevel}
                                onChange={(e) => handlePhaseChange(index, "bloomLevel", e.target.value)}
                              >
                                <option value="REMEMBER">Remember</option>
                                <option value="UNDERSTAND">Understand</option>
                                <option value="APPLY">Apply</option>
                                <option value="ANALYZE">Analyze</option>
                                <option value="EVALUATE">Evaluate</option>
                                <option value="CREATE">Create</option>
                              </select>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                           <div className="col-span-2">
                             <label className="block text-xs font-medium text-slate-700 mb-1">Task Assignment</label>
                             <input
                               required
                               type="text"
                               className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-black"
                               value={phase.task}
                               onChange={(e) => handlePhaseChange(index, "task", e.target.value)}
                               placeholder="e.g. Read requirements"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-slate-700 mb-1">Submission Type</label>
                             <select
                                className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-black"
                                value={phase.type}
                                onChange={(e) => handlePhaseChange(index, "type", e.target.value)}
                              >
                                <option value="INFO">Read Only (Info)</option>
                                <option value="CODE">Code/Pseudocode</option>
                                <option value="URL">Project Link (URL)</option>
                              </select>
                           </div>
                        </div>

                        {phase.type === "INFO" && (
                           <div>
                             <label className="block text-xs font-medium text-slate-700 mb-1">Content (Markdown Supported)</label>
                             <textarea
                               required
                               className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-black h-20"
                               value={phase.content}
                               onChange={(e) => handlePhaseChange(index, "content", e.target.value)}
                               placeholder="Provide detailed requirements, text, or instructions here..."
                             />
                           </div>
                        )}
                     </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-black text-white font-bold py-3 rounded-full hover:bg-slate-800 transition mt-2"
          >
            Create Task
          </button>
        </form>
      </div>
    </div>
  );
}
