import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/components/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'Light Church',
  description: 'AI-powered platform for gospel mission, discipleship, and ministry administration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
