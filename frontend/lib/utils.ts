import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { DealType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parseISO(dateStr));
  } catch {
    return dateStr;
  }
}

export const DEAL_TYPE_CONFIG: Record<
  DealType,
  { color: string; bg: string; border: string; dot: string }
> = {
  Acquisition:       { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-400' },
  Merger:            { color: 'text-violet-400',  bg: 'bg-violet-500/10', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  Investment:        { color: 'text-emerald-400', bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',dot: 'bg-emerald-400' },
  Divestiture:       { color: 'text-rose-400',    bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   dot: 'bg-rose-400' },
  'Stake Acquisition':{ color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   dot: 'bg-cyan-400' },
  'Joint Venture':   { color: 'text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  Other:             { color: 'text-slate-400',   bg: 'bg-slate-500/10',  border: 'border-slate-500/30',  dot: 'bg-slate-400' },
};

export const SOURCE_TIER_LABEL: Record<number, string> = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3',
  0: 'Unknown',
};

export const SOURCE_TIER_COLOR: Record<number, string> = {
  1: 'text-emerald-400',
  2: 'text-blue-400',
  3: 'text-amber-400',
  0: 'text-slate-400',
};

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 30) return 'text-amber-400';
  return 'text-rose-400';
}

export function scoreBar(score: number, max = 100): number {
  return Math.min(100, (score / max) * 100);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + '…';
}
