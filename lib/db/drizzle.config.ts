import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  // Relative, not path.join(__dirname, …): drizzle-kit's glob resolution fails
  // on absolute paths containing non-ASCII characters on Windows, which makes
  // it report "No schema files found" even though the file is right there.
  // Resolved against this config's directory, so it works from any cwd.
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
