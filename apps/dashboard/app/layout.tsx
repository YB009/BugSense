import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppBoot } from './components/providers/AppBoot';

export const metadata: Metadata = {
  title: 'BugSense Dashboard',
  description: 'Self-hosted error monitoring dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
  }>) {
  if (!process.env.BUGSENSE_API_URL) {
    throw new Error('BUGSENSE_API_URL is required for apps/dashboard');
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
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
