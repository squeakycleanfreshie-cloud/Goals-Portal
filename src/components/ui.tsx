import type { ReactNode } from 'react';

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-xl bg-brand-600 text-white shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 3v18h18"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 14l4-5 3 3 5-6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19.5" cy="5.5" r="1.6" fill="currentColor" />
      </svg>
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-brand-500 ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({
  name,
  size = 36,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  // deterministic color from name
  const colors = [
    'bg-brand-600',
    'bg-success-600',
    'bg-warning-500',
    'bg-brand-800',
    'bg-success-800',
  ];
  const idx =
    name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div
      className={`grid place-items-center rounded-full text-white font-semibold ${colors[idx]} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials || '?'}
    </div>
  );
}

export function ProgressBar({
  value,
  className = '',
  tone = 'brand',
}: {
  value: number;
  className?: string;
  tone?: 'brand' | 'success' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-success-500'
      : tone === 'warning'
      ? 'bg-warning-500'
      : 'bg-brand-500';
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`progress-track ${className}`}>
      <div
        className={`h-full rounded-full ${toneClass} transition-[width] duration-700 ease-out`}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
