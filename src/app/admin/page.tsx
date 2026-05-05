"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-500 opacity-[0.05] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600 opacity-[0.06] rounded-full blur-[130px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center text-base font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              S
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              Sensus<span className="text-cyan-400">soft</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to access the dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-700/60 shadow-[0_0_60px_rgba(34,211,238,0.06)] overflow-hidden">
          <div className="relative px-8 py-6 border-b border-slate-700/60">
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center text-lg">
                🔐
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Secure Login</p>
                <p className="text-slate-500 text-xs">Admin access only</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full border border-slate-700 rounded-xl px-4 py-3 text-slate-100 bg-slate-800/60 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 placeholder:text-slate-500 text-sm"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full border border-slate-700 rounded-xl px-4 py-3 pr-11 text-slate-100 bg-slate-800/60 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 placeholder:text-slate-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors text-sm"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                  <span>⚠</span> {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] text-sm tracking-wide overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In →"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Default: admin / sensussoft@123 — change via env vars
        </p>
      </div>
    </div>
  );
}
