'use client';

import { Search, Bell, Command, MessageSquare, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function Header() {
  const { setCommandPalette, toggleChat, isOpen: chatOpen } = useStore();

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6
                       border-b border-white/[0.06] bg-background/60 backdrop-blur-xl
                       sticky top-0 z-30 flex-shrink-0">

      {/* Search trigger */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setCommandPalette(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04]
                   border border-white/[0.08] text-muted-foreground text-sm
                   hover:bg-white/[0.07] hover:border-white/[0.14] transition-all
                   w-48 md:w-64"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs flex-1 text-left">Search deals…</span>
        <div className="flex items-center gap-0.5 text-[10px] opacity-50 ml-auto">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      </motion.button>

      {/* Right actions */}
      <div className="flex items-center gap-1">

        {/* Export hint */}
        <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           text-xs text-muted-foreground hover:text-foreground
                           hover:bg-white/[0.05] transition-all">
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg
                           text-muted-foreground hover:text-foreground hover:bg-white/[0.05]
                           transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full
                           bg-blue-400 ring-2 ring-background" />
        </button>

        {/* AI chat toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleChat}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
            chatOpen
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]',
          )}
        >
          <MessageSquare className="w-4 h-4" />
        </motion.button>

        {/* Avatar */}
        <div className="ml-1 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600
                        flex items-center justify-center text-[11px] font-bold text-white
                        ring-2 ring-white/10 cursor-pointer">
          A
        </div>
      </div>
    </header>
  );
}
