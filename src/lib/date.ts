export function fmtDate(iso: string | null): string {
  if (!iso) return 'No deadline';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function deadlineStatus(iso: string | null): {
  label: string;
  tone: 'brand' | 'warning' | 'error' | 'neutral';
} {
  const days = daysUntil(iso);
  if (days === null) return { label: 'No deadline', tone: 'neutral' };
  if (days < 0) return { label: 'Overdue', tone: 'error' };
  if (days === 0) return { label: 'Due today', tone: 'warning' };
  if (days <= 3) return { label: `${days}d left`, tone: 'warning' };
  if (days <= 7) return { label: `${days}d left`, tone: 'brand' };
  return { label: `${days}d left`, tone: 'brand' };
}

export function deadlineDateForInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}
