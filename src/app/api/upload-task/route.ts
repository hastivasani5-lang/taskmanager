import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import Groq from "groq-sdk";
import { store } from "@/lib/store";

// ── Upload task file & notify HR ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData();
    const email     = (formData.get("email")     as string) || "";
    const fileEntry =  formData.get("file");

    if (!email || !fileEntry || typeof fileEntry === "string") {
      return NextResponse.json({ error: "Email and file are required." }, { status: 400 });
    }

    const file      = fileEntry as File;
    const filename  = file.name;
    const arrayBuf  = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuf);

    // ── Find submission by email ──────────────────────────────────────────
    const submissions = store.getAll();
    const submission  = submissions.find((s) => s.email === email);

    const candidateName = submission?.name  ?? email;
    const role          = submission?.role  ?? "Developer";
    const taskTitle     = submission?.taskTitle ?? "Coding Task";

    // ── Upload file to GitHub repo ────────────────────────────────────────
    const token     = process.env.GITHUB_TOKEN!;
    const owner     = process.env.GITHUB_REPO_OWNER!;
    const repo      = process.env.GITHUB_REPO_NAME!;
    const path      = `submissions/${email.replace("@","_at_")}/${Date.now()}_${filename}`;

    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: `Task submission by ${candidateName} (${email})`,
          content: fileBuffer.toString("base64"),
        }),
      }
    );

    if (!ghRes.ok) {
      const err = await ghRes.json();
      console.error("GitHub upload failed:", err);
      return NextResponse.json({ error: "Failed to upload to GitHub." }, { status: 500 });
    }

    const ghData   = await ghRes.json();
    const fileUrl  = ghData.content?.html_url ?? `https://github.com/${owner}/${repo}`;

    // ── AI: analyse file & estimate completion % ──────────────────────────
    const progress = await analyzeFile(filename, fileBuffer, taskTitle);

    // Update store
    if (submission) {
      store.updateProgress(email, progress);
    }

    // ── Send HR notification email with PDF attachment ────────────────────
    await sendHREmail({
      candidateName,
      candidateEmail: email,
      role,
      taskTitle,
      filename,
      fileBuffer,
      fileUrl,
      progress,
    });

    return NextResponse.json({ success: true, progress, fileUrl });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Upload error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── AI: estimate completion from filename + content ───────────────────────
async function analyzeFile(
  filename: string,
  buffer: Buffer,
  taskTitle: string
): Promise<number> {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    // For text-based files, read content (max 3000 chars)
    let contentPreview = "";
    const textExts = [".js",".ts",".jsx",".tsx",".py",".java",".cs",".go",".rb",".php",".html",".css",".json",".md",".txt"];
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    if (textExts.includes(ext)) {
      contentPreview = buffer.toString("utf-8").slice(0, 3000);
    }

    const prompt = `You are a senior developer reviewing a candidate's task submission.

Task: ${taskTitle}
Submitted file: ${filename}
${contentPreview ? `\nFile content preview:\n${contentPreview}` : ""}

Based on the filename and content, estimate the task completion percentage (0–100).
- 100% = fully complete, working solution
- 50–80% = partial implementation
- 10–40% = early stage / incomplete
- 0% = empty or unrelated file

Return ONLY a number between 0 and 100, nothing else.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 10,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "50";
    const n    = parseInt(text, 10);
    return isNaN(n) ? 50 : Math.min(100, Math.max(0, n));
  } catch {
    return 50;
  }
}

// ── HR email with file attached ───────────────────────────────────────────
interface HREmailParams {
  candidateName:  string;
  candidateEmail: string;
  role:           string;
  taskTitle:      string;
  filename:       string;
  fileBuffer:     Buffer;
  fileUrl:        string;
  progress:       number;
}

async function sendHREmail(p: HREmailParams): Promise<void> {
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
    p.progress >= 50 ? "Good Progress 💪"  :
    p.progress >  0  ? "Just Started 🚀"   : "Needs Review";

  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Task Submitted — ${p.candidateName}</title></head>
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

    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:36px 40px 32px;">

      <!-- Label -->
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#db2777;letter-spacing:1px;text-transform:uppercase;">Task Submission</p>

      <!-- Heading -->
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#18181b;line-height:1.3;">
        ${p.candidateName} submitted their task
      </h1>
      <p style="margin:0 0 28px;font-size:14px;color:#71717a;">
        ${p.role} &nbsp;·&nbsp; ${p.candidateEmail}
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
                <span style="font-size:36px;font-weight:800;color:${barColor};">${p.progress}%</span>
              </td>
            </tr>
          </table>
          <!-- Progress bar -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
            <tr>
              <td style="background:#fce7f3;border-radius:99px;height:12px;overflow:hidden;">
                <table cellpadding="0" cellspacing="0" style="width:${p.progress}%;height:12px;">
                  <tr><td style="background:${barColor};border-radius:99px;height:12px;"></td></tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:8px 0 0;font-size:12px;color:${barColor};font-weight:600;">${progressLabel}</p>
        </td></tr>
      </table>

      <!-- File info -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #e4e4e7;margin-bottom:24px;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.6px;">Submitted File</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#71717a;width:100px;">File name</td>
              <td style="padding:5px 0;font-size:13px;color:#18181b;font-weight:600;">${p.filename}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#71717a;">Candidate</td>
              <td style="padding:5px 0;font-size:13px;color:#18181b;">${p.candidateName} &lt;${p.candidateEmail}&gt;</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Note about attachment -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">
            📎 The submitted file is attached to this email.
          </p>
        </td></tr>
      </table>

      <!-- View on GitHub button -->
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#db2777;border-radius:9px;">
            <a href="${p.fileUrl}" style="display:inline-block;padding:11px 22px;color:white;text-decoration:none;font-size:13px;font-weight:600;">
              View on GitHub →
            </a>
          </td>
        </tr>
      </table>

    </td></tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 0;text-align:center;">
    <p style="margin:0 0 3px;font-size:12px;color:#a1a1aa;">© ${year} Sensussoft · HR Notification</p>
    <p style="margin:0;font-size:12px;color:#d4d4d8;">Candidate submitted their task via the Sensussoft portal.</p>
  </td></tr>

</table>
</td></tr>
</table>

</body></html>`;

  await transporter.sendMail({
    from:        `"Sensussoft Hiring" <${process.env.GMAIL_USER}>`,
    to:          process.env.GMAIL_USER, // HR email
    subject:     `[${p.progress}% Complete] ${p.candidateName} submitted task — ${p.role}`,
    html,
    text:        `Task Submission\n\nCandidate: ${p.candidateName} (${p.candidateEmail})\nRole: ${p.role}\nTask: ${p.taskTitle}\nFile: ${p.filename}\nCompletion: ${p.progress}%\n\nView on GitHub: ${p.fileUrl}`,
    attachments: [
      {
        filename:    p.filename,
        content:     p.fileBuffer,
      },
    ],
  });
}
