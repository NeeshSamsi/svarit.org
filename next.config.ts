import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      // {
      //   source: "/uks",
      //   destination: "https://forms.gle/9Nz9JoopR4j7soLe8",
      //   permanent: true,
      // },
      {
        source: "/singingdinarang",
        destination:
          "https://docs.google.com/forms/d/e/1FAIpQLScTKRRpb9_VtaYkIZnECzL3Q2sT40oJIuP6sFIn70q_qzHDyA/viewform?usp=header",
        permanent: true,
      },
      // {
      //   source: "/:path*",
      //   destination: "https://instagram.com/svaritorg",
      //   permanent: true,
      // },
    ]
  },
}

export default nextConfig
