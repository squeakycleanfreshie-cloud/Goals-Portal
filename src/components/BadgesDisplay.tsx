import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BADGE_DEFS } from '../lib/badges';
import type { Badge } from '../lib/types';
import { EmptyState } from './ui';
import { Award } from 'lucide-react';

export function BadgesDisplay({ studentId }: { studentId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('badges')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBadges((data as Badge[]) ?? []);
        setLoading(false);
      });
  }, [studentId]);

  if (loading) return null;

  return (
    <div>
      {badges.length === 0 ? (
        <EmptyState
          icon={<Award size={20} />}
          title="No badges yet"
          description="Complete goals, write journals, and reflect to earn badges."
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => {
            const def = BADGE_DEFS[b.type as keyof typeof BADGE_DEFS];
            if (!def) return null;
            return (
              <div
                key={b.id}
                title={def.description}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${def.color}`}
              >
                <span className="text-base leading-none">{def.emoji}</span>
                {def.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BadgeCount({ studentId }: { studentId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('badges')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [studentId]);

  if (count === null || count === 0) return null;
  return (
    <span className="badge bg-warning-50 text-warning-800">
      {count} badge{count !== 1 ? 's' : ''}
    </span>
  );
}
