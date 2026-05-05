"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    experience: "",
    skills: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateFile = (file: File): boolean => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      setResumeError("Only PDF or Word (.doc/.docx) files are allowed.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("File size must be under 5MB.");
      return false;
    }
    setResumeError("");
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) setResumeFile(file);
    else setResumeFile(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) setResumeFile(file);
    else setResumeFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) {
      setResumeError("Please upload your resume.");
      return;
    }
    setStatus("loading");
    setMessage("");

    try {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("email", formData.email);
      payload.append("role", formData.role);
      payload.append("experience", formData.experience);
      payload.append("skills", formData.skills);
      payload.append("resume", resumeFile);

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "x-webhook-secret": "demo-secret-do-not-change" },
        body: payload,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(`Task generated and emailed to ${formData.email}! Check your inbox.`);
        setFormData({ name: "", email: "", role: "", experience: "", skills: "" });
        setResumeFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setStatus("error");
        setMessage(`Error: ${data.error || "Something went wrong"}`);
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Make sure the server is running.");
    }
  };

  const inputClass =
    "w-full border border-slate-700 rounded-xl px-4 py-3 text-slate-100 bg-slate-800/60 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 placeholder:text-slate-500 text-sm";

  const features = [
    {
      icon: "🤖",
      title: "AI-Powered Tasks",
      desc: "Our AI analyzes your resume and skills to generate a perfectly tailored coding challenge.",
    },
    {
      icon: "⚡",
      title: "Instant Delivery",
      desc: "Receive your personalized task directly in your inbox within seconds of submitting.",
    },
    {
      icon: "🎯",
      title: "Role-Specific",
      desc: "Tasks are crafted based on your target role and experience level — no generic tests.",
    },
    {
      icon: "🔒",
      title: "Secure & Private",
      desc: "Your data is encrypted and used solely to generate your task. Never shared.",
    },
    {
      icon: "📄",
      title: "Resume Analysis",
      desc: "We parse your resume to understand your background and tailor the difficulty accordingly.",
    },
    {
      icon: "🏆",
      title: "Stand Out",
      desc: "Show your skills with a task that highlights your strengths to our hiring team.",
    },
  ];

  const steps = [
    { num: "01", title: "Fill the Form", desc: "Enter your name, email, role, experience, and key skills." },
    { num: "02", title: "Upload Resume", desc: "Attach your resume in PDF or Word format (max 5MB)." },
    { num: "03", title: "Get Your Task", desc: "Receive a custom coding task in your inbox instantly." },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 overflow-x-hidden">

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-500 opacity-[0.05] rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] bg-blue-600 opacity-[0.06] rounded-full blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] bg-violet-600 opacity-[0.05] rounded-full blur-[120px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/80 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              S
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Sensus<span className="text-cyan-400">soft</span>
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">Features</a>
            <a href="#how-it-works" className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">How it Works</a>
            <a href="#apply" className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">Apply</a>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/admin"
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-lg"
            >
              Admin
            </a>
            <button
              onClick={scrollToForm}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            >
              Apply Now
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#0a0a0f]/95 px-6 py-4 flex flex-col gap-4">
            <a href="#features" onClick={() => setMenuOpen(false)} className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">Features</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">How it Works</a>
            <a href="#apply" onClick={() => setMenuOpen(false)} className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">Apply</a>
            <button
              onClick={scrollToForm}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg w-full"
            >
              Apply Now
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 text-cyan-400 text-xs font-semibold tracking-wide mb-6">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            Now Hiring — Apply Today
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Land Your Dream Job at{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Sensussoft
            </span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Submit your application and receive an AI-generated coding task tailored to your skills and experience — straight to your inbox.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToForm}
              className="relative bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-[0_0_25px_rgba(34,211,238,0.3)] hover:shadow-[0_0_35px_rgba(34,211,238,0.5)] text-base overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              Start Application →
            </button>
            <a
              href="#how-it-works"
              className="text-slate-400 hover:text-cyan-400 font-medium px-8 py-3.5 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all duration-200 text-base"
            >
              How it Works
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { val: "500+", label: "Applicants" },
              { val: "< 30s", label: "Task Delivery" },
              { val: "100%", label: "AI Powered" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-cyan-400">{s.val}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Why Choose Us</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Everything you need to get hired</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">Our platform makes the application process seamless, smart, and fast.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 rounded-2xl p-6 transition-all duration-300 hover:bg-slate-900/80 hover:shadow-[0_0_30px_rgba(34,211,238,0.06)]"
              >
                <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">How it works</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">Three simple steps to receive your personalized coding challenge.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
                )}
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                  <span className="text-cyan-400 font-bold text-lg">{s.num}</span>
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPLICATION FORM ── */}
      <section id="apply" ref={formRef} className="relative py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Get Started</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Apply Now</h2>
            <p className="text-slate-400 mt-4">Fill in your details and get a custom coding task in your inbox.</p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-700/60 shadow-[0_0_60px_rgba(34,211,238,0.06)] overflow-hidden">

            {/* Card header */}
            <div className="relative bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 px-8 py-6 border-b border-slate-700/60">
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center text-xl shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                  🚀
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Job Application</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Sensussoft — We&apos;re hiring talented developers</p>
                </div>
              </div>
            </div>

            <div className="px-8 py-8">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1.5">Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1.5">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@gmail.com" className={inputClass} />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1.5">Role Applying For</label>
                  <input type="text" name="role" value={formData.role} onChange={handleChange} required placeholder="e.g. Junior React Developer" className={inputClass} />
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1.5">Years of Experience</label>
                  <select name="experience" value={formData.experience} onChange={handleChange} required className={inputClass}>
                    <option value="" className="bg-slate-800">Select experience level</option>
                    <option value="0-1 years" className="bg-slate-800">0–1 years (Fresher)</option>
                    <option value="1-2 years" className="bg-slate-800">1–2 years (Junior)</option>
                    <option value="3-5 years" className="bg-slate-800">3–5 years (Mid-level)</option>
                    <option value="5-7 years" className="bg-slate-800">5–7 years (Senior)</option>
                    <option value="7+ years" className="bg-slate-800">7+ years (Lead / Architect)</option>
                  </select>
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1.5">Skills</label>
                  <textarea name="skills" value={formData.skills} onChange={handleChange} required rows={2} placeholder="e.g. React, Node.js, TypeScript, MongoDB" className={`${inputClass} resize-none`} />
                </div>

                {/* Resume Upload */}
                <div>
                  <label className="block text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1.5">
                    Resume <span className="text-cyan-400">*</span>
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 px-5 py-5 text-center
                      ${dragOver
                        ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                        : resumeFile
                          ? "border-emerald-500/60 bg-emerald-500/5"
                          : "border-slate-600 bg-slate-800/40 hover:border-cyan-500/60 hover:bg-cyan-500/5"
                      }`}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-400 text-lg">📄</div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-emerald-400 truncate max-w-[180px]">{resumeFile.name}</p>
                          <p className="text-xs text-emerald-500/70">{(resumeFile.size / 1024).toFixed(0)} KB · Click to change</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setResumeFile(null); setResumeError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="ml-auto text-slate-500 hover:text-red-400 transition-colors text-xl leading-none"
                          aria-label="Remove file"
                        >×</button>
                      </div>
                    ) : (
                      <div>
                        <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 text-xl mx-auto mb-2">⬆️</div>
                        <p className="text-sm font-medium text-slate-400">Drag & drop or <span className="text-cyan-400 font-semibold">browse</span></p>
                        <p className="text-xs text-slate-500 mt-0.5">PDF, DOC, DOCX · Max 5MB</p>
                      </div>
                    )}
                  </div>
                  {resumeError && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><span>⚠</span> {resumeError}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full relative bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] text-sm tracking-wide mt-1 overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {status === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generating Task...
                    </span>
                  ) : "Submit Application →"}
                </button>
              </form>

              {/* Status Message */}
              {message && (
                <div className={`mt-5 p-4 rounded-xl text-sm font-medium flex items-start gap-2.5 ${
                  status === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  <span className="text-base mt-0.5">{status === "success" ? "✅" : "❌"}</span>
                  <span>{message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-slate-800/80 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                S
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Sensus<span className="text-cyan-400">soft</span>
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How it Works</a>
              <a href="#apply" className="hover:text-cyan-400 transition-colors">Apply</a>
            </div>

            {/* Copyright */}
            <p className="text-slate-600 text-xs">
              © {new Date().getFullYear()} Sensussoft. All rights reserved.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <p className="text-slate-600 text-xs">
              Your data is used only to generate a personalised coding task. We respect your privacy.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
