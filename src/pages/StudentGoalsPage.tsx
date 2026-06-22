import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import type { Goal } from '../lib/types';
import { ProgressBar, EmptyState } from '../components/ui';
import {
  Target,
  PlusCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
} from 'lucide-react';
import { deadlineStatus, fmtDate } from '../lib/date';

type Tab = 'active' | 'completed' | 'all';
type ProgressFilter = 'all' | 'low' | 'mid' | 'high';

export function StudentGoalsPage() {
  const { profile } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');

  useEffect(() => {
    if (!profile) return;
    let active = true;
    supabase
      .from('goals')
      .select('*')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setGoals((data as Goal[]) || []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile]);

  const filtered = useMemo(() => {
    return goals
      .filter((g) => (tab === 'active' ? g.status === 'active' : tab === 'completed' ? g.status === 'completed' : true))
      .filter((g) =>
        query.trim()
          ? g.title.toLowerCase().includes(query.trim().toLowerCase())
          : true
      )
      .filter((g) => {
        if (progressFilter === 'all') return true;
        if (progressFilter === 'low') return g.progress < 50;
        if (progressFilter === 'mid') return g.progress >= 50 && g.progress < 100;
        return g.progress === 100;
      });
  }, [goals, tab, query, progressFilter]);

  const counts = useMemo(
    () => ({
      active: goals.filter((g) => g.status === 'active').length,
      completed: goals.filter((g) => g.status === 'completed').length,
      all: goals.length,
    }),
    [goals]
  );

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">My goals</h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage your SMART goals, update progress, and add reflections.
          </p>
        </div>
        <button
          onClick={() => navigate({ name: 'student-create-goal' })}
          className="btn-primary self-start"
        >
          <PlusCircle size={17} />
          New goal
        </button>
      </header>

      <div className="card p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg bg-ink-100 p-0.5">
            {(['active', 'completed', 'all'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition-all ${
                  tab === t
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {t}
                <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] font-bold text-ink-500">
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search goals..."
              className="input pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-ink-400" />
            <select
              value={progressFilter}
              onChange={(e) => setProgressFilter(e.target.value as ProgressFilter)}
              className="input w-auto py-2 pr-8"
            >
              <option value="all">All progress</option>
              <option value="low">Under 50%</option>
              <option value="mid">50–99%</option>
              <option value="high">100%</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 text-sm text-ink-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Target size={22} />}
            title={
              goals.length === 0 ? 'No goals yet' : 'No matching goals'
            }
            description={
              goals.length === 0
                ? 'Create your first SMART goal to get started.'
                : 'Try adjusting your filters or search.'
            }
            action={
              goals.length === 0 ? (
                <button
                  onClick={() => navigate({ name: 'student-create-goal' })}
                  className="btn-primary"
                >
                  <PlusCircle size={16} />
                  Create a goal
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((g) => {
            const ds = deadlineStatus(g.deadline);
            return (
              <button
                key={g.id}
                onClick={() => navigate({ name: 'student-goal', id: g.id })}
                className="card card-hover block p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink-900 line-clamp-2">
                    {g.title}
                  </h3>
                  {g.status === 'completed' ? (
                    <span className="badge bg-success-50 text-success-700 flex-shrink-0">
                      <CheckCircle2 size={11} /> Done
                    </span>
                  ) : (
                    <span
                      className={`badge flex-shrink-0 ${
                        ds.tone === 'error'
                          ? 'bg-error-50 text-error-700'
                          : ds.tone === 'warning'
                          ? 'bg-warning-50 text-warning-700'
                          : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      <Clock size={11} />
                      {ds.label}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-500">
                  {g.specific}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar
                    value={g.progress}
                    tone={g.progress === 100 ? 'success' : 'brand'}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold text-ink-700">
                    {g.progress}%
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-ink-400">
                  due {fmtDate(g.deadline)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
