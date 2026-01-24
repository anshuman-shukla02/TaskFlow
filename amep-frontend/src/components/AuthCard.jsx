import { useState } from "react";

export default function AuthCard({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");

  const handleSubmit = (e) => {
    e.preventDefault();
    // 🔴 TEMP MOCK (replace with API later)
    onAuthSuccess(role);
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
      {/* Toggle */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setMode("login")}
          className={`px-4 py-2 font-semibold ${
            mode === "login" ? "text-blue-900" : "text-gray-400"
          }`}
        >
          Login
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`px-4 py-2 font-semibold ${
            mode === "signup" ? "text-blue-900" : "text-gray-400"
          }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role */}
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="admin">Admin</option>
        </select>

        {mode === "signup" && (
          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 border rounded-lg"
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 border rounded-lg"
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded-lg"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800"
        >
          {mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
    </div>
  );
}