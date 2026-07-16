import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old /about content now lives on the landing page.
      { source: "/about", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
