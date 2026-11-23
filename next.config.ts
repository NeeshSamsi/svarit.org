import type { NextConfig } from 'next'
import { campaignRedirects, buildCampaignRedirects } from './src/lib/redirects'

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
      // The /events index and its 24 event pages moved to /initiatives; keep the
      // live old URLs working.
      {
        source: '/events',
        destination: '/initiatives',
        permanent: true,
      },
      {
        source: '/events/:uid',
        destination: '/initiatives/:uid',
        permanent: true,
      },
      // The ashwini-bhide artist document was renamed to her full name; keep
      // the old URL alive.
      {
        source: '/artists/ashwini-bhide',
        destination: '/artists/ashwini-bhide-deshpande',
        permanent: true,
      },
      // Shortcut to the Umami dashboard for this site (login required).
      {
        source: '/stats',
        destination:
          'https://umami.neeshsamsi.com/teams/7b402cda-241b-423c-a08b-72e1af96121c/websites/295db284-4940-4d76-8222-b284f4cbb4ed',
        permanent: true,
      },
      // Temporary: /dinarang-centenary is a working name being tried ahead
      // of a final decision. permanent: false makes this a 307, not a 308;
      // a 308 gets cached hard by browsers and is painful to undo if the
      // URL changes again.
      {
        source: '/dinarang-centenary',
        destination: '/centenary',
        permanent: false,
      },
      // Temporary: the Samagam baithak's AllEvents listing, Nov 2026. A 307
      // so it can be repointed or removed once the event is over.
      {
        source: '/samagam',
        destination: 'https://all.events/go/80002737947616',
        permanent: false,
      },
      // {
      //   source: "/:path*",
      //   destination: "https://instagram.com/svaritorg",
      //   permanent: true,
      // },
      // Campaign/vanity links (svarit.org/<slug>): see src/lib/redirects.ts,
      // the single home for those, for the playbook and validation.
      ...buildCampaignRedirects(campaignRedirects),
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Prismic's preview and slice simulator both load the live site in an
          // iframe served from the writing room (svarit.prismic.io), so a plain
          // X-Frame-Options: SAMEORIGIN would break the editor. A single CSP
          // frame-ancestors directive gives the same clickjacking protection
          // while allowlisting that one origin. This is not a full CSP, which
          // stays out of scope.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://svarit.prismic.io",
          },
        ],
      },
    ]
  },
}

export default nextConfig
