import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit does not read .env.local on its own. Load it (then .env as a
// fallback) so db:push / db:generate / db:migrate / db:studio all work.
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local before running drizzle-kit."
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
