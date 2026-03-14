import { useState } from "react";
import { X } from "lucide-react";

export default function CreateTaskModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    topic: "",
    difficulty: "medium",
    type: "task",
    bloomLevel: "REMEMBER",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
