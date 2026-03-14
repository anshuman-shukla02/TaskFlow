import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../styles/auth-3d.css";

export default function Auth() {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState("student");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Validation ──
  const validateForm = () => {
    // Email: must be a valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return false;
    }

    // Signup: name required
    if (isSignup && name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

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

  // ── Password strength indicator ──
  const getPasswordStrength = () => {
    if (!password) return { label: "", color: "", width: "0%" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: "Weak", color: "#ef4444", width: "33%" };
    if (score <= 3) return { label: "Fair", color: "#f59e0b", width: "55%" };
    if (score <= 4) return { label: "Good", color: "#22c55e", width: "80%" };
    return { label: "Strong", color: "#16a34a", width: "100%" };
  };

  const strength = getPasswordStrength();

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
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                title="Please enter a valid email (e.g. user@example.com)"
                required
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 8 chars, A-Z, a-z, 0-9)"
                  className="input-dark pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Forgot password */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => alert("A password reset link has been sent to your email (feature coming soon).")}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition"
                >
                  Forgot Password?
                </button>
              </div>

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
                minLength={2}
                required
              />

              <input
                type="email"
                placeholder="Email"
                className="input-dark"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                title="Please enter a valid email (e.g. user@example.com)"
                required
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 8 chars, A-Z, a-z, 0-9)"
                  className="input-dark pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password strength bar */}
              {password && (
                <div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: strength.width, backgroundColor: strength.color }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: strength.color }}>
                    {strength.label} — Use 8+ chars with uppercase, lowercase & numbers
                  </p>
                </div>
              )}

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