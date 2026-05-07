"use client";

import { useState, useRef, useEffect } from "react";

// ── Valid IT role keywords (client-side quick check) ──────────────────────
const TECH_KEYWORDS =
  /react|node|python|java|php|ruby|swift|kotlin|flutter|angular|vue|next|express|django|spring|sql|css|html|javascript|typescript|aws|gcp|azure|docker|git|api|ui|ux|qa|devops|sre|cloud|mobile|backend|frontend|fullstack|full.stack|software|engineer|developer|designer|manager|analyst|tester|automation|security|figma|product|data|ml|ai|golang|rust|scala|kotlin|android|ios/i;

function isRoleValid(role: string): boolean {
  const r = role.trim();
  if (r.length < 3) return false;
  return TECH_KEYWORDS.test(r);
}

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    experience: "",
    skills: "",
  });
  const [resumeFile, setResumeFile]   = useState<File | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [dragOver, setDragOver]       = useState(false);
  const [status, setStatus]           = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage]         = useState("");

  // Role validation state
  const [roleError, setRoleError]     = useState("");
  const [roleTouched, setRoleTouched] = useState(false);
  const roleDebounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Debounced role validation on every keystroke ──────────────────────
  useEffect(() => {
    if (!roleTouched) return;
    if (roleDebounceRef.current) clearTimeout(roleDebounceRef.current);

    roleDebounceRef.current = setTimeout(() => {
      const r = formData.role.trim();
      if (r.length === 0) {
        setRoleError("");
        return;
      }
      if (!isRoleValid(r)) {
        setRoleError(
          "Please enter a valid IT/software role (e.g. React Developer, UI/UX Designer, QA Engineer)."
        );
      } else {
        setRoleError("");
      }
    }, 600); // 600ms debounce

    return () => {
      if (roleDebounceRef.current) clearTimeout(roleDebounceRef.current);
    };
  }, [formData.role, roleTouched]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "role") setRoleTouched(true);
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

    // Block submit if role is invalid
    setRoleTouched(true);
    if (!isRoleValid(formData.role)) {
      setRoleError(
        "Please enter a valid IT/software role (e.g. React Developer, UI/UX Designer, QA Engineer)."
      );
      return;
    }

    if (!resumeFile) {
      setResumeError("Please upload your resume.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const payload = new FormData();
      payload.append("name",       formData.name);
      payload.append("email",      formData.email);
      payload.append("role",       formData.role);
      payload.append("experience", formData.experience);
      payload.append("skills",     formData.skills);
      payload.append("resume",     resumeFile);

      const res  = await fetch("/api/submit", { method: "POST", body: payload });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(`Application submitted! Your task has been sent to ${formData.email}.`);
        setFormData({ name: "", email: "", role: "", experience: "", skills: "" });
        setResumeFile(null);
        setRoleTouched(false);
        setRoleError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  // Role field border color
  const roleBorderClass =
    roleError
      ? "border-red-400 focus:ring-red-400"
      : formData.role && !roleError && roleTouched
      ? "border-green-400 focus:ring-green-400"
      : "border-gray-300 focus:ring-pink-500";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="font-semibold text-gray-900 text-lg">Sensussoft</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Job Application</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Fill in your details and we&apos;ll send a custom task to your inbox.
            </p>
          </div>

          {/* Success state */}
          {status === "success" ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Application Submitted!</h2>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <button
                onClick={() => { setStatus("idle"); setMessage(""); }}
                className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
              >
                Submit another application
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <form onSubmit={handleSubmit} className="p-8 space-y-6">

                {/* Row 1: Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="john@example.com"
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Role — with real-time validation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Role Applying For <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      onBlur={() => setRoleTouched(true)}
                      required
                      placeholder="e.g. Junior React Developer, UI/UX Designer, QA Engineer"
                      className={`w-full border rounded-lg px-3.5 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-9 ${roleBorderClass}`}
                    />
                    {/* Inline status icon */}
                    {roleTouched && formData.role.length > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {roleError ? (
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Role error alert */}
                  {roleError && (
                    <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-xs font-semibold text-red-700">Invalid Role</p>
                        <p className="text-xs text-red-600 mt-0.5">{roleError}</p>
                        <p className="text-xs text-red-500 mt-1">
                          Valid examples: <span className="font-medium">React Developer · UI/UX Designer · QA Engineer · DevOps Engineer · Product Manager</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Role valid hint */}
                  {!roleError && roleTouched && formData.role.length > 0 && (
                    <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Role looks good — AI will analyse and generate a matching task
                    </p>
                  )}
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Years of Experience <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all bg-white"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Skills <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    required
                    rows={3}
                    placeholder="e.g. React, Node.js, TypeScript, MongoDB"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Resume Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Resume <span className="text-red-500">*</span>
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`cursor-pointer border-2 border-dashed rounded-lg px-5 py-6 text-center transition-all ${
                      dragOver
                        ? "border-pink-400 bg-pink-50"
                        : resumeFile
                        ? "border-green-400 bg-green-50"
                        : "border-gray-300 hover:border-pink-400 hover:bg-pink-50"
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
                        <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-left">
                          <p className="text-sm font-medium text-green-700 truncate max-w-xs">{resumeFile.name}</p>
                          <p className="text-xs text-green-600">{(resumeFile.size / 1024).toFixed(0)} KB · Click to change</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResumeFile(null);
                            setResumeError("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remove file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <p className="text-sm text-gray-600">
                          Drag & drop or{" "}
                          <span className="text-pink-600 font-medium">browse</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX · Max 5MB</p>
                      </div>
                    )}
                  </div>
                  {resumeError && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {resumeError}
                    </p>
                  )}
                </div>

                {/* Submit error */}
                {status === "error" && message && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {message}
                  </div>
                )}

                {/* Submit button */}
                <div className="border-t border-gray-100 pt-2">
                  <button
                    type="submit"
                    disabled={status === "loading" || !!roleError}
                    className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-colors"
                  >
                    {status === "loading" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Analysing your profile &amp; generating task...
                      </span>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Your data is used only to generate a personalised task.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 px-6">
        <p className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Sensussoft. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
