import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Domain.com.au listing images
      { protocol: "https", hostname: "bucket-api.domain.com.au", pathname: "/**" },
      { protocol: "https", hostname: "rimh2.domainstatic.com.au", pathname: "/**" },
      { protocol: "https", hostname: "**.domainstatic.com.au", pathname: "/**" },
      { protocol: "https", hostname: "images.domain.com.au", pathname: "/**" },
      // REA (realestate.com.au) listing images
      { protocol: "https", hostname: "bucket-api.realestate.com.au", pathname: "/**" },
      { protocol: "https", hostname: "**.reastatic.net", pathname: "/**" },
      { protocol: "https", hostname: "images.realestate.com.au", pathname: "/**" },
      // Facebook CDN
      { protocol: "https", hostname: "**.fbcdn.net", pathname: "/**" },
      // Generic image CDNs
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
