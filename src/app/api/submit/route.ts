import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { store } from "@/lib/store";

// ── Types ──────────────────────────────────────────────────────────────────
interface ApplicationData {
  name: string;
  email: string;
  role: string;
  experience: string;
  skills: string;
  resumeBuffer?: Buffer;
  resumeFilename?: string;
  resumeMimeType?: string;
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

// ── Groq: Generate custom task as JSON ────────────────────────────────────
async function generateTask(data: ApplicationData): Promise<GeneratedTask> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

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

  const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];

  for (const modelName of modelsToTry) {
    try {
      const completion = await groq.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      });

      let text = completion.choices[0]?.message?.content || "";
      // Strip markdown code fences if model wraps JSON
      text = text.replace(/```json|```/g, "").trim();

      const parsed: GeneratedTask = JSON.parse(text);
      console.log(`✅ Task generated with model: ${modelName}`);
      return parsed;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`⚠️ Model ${modelName} failed: ${msg}, trying next...`);
    }
  }

  throw new Error("All AI models failed. Please check your GROQ_API_KEY.");
}

// ── PDFKit: Generate PDF buffer ────────────────────────────────────────────
async function generatePDF(data: ApplicationData, task: GeneratedTask): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 80).fill("#831843");
    doc.fillColor("white").fontSize(22).font("Times-Bold")
      .text("Sensussoft — Practical Task", 50, 25);
    doc.fontSize(11).font("Times-Roman")
      .text("AI-Generated Candidate Assessment", 50, 52);

    doc.moveDown(3);

    // ── Candidate Info ──
    doc.fillColor("#831843").fontSize(14).font("Times-Bold")
      .text("Candidate Details");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#be185d").lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc.fillColor("#333").fontSize(11).font("Times-Roman");
    doc.text(`Name:        ${data.name}`);
    doc.text(`Email:       ${data.email}`);
    doc.text(`Role:        ${data.role}`);
    doc.text(`Experience:  ${data.experience}`);
    doc.text(`Skills:      ${data.skills}`);
    doc.moveDown(1.5);

    // ── Difficulty Badge ──
    const diffColor = task.difficulty === "Senior" ? "#c0392b" :
      task.difficulty === "Mid-level" ? "#e67e22" : "#27ae60";
    doc.roundedRect(50, doc.y, 100, 22, 5).fill(diffColor);
    doc.fillColor("white").fontSize(10).font("Times-Bold")
      .text(task.difficulty, 50, doc.y - 17, { width: 100, align: "center" });
    doc.moveDown(1.5);

    // ── Task Title ──
    doc.fillColor("#831843").fontSize(16).font("Times-Bold")
      .text(task.title);
    doc.moveDown(0.5);

    // ── Scenario ──
    doc.fillColor("#555").fontSize(11).font("Times-Roman")
      .text(task.scenario, { lineGap: 4 });
    doc.moveDown(1.5);

    // ── Requirements ──
    doc.fillColor("#831843").fontSize(13).font("Times-Bold").text("Requirements");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#be185d").lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.fillColor("#333").fontSize(11).font("Times-Roman");
    task.requirements.forEach((req, i) => {
      doc.text(`${i + 1}.  ${req}`, { lineGap: 3 });
    });
    doc.moveDown(1.5);

    // ── Deliverables ──
    doc.fillColor("#831843").fontSize(13).font("Times-Bold").text("Deliverables");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#be185d").lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.fillColor("#333").fontSize(11).font("Times-Roman");
    task.deliverables.forEach((d) => {
      doc.text(`•  ${d}`, { lineGap: 3 });
    });
    doc.moveDown(1.5);

    // ── Evaluation Criteria ──
    doc.fillColor("#831843").fontSize(13).font("Times-Bold").text("Evaluation Criteria");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#be185d").lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.fillColor("#333").fontSize(11).font("Times-Roman");
    task.evaluation_criteria.forEach((c) => {
      doc.text(`✓  ${c}`, { lineGap: 3 });
    });
    doc.moveDown(1.5);

    // ── Deadline ──
    doc.rect(50, doc.y, 495, 36).fill("#fff0f6");
    doc.fillColor("#831843").fontSize(12).font("Times-Bold")
      .text(`Deadline: ${task.deadline_days} days from receipt of this email`, 60, doc.y - 26);
    doc.moveDown(2);

    // ── Footer ──
    doc.fillColor("#999").fontSize(9).font("Times-Roman")
      .text("This task was AI-generated by Sensussoft Hiring System based on the candidate's profile.",
        50, doc.page.height - 50, { align: "center" });

    doc.end();
  });
}


