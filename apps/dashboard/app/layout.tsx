import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'BugSense Dashboard',
  description: 'Self-hosted error monitoring dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
  }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
