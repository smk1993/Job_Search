/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained output directory for Docker deployments.
  // The standalone directory includes only the files needed to run in production.
  output: "standalone",
  // Next.js 14: keep native-addon packages out of the webpack bundle.
  // (Renamed to `serverExternalPackages` in Next.js 15.)
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};

export default nextConfig;
