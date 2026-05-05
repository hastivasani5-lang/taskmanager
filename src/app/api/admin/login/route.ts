import { NextRequest, NextResponse } from "next/server";
import { checkCredentials } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    if (!checkCredentials(username, password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    // Set a simple session cookie (httpOnly for security)
    response.cookies.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
