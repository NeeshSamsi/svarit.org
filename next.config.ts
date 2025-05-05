import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/UKS",
        destination: "https://forms.gle/9Nz9JoopR4j7soLe8",
        permanent: true,
      },
      {
        source: "/uks",
        destination: "https://forms.gle/9Nz9JoopR4j7soLe8",
        permanent: true,
      },
      {
        source: "/:path*",
        destination: "https://instagram.com/svaritorg",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
