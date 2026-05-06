import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import Groq from "groq-sdk";
import { store } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData();
    const email     = (formData.get("email") as string) || "";
    const fileEntry = formData.get("file");

    if (!email || !fileEntry || typeof fileEntry === "string") {
      return NextResponse.json({ error: "Email and file are required." }, { status: 400 });
    }

    const file       = fileEntry as File;
    const filename   = file.name;
    const arrayBuf   = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuf);

    // Find submission
    const submissions   = store.getAll();
    const submission    = submissions.find((s) => s.email === email);
    const candidateName = submission?.name     ?? email;
    const role          = submission?.role     ?? "Developer";
    const taskTitle     = submission?.taskTitle ?? "Coding Task";

    // AI analysis
    const progress = await analyzeFile(filename, fileBuffer, taskTitle);

    // Update store
    if (submission) store.updateProgress(email, progress);

    // Push file to candidate's GitHub repo (if we have repo info)
    if (submission?.repoOwner && submission?.repoName) {
      try {
        await pushFileToRepo(
          submission.repoOwner,
          submission.repoName,
          filename,
          fileBuffer
        );
        console.log(`✅ File pushed to GitHub: ${submission.repoOwner}/${submission.repoName}`);
      } catch (ghErr) {
        console.warn("⚠️ Could not push file to GitHub repo:", ghErr);
        // Non-fatal — HR email will still be sent
      }
    }

    // Send HR email
    await sendHREmail({ candidateName, candidateEmail: email, role, taskTitle, filename, fileBuffer, progress });

    return NextResponse.json({ success: true, progress });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Upload error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Push submitted file to GitHub repo ────────────────────────────────────
async function pushFileToRepo(
  owner: string,
  repo: string,
  filename: string,
  buffer: Buffer
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  // Check if file already exists (to get its SHA for update)
  let sha: string | undefined;
  const checkRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/submission/${filename}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  const body: Record<string, string> = {
    message: `Add submission: ${filename}`,
    content: buffer.toString("base64"),
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/submission/${filename}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(`GitHub push failed: ${err.message ?? putRes.status}`);
  }
}

// ── AI analysis ────────────────────────────────────────────────────────────
async function analyzeFile(filename: string, buffer: Buffer, taskTitle: string): Promise<number> {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const textExts = [".js",".ts",".jsx",".tsx",".py",".java",".cs",".go",".rb",".php",".html",".css",".json",".md",".txt",".zip"];
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    let contentPreview = "";
    if (textExts.includes(ext) && ext !== ".zip") {
      contentPreview = buffer.toString("utf-8").slice(0, 3000);
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `You are reviewing a candidate's coding task submission.
Task: ${taskTitle}
File submitted: ${filename}
File size: ${(buffer.length / 1024).toFixed(1)} KB
${contentPreview ? `Content preview:\n${contentPreview}` : ""}

Estimate task completion percentage (0-100).
100% = complete working solution
70-90% = mostly done, minor things missing
40-60% = partial implementation
10-30% = early stage
0% = empty or unrelated

Return ONLY a number, nothing else.`
      }],
      temperature: 0.2,
      max_tokens: 10,
    });

    const n = parseInt(completion.choices[0]?.message?.content?.trim() ?? "50", 10);
    return isNaN(n) ? 50 : Math.min(100, Math.max(0, n));
  } catch {
    // Fallback based on file size
    const kb = buffer.length / 1024;
    if (kb > 100) return 80;
    if (kb > 20)  return 60;
    if (kb > 5)   return 40;
    return 20;
  }
}

// ── HR Email ───────────────────────────────────────────────────────────────
async function sendHREmail(p: {
  candidateName:  string;
  candidateEmail: string;
  role:           string;
  taskTitle:      string;
  filename:       string;
  fileBuffer:     Buffer;
  progress:       number;
}) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, ""),
    },
  });

  const barColor =
    p.progress >= 80 ? "#16a34a" :
    p.progress >= 50 ? "#d97706" : "#db2777";

  const progressLabel =
    p.progress >= 80 ? "Almost Complete 🎉" :
    p.progress >= 50 ? "Good Progress 💪"   :
    p.progress >  0  ? "Just Started 🚀"    : "Needs Review";

  const year = new Date().getFullYear();
  const now  = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Logo -->
  <tr><td style="padding-bottom:24px;text-align:center;">
    <table cellpadding="0" cellspacing="0" align="center"><tr>
      <td style="background:#db2777;width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;">
        <span style="color:white;font-weight:800;font-size:18px;line-height:36px;display:block;">S</span>
      </td>
      <td style="padding-left:10px;font-size:19px;font-weight:700;color:#18181b;vertical-align:middle;">Sensussoft</td>
    </tr></table>
  </td></tr>

  <!-- Card -->
  <tr><td style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:#db2777;height:5px;font-size:0;">&nbsp;</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:36px 40px 32px;">

      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#db2777;letter-spacing:1px;text-transform:uppercase;">Task Submission Received</p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#18181b;">${p.candidateName} submitted their task</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#71717a;">${p.role} &nbsp;·&nbsp; ${p.candidateEmail} &nbsp;·&nbsp; ${now}</p>

      <!-- Progress -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;border-radius:14px;border:1px solid #fce7f3;margin-bottom:24px;">
        <tr><td style="padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td>
                <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#71717a;">AI-Estimated Completion</p>
                <p style="margin:0;font-size:12px;color:#a1a1aa;">${p.taskTitle}</p>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="font-size:40px;font-weight:800;color:${barColor};line-height:1;">${p.progress}%</span>
              </td>
            </tr>
          </table>
          <!-- Bar -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#fce7f3;border-radius:99px;height:14px;overflow:hidden;">
                <table cellpadding="0" cellspacing="0" style="width:${p.progress}%;height:14px;">
                  <tr><td style="background:${barColor};border-radius:99px;height:14px;"></td></tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:10px 0 0;font-size:13px;color:${barColor};font-weight:700;">${progressLabel}</p>
        </td></tr>
      </table>

      <!-- File info -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #e4e4e7;margin-bottom:24px;">
        <tr><td style="padding:18px 22px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.6px;">Submission Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;width:120px;">Candidate</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;font-weight:600;">${p.candidateName}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;">Email</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${p.candidateEmail}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;">Role</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${p.role}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;">File</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;font-weight:600;">${p.filename} (${(p.fileBuffer.length / 1024).toFixed(1)} KB)</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;">Submitted</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${now}</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Attachment note -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;margin-bottom:8px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">
            📎 Submitted file is attached to this email — open it to review the work.
          </p>
        </td></tr>
      </table>

    </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#a1a1aa;">© ${year} Sensussoft · HR Notification · Auto-generated</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  await transporter.sendMail({
    from:        `"Sensussoft Hiring" <${process.env.GMAIL_USER}>`,
    to:          process.env.GMAIL_USER,
    subject:     `[${p.progress}% Complete] ${p.candidateName} submitted task — ${p.role}`,
    html,
    text:        `Task Submission\n\nCandidate: ${p.candidateName} (${p.candidateEmail})\nRole: ${p.role}\nFile: ${p.filename}\nCompletion: ${p.progress}%\nSubmitted: ${now}`,
    attachments: [{ filename: p.filename, content: p.fileBuffer }],
  });
}
