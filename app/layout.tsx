import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Swole Squad',
  description: 'Group fitness challenges with your friends. Log daily, watch your avatar get swole.',
  applicationName: 'Swole Squad',
  manifest: '/manifest.webmanifest',
  // Makes the Home Screen version on iPhone open full screen with the right
  // status bar and a short name under the icon.
  appleWebApp: {
    capable: true,
    title: 'Swole Squad',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Stops iOS zooming when the app is full screen, and keeps the notch area
  // filled with our yellow instead of white.
  viewportFit: 'cover',
  themeColor: '#FFE066',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
