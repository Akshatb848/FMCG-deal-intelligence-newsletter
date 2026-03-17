import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { AIAssistant } from '@/components/ai/AIAssistant';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FMCG Deal Intelligence | Market Analytics Platform',
  description: 'Real-time FMCG deal intelligence — acquisitions, investments, and divestitures tracked by AI-powered pipelines.',
  keywords: ['FMCG', 'M&A', 'deal intelligence', 'market analytics'],
};

export const viewport: Viewport = {
  themeColor: '#0A0D1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body style={{ backgroundColor: '#060C15' }} className="text-foreground min-h-screen">
        <Providers>
          {/* Background: subtle dot grid */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              opacity: 0.6,
            }}
          />
          {/* Ambient top glow */}
          <div
            className="fixed inset-x-0 top-0 pointer-events-none h-64"
            style={{
              background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 70%)',
            }}
          />

          <CommandPalette />

          <div className="flex h-screen overflow-hidden relative z-10">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto relative">
                {children}
              </main>
            </div>
          </div>

          <AIAssistant />
        </Providers>
      </body>
    </html>
  );
}
