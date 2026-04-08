import { API_URL } from "../utils/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../utils/auth";
import TaskFormOverlay, { EMPTY_TASK, sanitiseQuestions } from "../components/faculty/TaskFormOverlay";

export default function FacultyCreateTask() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_TASK });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, questions: sanitiseQuestions(form) };
      const res = await fetch(`${API_URL}/api/tasks/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        navigate("/faculty/tasks");
      } else {
        alert("Failed to create task: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Failed to create task", err);
      alert("Failed to create task. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TaskFormOverlay
      form={form}
      setForm={setForm}
      onSave={handleCreate}
      onBack={() => navigate("/faculty/tasks")}
      isSaving={saving}
      isEdit={false}
    />
  );
}
