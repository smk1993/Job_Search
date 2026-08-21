import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";

// Load env files so Prisma CLI can resolve DATABASE_URL when running locally.
// .env.local takes precedence over .env (mirrors Next.js conventions).
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
