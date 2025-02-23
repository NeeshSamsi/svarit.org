import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/DS25",
        destination: "https://forms.gle/5ymhiMrYK4S2dp8AA",
        permanent: true,
      },
      {
        source: "/ds25",
        destination: "https://forms.gle/5ymhiMrYK4S2dp8AA",
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
