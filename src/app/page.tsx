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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateFile = (file: File): boolean => {
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
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
    "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 text-sm";

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-indigo-600 opacity-20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-purple-600 opacity-20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">

          {/* Top banner */}
          <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-8 py-7">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg">🚀</div>
              <span className="text-white/80 text-sm font-medium tracking-wide uppercase">Sensussoft</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">Job Application</h1>
            <p className="text-indigo-200 text-sm mt-1">Fill in your details to receive a custom coding task</p>
          </div>

          <div className="px-8 py-7">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Name + Email row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john@gmail.com"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Role Applying For
                </label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Junior React Developer"
                  className={inputClass}
                />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Years of Experience
                </label>
                <select
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="">Select experience level</option>
                  <option value="0-1 years">0–1 years (Fresher)</option>
                  <option value="1-2 years">1–2 years (Junior)</option>
                  <option value="3-5 years">3–5 years (Mid-level)</option>
                  <option value="5-7 years">5–7 years (Senior)</option>
                  <option value="7+ years">7+ years (Lead / Architect)</option>
                </select>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Skills
                </label>
                <textarea
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="e.g. React, Node.js, TypeScript, MongoDB"
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Resume Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Resume <span className="text-indigo-500">*</span>
                </label>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 px-5 py-5 text-center
                    ${dragOver
                      ? "border-indigo-500 bg-indigo-50"
                      : resumeFile
                        ? "border-green-400 bg-green-50"
                        : "border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-lg">
                        📄
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-green-700 truncate max-w-55">
                          {resumeFile.name}
                        </p>
                        <p className="text-xs text-green-500">
                          {(resumeFile.size / 1024).toFixed(0)} KB · Click to change
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResumeFile(null);
                          setResumeError("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="ml-auto text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-500 text-xl mx-auto mb-2">
                        ⬆️
                      </div>
                      <p className="text-sm font-medium text-gray-600">
                        Drag & drop or <span className="text-indigo-600 font-semibold">browse</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">PDF, DOC, DOCX · Max 5MB</p>
                    </div>
                  )}
                </div>

                {resumeError && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <span>⚠</span> {resumeError}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-300 disabled:to-purple-300 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 text-sm tracking-wide mt-1"
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generating Task...
                  </span>
                ) : (
                  "Submit Application →"
                )}
              </button>
            </form>

            {/* Status Message */}
            {message && (
              <div
                className={`mt-5 p-4 rounded-xl text-sm font-medium flex items-start gap-2.5 ${
                  status === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                <span className="text-base mt-0.5">{status === "success" ? "✅" : "❌"}</span>
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/40 text-xs mt-4">
          Your data is used only to generate a personalised task.
        </p>
      </div>
    </main>
  );
}

