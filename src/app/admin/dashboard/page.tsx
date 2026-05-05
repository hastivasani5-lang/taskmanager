"use client";

import { useState, useEffect, useCallback } from "react";

interface Submission {
  id: string;
  name: string;
  email: string;
  role: string;
  experience: string;
  skills: string;
  resumeFilename?: string;
  taskTitle?: string;
  submittedAt: string;
  status: "pending" | "reviewed" | "rejected";
}

const STATUS_CONFIG = {
  pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  reviewed: { label: "Reviewed", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-600 ring-1 ring-red-200" },
};

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/submissions");
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } catch {
      setError("Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const updateStatus = async (id: string, status: Submission["status"]) => {
    setActionLoading(id + status);
    try {
      await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm("Delete this submission?")) return;
    setActionLoading(id + "delete");
    try {
      await fetch("/api/admin/submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      if (selected?.id === id) setSelected(null);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = submissions.filter((s) => {
    const matchFilter = filter === "all" || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    reviewed: submissions.filter((s) => s.status === "reviewed").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " at " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col">

      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-pink-600 rounded-md flex items-center justify-center text-white font-bold text-xs">
              S
            </div>
            <span className="font-semibold text-gray-900 text-sm">Sensussoft</span>
            <span className="text-gray-300 text-sm">/</span>
            <span className="text-gray-500 text-sm">Applications</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">
              {stats.total} total · {stats.pending} pending
            </span>
            <button
              onClick={fetchSubmissions}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 w-full flex-1 flex flex-col gap-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Applications", value: stats.total,    icon: "📋", accent: "text-gray-800",    bg: "bg-white" },
            { label: "Pending Review",      value: stats.pending,  icon: "⏳", accent: "text-amber-600",  bg: "bg-amber-50" },
            { label: "Reviewed",            value: stats.reviewed, icon: "✅", accent: "text-emerald-600",bg: "bg-emerald-50" },
            { label: "Rejected",            value: stats.rejected, icon: "✕",  accent: "text-red-600",    bg: "bg-red-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between`}>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
              </div>
              <span className="text-2xl opacity-60">{s.icon}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Filter tabs */}
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {(["all", "pending", "reviewed", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-pink-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 w-full sm:w-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or role..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-7 w-7 text-pink-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-gray-400">Loading applications...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600 text-sm text-center">{error}</div>
        ) : (
          <div className="flex gap-5 flex-1">

            {/* Table */}
            <div className={`flex-1 min-w-0 flex flex-col gap-2 ${selected ? "hidden lg:flex" : ""}`}>
              {filtered.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center flex-1 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl mb-3">📭</div>
                  <p className="text-gray-600 font-medium text-sm">No applications found</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {submissions.length === 0 ? "Waiting for first application..." : "Try a different filter or search"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      <span>Applicant</span>
                      <span className="hidden md:block">Role</span>
                      <span>Status</span>
                      <span className="hidden sm:block">Date</span>
                      <span></span>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-50">
                      {filtered.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelected(s)}
                          className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center cursor-pointer transition-colors hover:bg-gray-50 ${
                            selected?.id === s.id ? "bg-pink-50 border-l-2 border-l-pink-500" : ""
                          }`}
                        >
                          {/* Applicant */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{s.name}</p>
                              <p className="text-gray-400 text-xs truncate">{s.email}</p>
                            </div>
                          </div>

                          {/* Role */}
                          <div className="hidden md:block min-w-0">
                            <p className="text-gray-700 text-sm truncate">{s.role}</p>
                            <p className="text-gray-400 text-xs">{s.experience}</p>
                          </div>

                          {/* Status */}
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[s.status].cls}`}>
                              {STATUS_CONFIG[s.status].label}
                            </span>
                          </div>

                          {/* Date */}
                          <div className="hidden sm:block text-gray-400 text-xs">
                            {formatDate(s.submittedAt)}
                          </div>

                          {/* Action */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                            className="text-xs text-pink-600 hover:text-pink-700 font-medium whitespace-nowrap"
                          >
                            View →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-right">
                    Showing {filtered.length} of {submissions.length} applications
                  </p>
                </>
              )}
            </div>

            {/* Detail Panel */}
            {selected && (
              <div className="w-full lg:w-[340px] shrink-0">
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-20">

                  {/* Panel header */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
                        {selected.name.charAt(0).toUpperCase()}
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                        aria-label="Close"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="font-semibold text-gray-900">{selected.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{selected.email}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selected.status].cls}`}>
                        {STATUS_CONFIG[selected.status].label}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="px-5 py-4 space-y-3">
                    {[
                      { label: "Role", value: selected.role },
                      { label: "Experience", value: selected.experience },
                      { label: "Skills", value: selected.skills },
                      ...(selected.resumeFilename ? [{ label: "Resume", value: selected.resumeFilename }] : []),
                      ...(selected.taskTitle ? [{ label: "Task Sent", value: selected.taskTitle }] : []),
                      { label: "Submitted", value: formatDateTime(selected.submittedAt) },
                    ].map((item) => (
                      <div key={item.label} className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{item.label}</span>
                        <span className="text-sm text-gray-800 leading-relaxed">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="px-5 pb-5 space-y-3">
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Update Status</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["pending", "reviewed", "rejected"] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => updateStatus(selected.id, st)}
                            disabled={selected.status === st || actionLoading === selected.id + st}
                            className={`py-2 rounded-xl text-xs font-semibold transition-all capitalize disabled:opacity-40 disabled:cursor-not-allowed ${
                              selected.status === st
                                ? STATUS_CONFIG[st].cls
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {actionLoading === selected.id + st ? "..." : st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteSubmission(selected.id)}
                      disabled={actionLoading === selected.id + "delete"}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40 border border-red-100"
                    >
                      {actionLoading === selected.id + "delete" ? "Deleting..." : "🗑  Delete Application"}
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
