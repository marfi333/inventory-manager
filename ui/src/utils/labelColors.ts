export const LABEL_COLORS = ['slate', 'indigo', 'emerald', 'amber', 'rose'] as const
export type LabelColor = (typeof LABEL_COLORS)[number]

const TABLE: Record<string, { chip: string; dot: string }> = {
  slate:   { chip: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200', dot: 'bg-slate-400' },
  indigo:  { chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200', dot: 'bg-indigo-500' },
  emerald: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200', dot: 'bg-emerald-500' },
  amber:   { chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', dot: 'bg-amber-500' },
  rose:    { chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', dot: 'bg-rose-500' },
}

export function chipClass(color?: string): string {
  return (TABLE[color ?? 'slate'] ?? TABLE.slate).chip
}

export function dotClass(color?: string): string {
  return (TABLE[color ?? 'slate'] ?? TABLE.slate).dot
}
