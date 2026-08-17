/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling server-only packages that use native Node.js APIs
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
