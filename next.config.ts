import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        // Pre-subpath pSEO URLs — preserve indexation with a 301.
        source: "/calc/:slug",
        destination: "/quarterline/calc/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
