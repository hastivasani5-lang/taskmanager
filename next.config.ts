import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack/Turbopack from bundling these Node.js packages.
  serverExternalPackages: ["pdfkit", "nodemailer", "pdf-parse", "mammoth"],
};

export default nextConfig;
