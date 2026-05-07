import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { store } from "@/lib/store";
import { openRouterChat } from "@/lib/openrouter";

// ── GitHub Webhook — push event handler ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get("x-github-event");

    if (event !== "push") {
      return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    const payload = await req.json();

    const repoUrl      = payload.repository?.html_url as string | undefined;
    const repoName     = payload.repository?.full_name as string | undefined;
    const pusherEmail  = (payload.pusher?.email || payload.head_commit?.author?.email) as string | undefined;
    const pusherName   = (payload.pusher?.name  || payload.head_commit?.author?.name)  as string | undefined;
    const commits      = (payload.commits || []) as Record<string, unknown>[];
    const branch       = (payload.ref as string | undefined)?.replace("refs/heads/", "") ?? "main";
    const commitMsg    = (payload.head_commit?.message as string | undefined) ?? "";
    const commitUrl    = (payload.head_commit?.url     as string | undefined) ?? repoUrl ?? "";

    if (!repoUrl || !pusherEmail) {
      return NextResponse.json({ error: "Missing repo or email" }, { status: 400 });
    }

    console.log(`📦 GitHub push from ${pusherEmail} → ${repoUrl}`);

    // Find all submissions — match by email or fallback to latest
    const submissions = store.getAll();

    // Try to match by email — if not found, use latest submission as fallback
    const submission = submissions.find((s) => s.email === pusherEmail)
                    ?? submissions[0];

    const taskTitle = submission?.taskTitle ?? "Coding Task";

    // Analyse progress with AI
    const progress = await analyzeTaskProgress(payload, taskTitle);

    // Update store if matched
    if (submission) {
      store.updateProgress(submission.email, progress);
    }
    console.log(`✅ Progress: ${progress}%`);

    // ── ONE-TIME PUSH LOCK: Lock repo after first push ────────────────────
    // Check if this is the first push by checking if taskProgress was 0 before
    const isFirstPush = submission && (submission.taskProgress == null || submission.taskProgress === 0);
    
    if (isFirstPush && submission?.repoOwner && submission?.repoName) {
      try {
        await lockRepository(submission.repoOwner, submission.repoName, branch);
        console.log(`🔒 Repository locked: ${submission.repoOwner}/${submission.repoName}`);
      } catch (lockErr) {
        console.error("❌ Failed to lock repository:", lockErr);
      }
    }

    // Always notify HR (hastivasani5@gmail.com = GMAIL_USER)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      await sendHRNotification({
        candidateName:  submission?.name  ?? pusherName ?? "Unknown Candidate",
        candidateEmail: pusherEmail       ?? "unknown",
        pusherName:     pusherName        ?? submission?.name ?? "Unknown",
        role:           submission?.role  ?? "Developer",
        repoUrl,
        repoName:       repoName ?? repoUrl,
        branch,
        commitCount:    commits.length,
        commitMsg,
        commitUrl,
        progress,
        taskTitle,
        repoLocked:     isFirstPush ?? false,
      });
      console.log(`📧 HR notified at ${process.env.GMAIL_USER}`);
    }

    return NextResponse.json({ success: true, email: pusherEmail, progress });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Lock repository after first push ───────────────────────────────────────
async function lockRepository(owner: string, repo: string, branch: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  // 1. Enable branch protection (no force push, no deletion, require PR for changes)
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        required_status_checks: null,
        enforce_admins: true,
        required_pull_request_reviews: null,
        restrictions: null,
        required_linear_history: false,
        allow_force_pushes: false,
        allow_deletions: false,
        block_creations: false,
        required_conversation_resolution: false,
        lock_branch: true, // Lock branch — no new commits allowed
        allow_fork_syncing: false,
      }),
    }
  );

  // 2. Archive the repository (makes it read-only)
  await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      archived: true,
    }),
  });
}

// ── AI progress analyser ───────────────────────────────────────────────────
async function analyzeTaskProgress(
  payload: Record<string, unknown>,
  taskTitle: string
): Promise<number> {
  const commits = (payload.commits as Record<string, unknown>[] | undefined) ?? [];
  const added: string[]    = [];
  const modified: string[] = [];

  commits.forEach((c) => {
    added.push(   ...((c.added    as string[] | undefined) ?? []));
    modified.push(...((c.modified as string[] | undefined) ?? []));
  });

  const allFiles = [...new Set([...added, ...modified])];
  if (allFiles.length === 0) return 0;

  const prompt = `You are reviewing a candidate's coding task submission.

Task: ${taskTitle}

Files added/modified in this push:
${allFiles.map((f) => `- ${f}`).join("\n")}

Estimate overall task completion as a percentage (0–100).
Consider: source files, config, tests, README, typical project structure.
Return ONLY a number between 0 and 100, nothing else.`;

  try {
    const text = await openRouterChat({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 10,
    });
    const n = parseInt(text.trim(), 10);
    return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
  } catch {
    return Math.min(100, allFiles.length * 10);
  }
}

// ── HR notification email ──────────────────────────────────────────────────
interface HRNotifParams {
  candidateName:  string;
  candidateEmail: string;
  pusherName:     string;
  role:           string;
  repoUrl:        string;
  repoName:       string;
  branch:         string;
  commitCount:    number;
  commitMsg:      string;
  commitUrl:      string;
  progress:       number;
  taskTitle:      string;
  repoLocked:     boolean;
}

