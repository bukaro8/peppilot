import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    agentUpgrade: "security",
  },
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
