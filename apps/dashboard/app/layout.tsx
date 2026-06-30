import './globals.css';
import type { Metadata } from 'next';
import { JetBrains_Mono, Sora } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppBoot } from './components/providers/AppBoot';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500', '600', '700'],
});

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
      <body className={`${sora.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
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
