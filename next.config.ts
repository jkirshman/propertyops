import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent `next dev` from auto-appending its agent-rules block to CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
