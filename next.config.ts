import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // Next blocks dev resources (/_next/hmr) from hosts it does not recognise, so
  // opening the site on the LAN IP or 127.0.0.1 silently loses hot reload.
  allowedDevOrigins: ['127.0.0.1', '192.168.29.2'],
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      // {
      //   source: "/uks",
      //   destination: "https://forms.gle/9Nz9JoopR4j7soLe8",
      //   permanent: true,
      // },
      {
        source: '/singingdinarang',
        destination:
          'https://docs.google.com/forms/d/e/1FAIpQLScTKRRpb9_VtaYkIZnECzL3Q2sT40oJIuP6sFIn70q_qzHDyA/viewform?usp=header',
        permanent: true,
      },
      // {
      //   source: "/:path*",
      //   destination: "https://instagram.com/svaritorg",
      //   permanent: true,
      // },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/u/:path*',
        destination: 'https://umami.neeshsamsi.com/:path*',
      },
    ]
  },
}

export default nextConfig
