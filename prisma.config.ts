import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load env files so Prisma CLI can resolve DATABASE_URL when running locally.
// .env.local takes precedence over .env (mirrors Next.js conventions).
// In CI/production these files won't exist; DATABASE_URL comes from the shell.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use process.env directly so a missing/empty var doesn't throw at config
    // load time. `prisma generate` doesn't connect to the DB; only
    // `prisma migrate deploy` needs a real URL (supplied via CI secrets).
    url: process.env.DATABASE_URL ?? "postgresql://placeholder@localhost:5432/placeholder",
  },
});
