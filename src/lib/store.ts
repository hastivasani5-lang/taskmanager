// In-memory store for submissions (persists during server runtime)
// For production, replace with a real database (e.g. PostgreSQL, MongoDB)

export interface Submission {
  id: string;
  name: string;
  email: string;
  role: string;
  experience: string;
  skills: string;
  resumeFilename?: string;
  taskTitle?: string;
  submittedAt: string; // ISO string
  githubRepo?: string;
  repoOwner?: string;
  repoName?: string;
  taskProgress?: number;
  lastUpdated?: string;
}

// Global store — survives hot reloads in dev via globalThis
const globalStore = globalThis as typeof globalThis & {
  submissions?: Submission[];
};

if (!globalStore.submissions) {
  globalStore.submissions = [];
}

export const store = {
  getAll(): Submission[] {
    return globalStore.submissions ?? [];
  },

  add(submission: Omit<Submission, "id" | "submittedAt">): Submission {
    const newEntry: Submission = {
      ...submission,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    };
    globalStore.submissions = [newEntry, ...(globalStore.submissions ?? [])];
    return newEntry;
  },

  updateProgress(email: string, progress: number): boolean {
    const list = globalStore.submissions ?? [];
    const idx = list.findIndex((s) => s.email === email);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], taskProgress: progress, lastUpdated: new Date().toISOString() };
    return true;
  },
};
