"use client";

import { useState, useRef } from "react";

export default function SubmitTask() {
  const [email, setEmail]         = useState("");
  const [file, setFile]           = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [status, setStatus]       = useState<"idle" | "loading" | "success" | "error">("idle");
  const [progress, setProgress]   = useState(0);
  const [errorMsg, setErrorMsg]   = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.size > 20 * 1024 * 1024) { setFileError("File must be under 20MB."); setFile(null); return; }
    setFileError(""); setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setFileError("Please select a file."); return; }
    setStatus("loading"); setErrorMsg("");
    try {
      const payload = new FormData();
      payload.append("email", email);
      payload.append("file", file);
      const res  = await fetch("/api/upload-task", { method: "POST", body: payload });
      const data = await res.json();
      if (res.ok) { setStatus("success"); setProgress(data.progress); }
      else        { setStatus("error");   setErrorMsg(data.error || "Something went wrong."); }
    } catch {
      setStatus("error"); setErrorMsg("Network error. Please try again.");
    }
  };

  const barColor =
    progress >= 80 ? "#16a34a" :
    progress >= 50 ? "#d97706" : "#db2777";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-semibold text-gray-900 text-lg">Sensussoft</span>
          </div>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">← Back</a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {status === "success" ? (
            /* ── Success ── */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
              {/* Circle progress */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={barColor} strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: barColor }}>{progress}%</span>
                </div>
              </div>

              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">Task Submitted!</h2>
              <p className="text-gray-500 text-sm mb-1">
                AI estimated your completion at{" "}
                <strong style={{ color: barColor }}>{progress}%</strong>
              </p>
              <p className="text-gray-400 text-xs mt-2">
                HR has been notified with your file and progress report.
              </p>
            </div>

          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-gray-900">Submit Your Task</h1>
                <p className="text-gray-500 mt-1 text-sm">
                  Upload your completed work. HR will be notified automatically with an AI progress report.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Your Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="same email you applied with"
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* File */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Task File <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-1 text-xs">(zip, pdf, code files — max 20MB)</span>
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                      className={`cursor-pointer border-2 border-dashed rounded-xl px-5 py-8 text-center transition-all ${
                        dragOver ? "border-pink-400 bg-pink-50" :
                        file     ? "border-green-400 bg-green-50" :
                                   "border-gray-300 hover:border-pink-400 hover:bg-pink-50"
                      }`}
                    >
                      <input ref={fileRef} type="file"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                        className="hidden" />

                      {file ? (
                        <div className="flex items-center justify-center gap-3">
                          <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-green-700 truncate max-w-xs">{file.name}</p>
                            <p className="text-xs text-green-600">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                          </div>
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); setFile(null); setFileError(""); if (fileRef.current) fileRef.current.value = ""; }}
                            className="ml-auto text-gray-400 hover:text-red-500 transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <svg className="w-9 h-9 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <p className="text-sm text-gray-600">Drag & drop or <span className="text-pink-600 font-medium">browse</span></p>
                          <p className="text-xs text-gray-400 mt-1">Any file type · Max 20MB</p>
                        </>
                      )}
                    </div>
                    {fileError && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {fileError}
                      </p>
                    )}
                  </div>

                  {/* Error */}
                  {status === "error" && errorMsg && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                      {errorMsg}
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-colors"
                    >
                      {status === "loading" ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Uploading & Analysing...
                        </span>
                      ) : "Submit Task"}
                    </button>
                  </div>

                </form>
              </div>

              <p className="text-center text-xs text-gray-400 mt-5">
                Your file will be reviewed by AI and HR will be notified automatically.
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-4">
        <p className="text-center text-xs text-gray-400">© {new Date().getFullYear()} Sensussoft</p>
      </footer>
    </div>
  );
}
