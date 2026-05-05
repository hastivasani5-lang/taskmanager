// Simple admin credentials check
// In production, use a proper auth system (NextAuth, JWT, etc.)

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "sensussoft@123";

export function checkCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}
