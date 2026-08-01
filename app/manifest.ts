import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Swole Squad',
    short_name: 'Swole Squad',
    description: 'Group fitness challenges with your friends. Log daily, get swole.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFE066',
    theme_color: '#FFE066',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
