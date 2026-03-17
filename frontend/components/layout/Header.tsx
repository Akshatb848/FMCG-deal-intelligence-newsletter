'use client';

import { Search, Bell, Command, MessageSquare, Cpu, Wifi } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/':           { title: 'Dashboard',   sub: 'Intelligence Overview' },
  '/news':       { title: 'News Feed',   sub: 'Live Deal Activity' },
  '/insights':   { title: 'Insights',    sub: 'Deep Analytics' },
  '/newsletter': { title: 'Newsletter',  sub: 'Daily Intelligence Brief' },
  '/raw-data':   { title: 'Raw Data',    sub: 'Stage 1 Output' },
  '/saved':      { title: 'Saved',       sub: 'Bookmarked Deals' },
};

export function Header() {
  const { toggleCommandPalette, toggleChat, chatOpen } = useStore();
  const pathname = usePathname();
  const page = PAGE_TITLES[pathname] ?? { title: 'Platform', sub: '' };

  return (
    <header
      className="h-14 flex items-center px-4 gap-4 flex-shrink-0 relative"
      style={{
        background: 'rgba(5,9,20,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Page title */}
      <div className="flex items-center gap-2 min-w-0">
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">{page.title}</h1>
          {page.sub && <p className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.3)' }}>{page.sub}</p>}
        </div>
      </div>

      <div className="flex-1" />

      {/* System status indicators */}
      <div className="hidden md:flex items-center gap-3 mr-2">
        {/* AI Engine */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
             style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <Cpu className="w-3 h-3" style={{ color: '#60a5fa' }} />
          <span className="text-[10px] font-medium" style={{ color: '#60a5fa' }}>AI Ready</span>
        </div>
        {/* Connection */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
             style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <Wifi className="w-3 h-3" style={{ color: '#34d399' }} />
          <span className="text-[10px] font-medium" style={{ color: '#34d399' }}>Live</span>
        </div>
      </div>

      {/* Search trigger */}
      <button
        onClick={toggleCommandPalette}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.35)',
        }}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:block">Search…</span>
        <div className="hidden sm:flex items-center gap-0.5 ml-1">
          <kbd className="px-1 rounded text-[9px]"
               style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
            ⌘
          </kbd>
          <kbd className="px-1 rounded text-[9px]"
               style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
            K
          </kbd>
        </div>
      </button>

      {/* Bell */}
      <button className="relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
        <Bell className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"
              style={{ boxShadow: '0 0 6px rgba(59,130,246,0.7)' }} />
      </button>

      {/* AI chat toggle */}
      <button
        onClick={toggleChat}
        className="p-2 rounded-lg transition-all"
        style={{
          background: chatOpen ? 'rgba(139,92,246,0.15)' : 'transparent',
          border: chatOpen ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
          color: chatOpen ? '#a78bfa' : 'rgba(255,255,255,0.35)',
        }}
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
           style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
        A
      </div>
    </header>
  );
}
