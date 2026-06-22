import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Svarit — Honouring Legacy, Shaping the Future of Indian Music',
    short_name: 'Svarit',
    description:
      'Founded in 2001, Svarit carries a rich musical legacy into the future — nurturing Indian music through concerts, festivals, education and community.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fef7ed',
    theme_color: '#fef7ed',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
