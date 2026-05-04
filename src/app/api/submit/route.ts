import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

// ── Types ──────────────────────────────────────────────────────────────────
interface ApplicationData {
  name: string;
  email: string;
  role: string;
  experience: string;
  skills: string;
}

interface GeneratedTask {
  title: string;
  scenario: string;
  requirements: string[];
  deliverables: string[];
  evaluation_criteria: string[];
  deadline_days: number;
  difficulty: string;
}

// ── Gemini: Generate custom task as JSON ───────────────────────────────────
async function generateTask(data: ApplicationData): Promise<GeneratedTask> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"];

  // Parse experience years from string like "1-2 years", "7+ years"
  const expStr = data.experience.toLowerCase();
  let expYears = 0;
  if (expStr.includes("7+") || expStr.includes("lead") || expStr.includes("architect")) expYears = 7;
  else if (expStr.includes("5") || expStr.includes("senior")) expYears = 5;
  else if (expStr.includes("3")) expYears = 3;
  else if (expStr.includes("1")) expYears = 1;

  const prompt = `You are a senior engineering manager at Sensussoft.
Generate a practical take-home task for this candidate.

Candidate:
- Name: ${data.name}
- Role applied: ${data.role}
- Experience: ${data.experience} (approx ${expYears} years)
- Skills: ${data.skills}

Rules:
- Junior (0-2y): small CRUD/UI exercise, ~3 hours of work.
- Mid (3-5y): full feature with API + frontend, ~6 hours.
- Senior (6+y): architecture problem + small implementation, ~8 hours.
- Match the tech stack to the role applied.
- Deliverable: a GitHub repo link.
- Deadline: 3 days.
- Include 4 evaluation criteria.

Return ONLY valid JSON with these exact keys:
{
  "title": "string",
  "difficulty": "Junior | Mid-level | Senior",
  "scenario": "string (2-3 sentences)",
  "requirements": ["string", "string", "string", "string"],
  "deliverables": ["string", "string"],
  "evaluation_criteria": ["string", "string", "string", "string"],
  "deadline_days": number
}

No markdown, no code fences, just raw JSON.`;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text();

      // Strip markdown code fences if AI wraps JSON
      text = text.replace(/```json|```/g, "").trim();

      const parsed: GeneratedTask = JSON.parse(text);
      console.log(`✅ Task generated with model: ${modelName}`);
      return parsed;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429") || msg.includes("404") || msg.includes("not found") || msg.includes("quota")) {
        console.log(`⚠️ Model ${modelName} failed, trying next...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error("All Gemini models failed. Please check your API key quota at aistudio.google.com");
}

// ── Build HTML email ───────────────────────────────────────────────────────
function renderEmail(data: ApplicationData, task: GeneratedTask): string {
  const list = (arr: string[]) =>
    arr.map((x) => `<li style="margin:6px 0">${x}</li>`).join("");

  const difficultyColor =
    task.difficulty === "Senior" ? "#c0392b" :
    task.difficulty === "Mid-level" ? "#e67e22" : "#27ae60";

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;color:#333;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#1F4E79,#2E75B6);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;font-size:26px;">🎯 Your Practical Task</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;">Sensussoft Hiring Team</p>
      </div>

      <div style="background:#f8f9fa;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e9ecef;">
        <h2 style="color:#1F4E79;margin-top:0;">Hi ${data.name},</h2>
        <p>Thanks for applying to <b>Sensussoft</b> for the <b>${data.role}</b> role.
        Below is a short practical task. Please complete it within
        <b>${task.deadline_days} days</b> and reply to this email with your submission.</p>

        <div style="background:white;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #dee2e6;">
          <h3 style="color:#2E75B6;margin-top:0;">${task.title}</h3>
          <span style="background:${difficultyColor};color:white;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;">
            ${task.difficulty}
          </span>
          <p style="margin-top:14px;">${task.scenario}</p>

          <h4 style="color:#1F4E79;">📋 Requirements</h4>
          <ul style="padding-left:20px;">${list(task.requirements)}</ul>

          <h4 style="color:#1F4E79;">📦 Deliverables</h4>
          <ul style="padding-left:20px;">${list(task.deliverables)}</ul>

          <h4 style="color:#1F4E79;">✅ How we will evaluate</h4>
          <ul style="padding-left:20px;">${list(task.evaluation_criteria)}</ul>
        </div>

        <p style="color:#888;font-size:13px;margin-bottom:0;">
          Good luck!<br/>
          <b>Sensussoft Hiring Team</b><br/>
          <em>This task was AI-generated based on your specific profile.</em>
        </p>
      </div>
    </div>
  `;
}

// ── Nodemailer: Send email ─────────────────────────────────────────────────
async function sendEmail(data: ApplicationData, task: GeneratedTask): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, ""),
    },
  });

  await transporter.sendMail({
    from: `"Sensussoft Careers" <${process.env.GMAIL_USER}>`,
    to: data.email,
    subject: `Sensussoft — Practical Task for ${data.role}`,
    html: renderEmail(data, task),
    text: `Hi ${data.name},\n\nTask: ${task.title}\n\nScenario: ${task.scenario}\n\nRequirements:\n${task.requirements.join("\n")}\n\nDeadline: ${task.deadline_days} days\n\nGood luck!\nSensussoft Hiring Team`,
  });
}

// ── Main API Handler ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: ApplicationData = await req.json();

    const { name, email, role, experience, skills } = body;
    if (!name || !email || !role || !experience || !skills) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: "Server configuration missing. Check environment variables." },
        { status: 500 }
      );
    }

    console.log(`\n=== New candidate received ===`);
    console.log(`Name: ${name}`);
    console.log(`Role: ${role}`);
    console.log(`Experience: ${experience}`);
    console.log(`Skills: ${skills}`);

    console.log("🤖 Asking Gemini to generate a task...");
    const task = await generateTask(body);
    console.log("Task generated:", task.title);

    console.log(`📧 Sending email to ${email}...`);
    await sendEmail(body, task);
    console.log("✅ Email sent successfully.");

    return NextResponse.json({
      success: true,
      message: "Task generated and emailed successfully",
      task_title: task.title,
    });

  } catch (error: unknown) {
    console.error("❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
