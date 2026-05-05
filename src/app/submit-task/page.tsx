"use client";

import { useState, useRef } from "react";

export default function SubmitTask() {
  const [email, setEmail]         = useState("");
  const [file, setFile]           = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [status, setStatus]       = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult]       = useState<{ progress: number; fileUrl: string } | null>(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.size > 20 * 1024 * 1024) { setFileError("File must be under 20MB."); setFile(null); return; }
    setFileError("");
    setFile(f);
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
      if (res.ok) { setStatus("success"); setResult({ progress: data.progress, fileUrl: data.fileUrl }); }
      else        { setStatus("error");   setErrorMsg(data.error || "Something went wrong."); }
    } catch {
      setStatus("error"); setErrorMsg("Network error. Please try again.");
    }
  };

  const barColor =
    (result?.progress ?? 0) >= 80 ? "#16a34a" :
    (result?.progress ?? 0) >= 50 ? "#d97706" : "#db2777";

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">

      {/* GitHub-style top navbar */}
      <header className="bg-[#161b22] border-b border-[#30363d] px-6 py-3 flex items-center gap-4">
        {/* GitHub logo */}
        <svg height="32" viewBox="0 0 16 16" fill="#e6edf3" className="w-8 h-8">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        <span className="text-[#e6edf3] font-semibold text-sm">hastivasani5-lang / taskmanager</span>
        <span className="ml-auto">
          <a href="/" className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors">← Back to site</a>
        </span>
      </header>

      {/* Repo nav tabs */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-6">
        <div className="flex gap-1 text-sm">
          {["Code", "Issues", "Pull requests", "Actions", "Settings"].map((tab) => (
            <span
              key={tab}
              className={`px-3 py-3 text-xs cursor-default ${
                tab === "Code"
                  ? "text-[#e6edf3] border-b-2 border-[#f78166] font-semibold"
                  : "text-[#8b949e]"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">

        {status === "success" && result ? (
          /* ── Success ── */
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-10 text-center">
            <div className="relative w-28 h-28 mx-auto mb-5">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#21262d" strokeWidth="10" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={barColor} strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - result.progress / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: barColor }}>{result.progress}%</span>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-[#e6edf3] mb-2">File uploaded successfully!</h2>
            <p className="text-[#8b949e] text-sm mb-1">AI estimated task completion: <strong style={{ color: barColor }}>{result.progress}%</strong></p>
            <p className="text-[#8b949e] text-xs mb-6">HR has been notified with your submission and file.</p>
            <a href={result.fileUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded-md transition-colors font-medium">
              View on GitHub →
            </a>
          </div>

        ) : (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm mb-4 text-[#8b949e]">
              <span className="text-[#58a6ff] hover:underline cursor-pointer">taskmanager</span>
              <span>/</span>
              <span className="text-[#e6edf3] font-semibold">Upload completed task</span>
            </div>

            {/* Upload card — GitHub style */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">

              {/* Card header */}
              <div className="px-6 py-4 border-b border-[#30363d] flex items-center gap-3">
                <svg className="w-5 h-5 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-[#e6edf3] font-semibold text-sm">Upload files</span>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#e6edf3] mb-1.5">
                    Your Email <span className="text-[#f85149]">*</span>
                    <span className="text-[#8b949e] font-normal ml-2 text-xs">(same email you applied with)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] text-sm placeholder:text-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                  />
                </div>

                {/* Drop zone */}
                <div>
                  <label className="block text-sm font-medium text-[#e6edf3] mb-1.5">
                    Task File <span className="text-[#f85149]">*</span>
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                    className={`cursor-pointer border-2 border-dashed rounded-lg px-6 py-10 text-center transition-all ${
                      dragOver ? "border-[#58a6ff] bg-[#1f2937]" :
                      file     ? "border-[#238636] bg-[#0f2a1a]" :
                                 "border-[#30363d] hover:border-[#58a6ff] hover:bg-[#161b22]"
                    }`}
                  >
                    <input ref={fileRef} type="file"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                      className="hidden" />

                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <svg className="w-6 h-6 text-[#3fb950]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-left">
                          <p className="text-sm font-medium text-[#3fb950] truncate max-w-xs">{file.name}</p>
                          <p className="text-xs text-[#8b949e]">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                        </div>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); setFile(null); setFileError(""); if (fileRef.current) fileRef.current.value = ""; }}
                          className="ml-auto text-[#8b949e] hover:text-[#f85149] transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg className="w-10 h-10 text-[#484f58] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <p className="text-sm text-[#8b949e]">
                          Drag files here to add them to your repository
                        </p>
                        <p className="text-xs text-[#484f58] mt-1">or</p>
                        <span className="inline-block mt-2 text-xs bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-[#e6edf3] px-3 py-1.5 rounded-md cursor-pointer transition-colors">
                          choose your files
                        </span>
                        <p className="text-xs text-[#484f58] mt-3">Any file type · Max 20MB</p>
                      </>
                    )}
                  </div>
                  {fileError && (
                    <p className="text-xs text-[#f85149] mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {fileError}
                    </p>
                  )}
                </div>

                {/* Commit changes section */}
                <div className="border border-[#30363d] rounded-lg overflow-hidden">
                  <div className="bg-[#161b22] px-4 py-3 border-b border-[#30363d]">
                    <p className="text-sm font-semibold text-[#e6edf3]">Commit changes</p>
                  </div>
                  <div className="p-4 bg-[#0d1117] space-y-3">
                    <input
                      type="text"
                      defaultValue="Add completed task files"
                      readOnly
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] text-sm focus:outline-none"
                    />
                    <textarea
                      placeholder="Add an optional extended description..."
                      rows={2}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] text-sm placeholder:text-[#484f58] focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Error */}
                {status === "error" && errorMsg && (
                  <div className="bg-[#2d1117] border border-[#f85149]/30 rounded-md px-4 py-3 text-sm text-[#f85149]">
                    {errorMsg}
                  </div>
                )}

                {/* Submit button */}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-md text-sm transition-colors"
                  >
                    {status === "loading" ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Uploading...
                      </span>
                    ) : "Commit changes"}
                  </button>
                  <button type="button" onClick={() => window.history.back()}
                    className="text-sm text-[#e6edf3] hover:text-white bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] px-4 py-2 rounded-md transition-colors">
                    Cancel
                  </button>
                </div>

              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
