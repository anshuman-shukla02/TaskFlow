import React, { useState } from "react";
import { Menu, X, ChevronRight } from "lucide-react";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur z-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">TASKFLOW</div>

          <div className="hidden md:flex gap-8">
            <button onClick={() => scrollToSection("features")}>Features</button>
            <button onClick={() => scrollToSection("platform")}>Platform</button>
            <button onClick={() => scrollToSection("analytics")}>Analytics</button>
            <button onClick={() => scrollToSection("contact")}>Contact</button>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-3">
            <button onClick={() => scrollToSection("features")}>Features</button>
            <button onClick={() => scrollToSection("platform")}>Platform</button>
            <button onClick={() => scrollToSection("analytics")}>Analytics</button>
            <button onClick={() => scrollToSection("contact")}>Contact</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-24 text-center">
        <h1 className="text-7xl font-bold mb-6">Master everything.</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Adaptive learning that understands students, tracks growth, and closes learning gaps.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <a href="/auth" className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800">
            Get Started
          </a>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-white">
        <h2 className="text-5xl font-bold text-center mb-16">Adaptive Learning</h2>
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 px-6">
          <Feature title="Personalized Paths" desc="Every student learns differently. We adapt in real time." />
          <Feature title="Smart Progression" desc="Notes → Practice → Difficulty scaling → Mastery." />
          <Feature title="Actionable Analytics" desc="Students & teachers get clarity, not noise." />
        </div>
      </section>

      {/* PLATFORM (RESTORED) */}
      <section id="platform" className="py-20 bg-stone-50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 px-6 items-center">
          <div>
            <h2 className="text-5xl font-bold mb-6">Built for modern classrooms</h2>
            <p className="text-lg text-gray-600 mb-6">
              Taskflow combines structured content, adaptive assessments, attendance,
              tasks, and growth tracking — all in one platform.
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>✔ Topic-wise notes before questions</li>
              <li>✔ Adaptive difficulty progression</li>
              <li>✔ Tasks & project evaluation</li>
              <li>✔ Attendance-aware analytics</li>
            </ul>
          </div>

          <div className="bg-gray-900 text-white rounded-3xl p-10 space-y-4">
            <Stat label="Active Students" value="2,800+" />
            <Stat label="Topics Covered" value="120+" />
            <Stat label="Avg Mastery" value="87%" />
          </div>
        </div>
      </section>

      {/* ANALYTICS (RESTORED) */}
      <section id="analytics" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto text-center px-6">
          <h2 className="text-5xl font-bold mb-6">Growth analytics that matter</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-16">
            Understand learning gaps, topic mastery, task performance, and class trends —
            visually and intuitively.
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            <Metric value="95%" label="Retention" />
            <Metric value="3x" label="Faster Learning" />
            <Metric value="89%" label="Student Satisfaction" />
            <Metric value="24/7" label="Access" />
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 bg-stone-50 text-center">
        <h2 className="text-5xl font-bold mb-6">Ready to begin?</h2>
        <p className="text-lg text-gray-600 mb-8">
          Build mastery, not just completion.
        </p>
        <a href="/auth" className="bg-gray-900 text-white px-8 py-4 rounded-lg">
          Start Learning
        </a>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t text-center bg-white">
        <p className="text-gray-600">© Taskflow • Built for adaptive learning</p>
      </footer>
    </div>
  );
}

/* ---------- Small Components ---------- */

function Feature({ title, desc }) {
  return (
    <div className="p-8 bg-stone-50 rounded-xl shadow">
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-gray-600">{desc}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex justify-between bg-white/10 p-4 rounded-xl">
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <div className="p-8 bg-stone-50 rounded-xl">
      <div className="text-4xl font-bold">{value}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
}