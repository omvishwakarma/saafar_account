import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "exceljs"],
  outputFileTracingRoot: path.join(process.cwd()),
  // Vercel's default builder runs out of memory while type-checking.
  // Compile still runs; types stay checked in the editor.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