async function sendHRNotification(p: HRNotifParams): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, ""),
    },
  });

  // Progress bar fill color
  const barColor =
    p.progress >= 80 ? "#16a34a" :
    p.progress >= 50 ? "#d97706" : "#db2777";

  const progressLabel =
    p.progress >= 80 ? "Almost Done 🎉" :
    p.progress >= 50 ? "Good Progress 💪" :
    p.progress >  0  ? "Just Started 🚀" : "No Files Yet";

  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Task Update — ${p.candidateName}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

    <!-- Logo -->
    <tr><td style="padding-bottom:24px;text-align:center;">
      <table cellpadding="0" cellspacing="0" align="center"><tr>
        <td style="background:#db2777;width:34px;height:34px;border-radius:9px;text-align:center;vertical-align:middle;">
          <span style="color:white;font-weight:800;font-size:17px;line-height:34px;display:block;">S</span>
        </td>
        <td style="padding-left:10px;font-size:18px;font-weight:700;color:#18181b;vertical-align:middle;">Sensussoft</td>
      </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.07);">

      <!-- Top bar -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:#db2777;height:5px;font-size:0;">&nbsp;</td></tr>
      </table>

      <!-- Body -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:36px 40px 32px;">

          <!-- Label -->
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#db2777;letter-spacing:1px;text-transform:uppercase;">Task Update</p>

          <!-- Heading -->
          <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#18181b;line-height:1.3;">
            ${p.candidateName} pushed new code
          </h1>
          <p style="margin:0 0 28px;font-size:14px;color:#71717a;">
            ${p.role} · ${p.candidateEmail}
          </p>

          <!-- Progress box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;border-radius:14px;border:1px solid #fce7f3;margin-bottom:24px;">
            <tr><td style="padding:22px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#71717a;">Task Completion</p>
                    <p style="margin:0;font-size:13px;color:#a1a1aa;">${p.taskTitle}</p>
                  </td>
                  <td align="right">
                    <span style="font-size:32px;font-weight:800;color:${barColor};">${p.progress}%</span>
                  </td>
                </tr>
              </table>
              <!-- Progress bar -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                <tr>
                  <td style="background:#fce7f3;border-radius:99px;height:10px;overflow:hidden;">
                    <table cellpadding="0" cellspacing="0" style="width:${p.progress}%;height:10px;">
                      <tr><td style="background:${barColor};border-radius:99px;height:10px;"></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:12px;color:${barColor};font-weight:600;">${progressLabel}</p>
            </td></tr>
          </table>

          <!-- Commit details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #e4e4e7;margin-bottom:24px;">
            <tr><td style="padding:18px 20px;">
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.6px;">Push Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#71717a;width:110px;">Branch</td>
                  <td style="padding:5px 0;font-size:13px;color:#18181b;font-weight:600;">${p.branch}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#71717a;">Commits</td>
                  <td style="padding:5px 0;font-size:13px;color:#18181b;font-weight:600;">${p.commitCount} commit${p.commitCount !== 1 ? "s" : ""}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#71717a;vertical-align:top;">Message</td>
                  <td style="padding:5px 0;font-size:13px;color:#18181b;font-style:italic;">"${p.commitMsg}"</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Buttons -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr>
              <td style="padding-right:10px;">
                <a href="${p.repoUrl}" style="display:inline-block;background:#db2777;color:white;text-decoration:none;padding:11px 20px;border-radius:9px;font-size:13px;font-weight:600;">
                  View Repository →
                </a>
              </td>
              <td>
                <a href="${p.commitUrl}" style="display:inline-block;background:#f4f4f5;color:#18181b;text-decoration:none;padding:11px 20px;border-radius:9px;font-size:13px;font-weight:600;border:1px solid #e4e4e7;">
                  View Commit
                </a>
              </td>
            </tr>
          </table>

          ${p.repoLocked ? `
          <!-- Lock notice -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#fef3c7;border-radius:10px;border:1px solid #fde68a;padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">
                🔒 Repository has been permanently locked — no further pushes are allowed.
              </p>
            </td></tr>
          </table>
          ` : ""}

        </td></tr>
      </table>

    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 0;text-align:center;">
      <p style="margin:0 0 3px;font-size:12px;color:#a1a1aa;">© ${year} Sensussoft · HR Notification</p>
      <p style="margin:0;font-size:12px;color:#d4d4d8;">This email was sent automatically when the candidate pushed code.</p>
    </td></tr>

  </table>
  </td></tr>
</table>

</body></html>`;

  await transporter.sendMail({
    from:    `"Sensussoft Hiring" <${process.env.GMAIL_USER}>`,
    to:      process.env.GMAIL_USER,           // HR = same Gmail account
    subject: `[${p.progress}% Complete] ${p.candidateName} pushed code — ${p.role}`,
    html,
    text: `Task Update\n\nCandidate: ${p.candidateName} (${p.candidateEmail})\nRole: ${p.role}\nTask: ${p.taskTitle}\nProgress: ${p.progress}%\nBranch: ${p.branch}\nCommits: ${p.commitCount}\nMessage: "${p.commitMsg}"\n\nRepo: ${p.repoUrl}`,
  });
}
