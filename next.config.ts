import type { NextConfig } from "next";
import { codespacesHost } from "./src/lib/codespaces.mjs";

const host = codespacesHost(process.env);

const config: NextConfig = {
  allowedDevOrigins: host ? [host] : [],
  experimental: { serverActions: {
    bodySizeLimit: "6mb",
    // Codespaces' embedded preview can send a localhost Origin through its public host.
    allowedOrigins: host ? [host, "localhost:3000"] : [],
  } },
};
export default config;
