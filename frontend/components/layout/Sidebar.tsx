'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Newspaper, BarChart3, Bookmark,
  Zap, ChevronLeft, ChevronRight, Settings,
  Database, FileText, GitBranch, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const NAV_ITEMS = [
  { href: '/',           icon: LayoutDashboard, label: 'Dashboard',   badge: null,  group: 'core' },
  { href: '/news',       icon: Newspaper,       label: 'News Feed',   badge: null,  group: 'core' },
  { href: '/insights',   icon: BarChart3,       label: 'Insights',    badge: null,  group: 'core' },
  { href: '/newsletter', icon: FileText,        label: 'Newsletter',  badge: 'NEW', group: 'outputs' },
  { href: '/raw-data',   icon: Database,        label: 'Raw Data',    badge: null,  group: 'outputs' },
  { href: '/saved',      icon: Bookmark,        label: 'Saved',       badge: null,  group: 'library' },
];

const GROUP_LABELS: Record<string, string> = {
  core:    'Intelligence',
  outputs: 'Reports',
  library: 'Library',
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useStore();

  const groups = NAV_ITEMS.reduce<Record<string, typeof NAV_ITEMS>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 60 : 216 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen z-40 flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, #060C18 0%, #040810 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-3 overflow-hidden"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 0 16px rgba(59,130,246,0.4)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <p className="text-xs font-black text-white leading-tight truncate tracking-tight">DealIntel</p>
                <p className="text-[9px] leading-tight truncate"
                   style={{ background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  FMCG Platform
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Live chip */}
      <AnimatePresence initial={false}>
        {!sidebarCollapsed ? (
          <motion.div
            key="chip-expanded"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-semibold" style={{ color: '#34d399' }}>AI Engine Active</span>
          </motion.div>
        ) : (
          <motion.div
            key="chip-collapsed"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-auto mt-3 w-2 h-2 rounded-full bg-emerald-500"
            style={{ boxShadow: '0 0 8px rgba(16,185,129,0.6)' }}
          />
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto no-scrollbar">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="px-2.5 mb-1 text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  {GROUP_LABELS[group]}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {items.map((navItem) => {
                const active = pathname === navItem.href;
                return (
                  <Link key={navItem.href} href={navItem.href}>
                    <div
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium',
                        'transition-all duration-150 cursor-pointer relative group',
                        !active && 'hover:bg-white/[0.04]',
                      )}
                      style={active
                        ? { background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.08))', border: '1px solid rgba(59,130,246,0.25)' }
                        : { border: '1px solid transparent' }
                      }
                    >
                      {active && (
                        <motion.div layoutId="sidebar-active" transition={{ duration: 0.2 }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                          style={{ background: 'linear-gradient(to bottom, #60a5fa, #a78bfa)' }}
                        />
                      )}
                      <navItem.icon className="w-4 h-4 flex-shrink-0"
                        style={{ color: active ? '#60a5fa' : 'rgba(255,255,255,0.35)' }} />
                      <AnimatePresence initial={false}>
                        {!sidebarCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            <span className={cn('truncate text-xs', active ? 'text-white font-semibold' : 'text-white/40 group-hover:text-white/70')}>
                              {navItem.label}
                            </span>
                            {navItem.badge && (
                              <span className="px-1 py-0.5 text-[8px] font-bold rounded"
                                    style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                                {navItem.badge}
                              </span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Stats */}
      <AnimatePresence initial={false}>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-3 mb-3 p-3 rounded-xl space-y-2"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Pipeline</p>
            {[
              { label: 'Acquisitions', value: '12', icon: Activity,  color: '#60a5fa' },
              { label: 'Investments',  value: '4',  icon: GitBranch, color: '#34d399' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                </div>
                <span className="text-xs font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom */}
      <div className="px-2 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-white/[0.04] transition-colors">
          <Settings className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle */}
      <button onClick={toggleSidebar}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center z-50"
        style={{ background: '#070C1A', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 12px rgba(0,0,0,0.6)' }}>
        {sidebarCollapsed
          ? <ChevronRight className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
          : <ChevronLeft  className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.35)' }} />}
      </button>
    </motion.aside>
  );
}