function renderEmail(data: ApplicationData, task: GeneratedTask): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your Task — Sensussoft</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr>
          <td style="padding-bottom:28px;text-align:center;">
            <table cellpadding="0" cellspacing="0" align="center">
              <tr>
                <td style="background:#db2777;width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;">
                  <span style="color:white;font-weight:800;font-size:18px;line-height:36px;display:block;">S</span>
                </td>
                <td style="padding-left:10px;font-size:20px;font-weight:700;color:#18181b;vertical-align:middle;letter-spacing:-0.3px;">
                  Sensussoft
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <!-- Top accent bar -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#db2777;height:5px;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <!-- Content -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:40px 44px 36px;">

                  <!-- Greeting -->
                  <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:#18181b;line-height:1.3;">
                    Hi ${data.name}, your task is attached! 👋
                  </h1>
                  <p style="margin:0 0 28px 0;font-size:15px;color:#71717a;line-height:1.6;">
                    Thank you for applying to <strong style="color:#18181b;">Sensussoft</strong> for the
                    <strong style="color:#db2777;">${data.role}</strong> position.
                  </p>

                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr><td style="height:1px;background:#f4f4f5;font-size:0;">&nbsp;</td></tr>
                  </table>

                  <!-- PDF notice box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;border-radius:12px;border:1px solid #fce7f3;margin-bottom:28px;">
                    <tr>
                      <td style="padding:22px 24px;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align:top;padding-right:14px;font-size:24px;line-height:1;">📎</td>
                            <td>
                              <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#18181b;">
                                Your coding task is in the PDF
                              </p>
                              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
                                We've attached a personalised PDF with your full task details — requirements, deliverables, and evaluation criteria.
                                Please open the attachment to get started.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Steps -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td style="padding-bottom:14px;">
                        <span style="font-size:12px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">What to do next</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width:28px;height:28px;background:#fdf2f8;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#db2777;">1</td>
                                  <td style="padding-left:12px;font-size:14px;color:#3f3f46;">Open the attached PDF and read your task carefully.</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width:28px;height:28px;background:#fdf2f8;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#db2777;">2</td>
                                  <td style="padding-left:12px;font-size:14px;color:#3f3f46;">Complete the task and push your code to the repository.</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width:28px;height:28px;background:#fdf2f8;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#db2777;">3</td>
                                  <td style="padding-left:12px;font-size:14px;color:#3f3f46;">Reply to this email with your GitHub repo link within <strong style="color:#db2777;">${task.deadline_days} days</strong>.</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Repo / Submit button -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                    <tr>
                      <td style="background:#db2777;border-radius:10px;">
                        <a href="https://github.com/hastivasani5-lang/taskmanager"
                           style="display:inline-block;padding:12px 24px;color:white;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.2px;">
                          View Starter Repository →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr><td style="height:1px;background:#f4f4f5;font-size:0;">&nbsp;</td></tr>
                  </table>

                  <!-- Sign off -->
                  <p style="margin:0;font-size:14px;color:#71717a;line-height:1.7;">
                    Good luck — we're excited to see what you build!<br/>
                    <strong style="color:#18181b;">Sensussoft Hiring Team</strong>
                  </p>

                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 0 0;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;">© ${year} Sensussoft. All rights reserved.</p>
            <p style="margin:0;font-size:12px;color:#d4d4d8;">This task was AI-generated based on your application profile.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── Nodemailer: Send email with PDF attachment ─────────────────────────────
