import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack/webpack from bundling these Node.js packages.
  // PDFKit uses __dirname to locate font files at runtime — if bundled,
  // __dirname resolves to a wrong path and fonts are not found.
  // pdf-parse and mammoth also need to run as native Node modules.
  serverExternalPackages: ["pdfkit", "nodemailer", "pdf-parse", "mammoth"],
};

export default nextConfig;
