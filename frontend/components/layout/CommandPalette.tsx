'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Newspaper, BarChart3, Bookmark,
  Search, ArrowRight, TrendingUp, Zap,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard',          icon: LayoutDashboard, href: '/',         group: 'Pages' },
  { id: 'news',      label: 'News Feed',           icon: Newspaper,       href: '/news',     group: 'Pages' },
  { id: 'insights',  label: 'Insights & Charts',   icon: BarChart3,       href: '/insights', group: 'Pages' },
  { id: 'saved',     label: 'Saved Articles',       icon: Bookmark,        href: '/saved',    group: 'Pages' },
  { id: 'deals',     label: 'Top Deals Today',      icon: TrendingUp,      href: '/news',     group: 'Quick Actions' },
  { id: 'pipeline',  label: 'Run Pipeline',         icon: Zap,             href: '/',         group: 'Quick Actions' },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPalette } = useStore();
  const router = useRouter();

  const handleClose = useCallback(() => setCommandPalette(false), [setCommandPalette]);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        setCommandPalette(!commandPaletteOpen);
      }
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPalette, handleClose]);

  const navigate = (href: string) => {
    router.push(href);
    handleClose();
  };

  const grouped = ITEMS.reduce<Record<string, typeof ITEMS>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4"
          >
            <Command
              className="glass rounded-xl overflow-hidden shadow-2xl shadow-black/50"
              label="Command palette"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-white/[0.08]">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Command.Input
                  placeholder="Search pages, deals, actions…"
                  className="flex-1 bg-transparent py-3.5 text-sm text-foreground
                             placeholder:text-muted-foreground outline-none"
                />
                <kbd className="text-[10px] text-muted-foreground border border-white/10
                                rounded px-1.5 py-0.5">Esc</kbd>
              </div>

              <Command.List className="max-h-72 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {Object.entries(grouped).map(([group, items]) => (
                  <Command.Group key={group} heading={group}
                    className="[&_[cmdk-group-heading]]:text-[10px]
                               [&_[cmdk-group-heading]]:uppercase
                               [&_[cmdk-group-heading]]:tracking-wider
                               [&_[cmdk-group-heading]]:text-muted-foreground
                               [&_[cmdk-group-heading]]:px-2
                               [&_[cmdk-group-heading]]:py-1.5
                               [&_[cmdk-group-heading]]:font-semibold"
                  >
                    {items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.label}
                        onSelect={() => navigate(item.href)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                                   text-sm text-muted-foreground cursor-pointer
                                   data-[selected=true]:bg-primary/15
                                   data-[selected=true]:text-foreground
                                   hover:bg-white/[0.05] transition-colors"
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <ArrowRight className="w-3 h-3 opacity-40" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className="border-t border-white/[0.06] px-4 py-2 flex items-center gap-4
                              text-[10px] text-muted-foreground">
                <span><kbd className="border border-white/10 rounded px-1">↑↓</kbd> Navigate</span>
                <span><kbd className="border border-white/10 rounded px-1">↵</kbd> Select</span>
                <span><kbd className="border border-white/10 rounded px-1">Esc</kbd> Close</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
