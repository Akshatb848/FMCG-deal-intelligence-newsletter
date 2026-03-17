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
      <body className="bg-background text-foreground min-h-screen">
        <Providers>
          {/* Background grid pattern */}
          <div
            className="fixed inset-0 pointer-events-none opacity-[0.3]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Command palette */}
          <CommandPalette />

          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto relative">
                {children}
              </main>
            </div>
          </div>

          {/* AI assistant floating panel */}
          <AIAssistant />
        </Providers>
      </body>
    </html>
  );
}
