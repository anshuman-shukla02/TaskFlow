import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth-3d.css";

export default function Auth() {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState("student");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isSignup
        ? "http://localhost:5002/api/auth/register"
        : "http://localhost:5002/api/auth/login";

      const payload = isSignup
        ? { name, email, password, role }
        : { email, password, role };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Auth failed");

      // store token only if present (login)
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      // store user if present
      if (data.user) {
        // localStorage.setItem("token", data.token); // Removed redundant/buggy line
        localStorage.setItem("user", JSON.stringify(data.user));

        // role-based routing
        if (data.user.role === "faculty") {
          navigate("/faculty");
        } else {
          navigate("/student");
        }
      } else {
        // after signup → go back to login side
        setIsSignup(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="auth-container">

        {/* Toggle */}
        <div className="text-center mb-6">
          <button
            onClick={() => setIsSignup(false)}
            className={`mr-6 font-bold ${!isSignup ? "text-navy-300" : "text-gray-400"}`}
          >
            LOGIN
          </button>
          <button
            onClick={() => setIsSignup(true)}
            className={`font-bold ${isSignup ? "text-navy-300" : "text-gray-400"}`}
          >
            SIGN UP
          </button>
        </div>

        {/* Card */}
        <div className={`card-3d ${isSignup ? "flip" : ""}`}>

          {/* LOGIN */}
          <div className="card-face">
            <h3 className="text-2xl font-bold text-center mb-6">Log In</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-dark"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>

              <input
                type="email"
                placeholder="Email"
                className="input-dark"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                className="input-dark"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button className="btn-yellow w-full" disabled={loading}>
                {loading ? "Please wait..." : "Login"}
              </button>
            </form>
          </div>

          {/* SIGNUP */}
          <div className="card-face card-back">
            <h3 className="text-2xl font-bold text-center mb-6">Sign Up</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-dark"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>

              <input
                type="text"
                placeholder="Full Name"
                className="input-dark"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                type="email"
                placeholder="Email"
                className="input-dark"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                className="input-dark"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button className="btn-yellow w-full" disabled={loading}>
                {loading ? "Please wait..." : "Create Account"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}