import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist uses Node features and ships its own .mjs build; bundling it
  // into the server action breaks it. Load it from node_modules at runtime.
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      // PDF statements are uploaded base64 to a server action; the 1MB
      // default is too small for multi-page statements.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
