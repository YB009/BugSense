import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppBoot } from './components/providers/AppBoot';

export const metadata: Metadata = {
  title: 'BugSense Dashboard',
  description: 'Self-hosted error monitoring dashboard',
};

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
  }>) {
  if (!process.env.BUGSENSE_API_URL) {
    console.error(
      'BUGSENSE_API_URL is not set for apps/dashboard. Falling back to http://localhost:3000.',
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = window.localStorage.getItem('bugsense-theme');
    const resolved = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
})();`,
          }}
        />
        <AppBoot>
          <div className="shell">{children}</div>
        </AppBoot>
      </body>
    </html>
  );
}
