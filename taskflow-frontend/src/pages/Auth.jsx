import { API_URL } from "../utils/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles, GraduationCap, Briefcase, Copy, Check, ShieldAlert } from "lucide-react";
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

  const [copiedRole, setCopiedRole] = useState("");

  const handleAutoFill = (selectedRole, selectedEmail, selectedPassword) => {
    setIsSignup(false);
    setRole(selectedRole);
    setEmail(selectedEmail);
    setPassword(selectedPassword);
    setError("");
  };

  const handleCopy = (text, roleName) => {
    navigator.clipboard.writeText(text);
    setCopiedRole(roleName);
    setTimeout(() => setCopiedRole(""), 1500);
  };


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
        ? `${API_URL}/api/auth/register`
        : `${API_URL}/api/auth/login`;

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
        const userRole = data.user.role;
        // Use role-scoped keys so different roles don't overwrite each other
        localStorage.setItem(`token_${userRole}`, data.token);
        localStorage.setItem(`user_${userRole}`, JSON.stringify(data.user));
        // Store activeRole in sessionStorage (per-tab) — prevents cross-tab contamination
        // Tab A = admin, Tab B = student: they won't overwrite each other's activeRole
        sessionStorage.setItem("activeRole", userRole);

        // role-based routing
        if (userRole === "faculty") {
          navigate("/faculty");
        } else if (userRole === "admin") {
          navigate("/admin");
        } else {
          navigate("/student");
        }
      } else {
        // after signup → go back to login side
        setError(""); // Clear any previous errors
        alert(data.message || "Registration successful! Please wait for administrator approval.");
        setIsSignup(false);
        // Clear forms
        setName("");
        setEmail("");
        setPassword("");
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
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-stone-50 px-4 py-12 overflow-hidden">
      {/* Background ambient glowing blobs for Glassmorphism effect */}
      <div className="bg-blob-1"></div>
      <div className="bg-blob-2"></div>

      <div className="auth-container z-10">

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
                <option value="admin">Admin</option>
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
                {/* Admin signup hidden as per request */}
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

        {/* Glassmorphic Credentials & Registration Info Note */}
        <div className="glass-panel mt-6 p-5 text-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <h4 className="font-bold text-xs text-slate-800 tracking-wide uppercase">Quick Demo Access</h4>
          </div>

          <div className="grid grid-cols-1 gap-2.5 mb-3">
            {/* Student Row */}
            <div className="p-2.5 bg-white/40 rounded-xl border border-white/50 backdrop-blur-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full badge-student flex items-center gap-1 flex-shrink-0 w-20 justify-center">
                  <GraduationCap className="w-3 h-3" /> Student
                </span>
                <div className="text-[11px] text-slate-600 font-mono truncate flex flex-col">
                  <span className="truncate">student.demo@taskflow.com</span>
                  <span className="text-[9px] text-slate-400 font-semibold">Pass: Student@123</span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy("student.demo@taskflow.com", "stu-email")}
                  className="hover:text-slate-900 p-1 bg-white/60 rounded border border-slate-200/50 transition"
                  title="Copy Email"
                >
                  {copiedRole === "stu-email" ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleAutoFill("student", "student.demo@taskflow.com", "Student@123")}
                  className="btn-fill-demo"
                >
                  Auto Fill
                </button>
              </div>
            </div>

            {/* Faculty Row */}
            <div className="p-2.5 bg-white/40 rounded-xl border border-white/50 backdrop-blur-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full badge-faculty flex items-center gap-1 flex-shrink-0 w-20 justify-center">
                  <Briefcase className="w-3 h-3" /> Faculty
                </span>
                <div className="text-[11px] text-slate-600 font-mono truncate flex flex-col">
                  <span className="truncate">faculty.demo@taskflow.com</span>
                  <span className="text-[9px] text-slate-400 font-semibold">Pass: Faculty@123</span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy("faculty.demo@taskflow.com", "fac-email")}
                  className="hover:text-slate-900 p-1 bg-white/60 rounded border border-slate-200/50 transition"
                  title="Copy Email"
                >
                  {copiedRole === "fac-email" ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleAutoFill("faculty", "faculty.demo@taskflow.com", "Faculty@123")}
                  className="btn-fill-demo"
                >
                  Auto Fill
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200/50 flex gap-2 items-start text-[11px] text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              New accounts can be registered but will be set to <strong className="text-slate-600 font-semibold">pending</strong> and require admin approval before they can be used to log in.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}