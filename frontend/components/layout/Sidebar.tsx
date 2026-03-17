'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Newspaper, BarChart3, Bookmark,
  Zap, ChevronLeft, ChevronRight, Settings, HelpCircle,
  TrendingUp, Activity, FileText, Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const NAV_ITEMS = [
  { href: '/',            icon: LayoutDashboard, label: 'Dashboard',   group: 'main' },
  { href: '/news',        icon: Newspaper,       label: 'News Feed',   group: 'main' },
  { href: '/insights',   icon: BarChart3,        label: 'Insights',    group: 'main' },
  { href: '/newsletter',  icon: FileText,        label: 'Newsletter',  group: 'reports' },
  { href: '/raw-data',    icon: Database,        label: 'Raw Data',    group: 'reports' },
  { href: '/saved',       icon: Bookmark,        label: 'Saved',       group: 'main' },
];

const BOTTOM_ITEMS = [
  { href: '#', icon: Settings,   label: 'Settings' },
  { href: '#', icon: HelpCircle, label: 'Help'     },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen z-40 flex-shrink-0
                 border-r border-white/[0.06] bg-background/80 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-3 border-b border-white/[0.06] overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600
                          flex items-center justify-center flex-shrink-0 glow-blue">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <p className="text-sm font-bold text-white leading-tight truncate">
                  Deal Intel
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">
                  FMCG Platform
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status chip */}
      <AnimatePresence initial={false}>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-emerald-500/10 border
                       border-emerald-500/20 flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full
                               bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">Live · 24 deals</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium',
                  'transition-all duration-150 cursor-pointer relative group',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5
                               rounded-full bg-primary"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <item.icon className={cn(
                  'w-4 h-4 flex-shrink-0',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )} />
                <AnimatePresence initial={false}>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2 border-t border-white/[0.06]" />

        {/* Quick stats */}
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-3 py-2 space-y-3"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Pipeline Status
            </p>
            {[
              { label: 'Acquisitions', value: '12', color: 'bg-blue-400', Icon: TrendingUp },
              { label: 'Investments',  value: '4',  color: 'bg-emerald-400', Icon: Activity },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', color)} />
                  <span className="text-xs font-semibold text-foreground">{value}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-2 border-t border-white/[0.06] space-y-0.5">
        {BOTTOM_ITEMS.map((item) => (
          <div
            key={item.href}
            className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm
                       text-muted-foreground hover:text-foreground hover:bg-white/[0.05]
                       transition-all duration-150 cursor-pointer"
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full
                   bg-background border border-white/10 flex items-center justify-center
                   hover:bg-white/10 transition-colors z-50"
      >
        {sidebarCollapsed
          ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
          : <ChevronLeft  className="w-3 h-3 text-muted-foreground" />}
      </button>
    </motion.aside>
  );
}