async function sendEmail(data: ApplicationData, task: GeneratedTask): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, ""),
    },
  });

  // Generate PDF
  console.log("📄 Generating PDF...");
  const pdfBuffer = await generatePDF(data, task);
  const pdfFilename = `Sensussoft_Task_${data.name.replace(/\s+/g, "_")}.pdf`;

  // Build attachments — always include the generated task PDF
  const attachments: { filename: string; content: Buffer; contentType: string }[] = [
    {
      filename: pdfFilename,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];

  // Also attach the candidate's resume if provided
  if (data.resumeBuffer && data.resumeFilename) {
    attachments.push({
      filename: data.resumeFilename,
      content: data.resumeBuffer,
      contentType: data.resumeMimeType || "application/octet-stream",
    });
  }

  await transporter.sendMail({
    from: `"Sensussoft Careers" <${process.env.GMAIL_USER}>`,
    to: data.email,
    subject: `Sensussoft — Practical Task for ${data.role}`,
    html: renderEmail(data, task),
    text: `Hi ${data.name},\n\nTask: ${task.title}\n\nScenario: ${task.scenario}\n\nRequirements:\n${task.requirements.join("\n")}\n\nDeadline: ${task.deadline_days} days\n\nGood luck!\nSensussoft Hiring Team`,
    attachments,
  });
}

// ── Main API Handler ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Parse multipart/form-data (resume upload) or fall back to JSON
    let name: string, email: string, role: string, experience: string, skills: string;
    let resumeBuffer: Buffer | undefined;
    let resumeFilename: string | undefined;
    let resumeMimeType: string | undefined;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      name       = (formData.get("name")       as string) || "";
      email      = (formData.get("email")      as string) || "";
      role       = (formData.get("role")       as string) || "";
      experience = (formData.get("experience") as string) || "";
      skills     = (formData.get("skills")     as string) || "";

      const resumeEntry = formData.get("resume");
      if (resumeEntry && typeof resumeEntry !== "string") {
        const file = resumeEntry as File;
        const arrayBuffer = await file.arrayBuffer();
        resumeBuffer   = Buffer.from(arrayBuffer);
        resumeFilename = file.name;
        resumeMimeType = file.type;
      }
    } else {
      const body: ApplicationData = await req.json();
      ({ name, email, role, experience, skills } = body);
    }

    if (!name || !email || !role || !experience || !skills) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: "Server configuration missing. Check environment variables." },
        { status: 500 }
      );
    }

    // No webhook secret check — open for all submissions

    const applicationData: ApplicationData = {
      name, email, role, experience, skills,
      resumeBuffer, resumeFilename, resumeMimeType,
    };

    console.log(`\n=== New candidate received ===`);
    console.log(`Name: ${name}`);
    console.log(`Role: ${role}`);
    console.log(`Experience: ${experience}`);
    console.log(`Skills: ${skills}`);
    console.log(`Resume: ${resumeFilename ?? "not provided"}`);

    console.log("🤖 Asking Gemini to generate a task...");
    const task = await generateTask(applicationData);
    console.log("Task generated:", task.title);

    console.log(`📧 Sending email to ${email}...`);
    await sendEmail(applicationData, task);
    console.log("✅ Email sent successfully.");

    // Save to in-memory store for admin panel
    store.add({
      name,
      email,
      role,
      experience,
      skills,
      resumeFilename,
      taskTitle: task.title,
    });

    return NextResponse.json({
      success: true,
      message: "Task generated and emailed successfully",
      task_title: task.title,
    });

  } catch (error: unknown) {
    let errorMessage = "Internal server error";
    let errorStack = undefined;
    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    console.error("❌ Error:", error);
    return NextResponse.json({ error: errorMessage, stack: errorStack }, { status: 500 });
  }
}
