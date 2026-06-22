import { useEffect, useRef, useState } from 'react';
import { Bell, MessageSquareText, AlarmClock, Trophy, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Notification, NotificationType } from '../lib/types';
import { navigate } from '../lib/router';

const ICONS: Record<NotificationType, typeof Bell> = {
  feedback: MessageSquareText,
  deadline: AlarmClock,
  completion: Trophy,
  review: ClipboardCheck,
  overdue: AlertTriangle,
};
const TONES: Record<NotificationType, string> = {
  feedback: 'bg-brand-50 text-brand-600',
  deadline: 'bg-warning-50 text-warning-600',
  completion: 'bg-success-50 text-success-600',
  review: 'bg-ink-100 text-ink-600',
  overdue: 'bg-error-50 text-error-600',
};

export function NotificationsBell() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      if (!profile) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(25);
      setItems((data as Notification[]) || []);
    }
    load();

    channel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!profile) return;
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
    setItems((list) => list.map((n) => ({ ...n, read: true })));
  }

  async function openItem(n: Notification) {
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    }
    setOpen(false);
    if (n.goal_id) navigate({ name: 'student-goal', id: n.goal_id });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllRead();
        }}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-100 transition-colors"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white animate-pulseDot">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] card animate-slideIn overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-ink-900">Notifications</h3>
            {unread > 0 && (
              <span className="text-xs font-medium text-brand-600">
                {unread} new
              </span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ink-400">
                <Bell size={22} className="mx-auto mb-2 text-ink-300" />
                You're all caught up
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className="flex w-full items-start gap-3 border-b border-ink-50 px-4 py-3 text-left hover:bg-ink-50 transition-colors last:border-0"
                  >
                    <span
                      className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${TONES[n.type]}`}
                    >
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink-800">
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
}
