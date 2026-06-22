import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import type { Goal, Feedback } from '../lib/types';
import { ProgressBar, EmptyState, Avatar } from '../components/ui';
import {
  Target,
  PlusCircle,
  CheckCircle2,
  Clock,
  MessageSquareText,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { deadlineStatus, fmtDate, timeAgo } from '../lib/date';

export function StudentDashboard() {
  const { profile } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [feedback, setFeedback] = useState<(Feedback & { goal?: Goal })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let active = true;

    async function load() {
      if (!profile) return;
      const [g, f] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('feedback')
          .select('*, goal:goals(*)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      if (!active) return;

      // filter feedback to this student's goals only
      const goalIds = new Set((g.data as Goal[] | null)?.map((x) => x.id) || []);
      const myFeedback = ((f.data as any[]) || [])
        .filter((row) => row.goal && goalIds.has(row.goal.id))
        .map((row) => row as Feedback & { goal: Goal });

      setGoals((g.data as Goal[]) || []);
      setFeedback(myFeedback);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [profile]);

  if (!profile) return null;

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const avgProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
        )
      : 0;
  const overdueCount = activeGoals.filter((g) => {
    if (!g.deadline) return false;
    return new Date(g.deadline).getTime() < Date.now();
  }).length;

  const stats = [
    {
      label: 'Active goals',
      value: activeGoals.length,
      icon: Target,
      tone: 'brand',
    },
    {
      label: 'Completed',
      value: completedGoals.length,
      icon: CheckCircle2,
      tone: 'success',
    },
    {
      label: 'Average progress',
      value: `${avgProgress}%`,
      icon: TrendingUp,
      tone: 'brand',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      icon: AlertTriangle,
      tone: overdueCount > 0 ? 'error' : 'neutral',
    },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink-400">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
            Welcome back, {profile.full_name.split(' ')[0]}
          </h1>
        </div>
        <button
          onClick={() => navigate({ name: 'student-create-goal' })}
          className="btn-primary self-start"
        >
          <PlusCircle size={17} />
          New SMART goal
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const tone =
            s.tone === 'success'
              ? 'text-success-600 bg-success-50'
              : s.tone === 'error'
              ? 'text-error-600 bg-error-50'
              : s.tone === 'neutral'
              ? 'text-ink-500 bg-ink-100'
              : 'text-brand-600 bg-brand-50';
          return (
            <div key={s.label} className="card card-hover p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
                  <Icon size={17} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-ink-900 sm:text-3xl">
                {s.value}
              </div>
              <div className="text-xs font-medium text-ink-500 sm:text-sm">
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Active goals</h2>
            {activeGoals.length > 0 && (
              <button
                onClick={() => navigate({ name: 'student-goals' })}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                View all
              </button>
            )}
          </div>

          {loading ? (
            <div className="card p-6 text-sm text-ink-400">Loading...</div>
          ) : activeGoals.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Target size={22} />}
                title="No active goals yet"
                description="Create your first SMART goal to start tracking progress."
                action={
                  <button
                    onClick={() => navigate({ name: 'student-create-goal' })}
                    className="btn-primary"
                  >
                    <PlusCircle size={16} />
                    Create a goal
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 4).map((g) => {
                const ds = deadlineStatus(g.deadline);
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate({ name: 'student-goal', id: g.id })}
                    className="card card-hover block w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-ink-900">
                          {g.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {g.reviewed && (
                            <span className="badge bg-success-50 text-success-700">
                              <CheckCircle2 size={11} /> Reviewed
                            </span>
                          )}
                          <span
                            className={`badge ${
                              ds.tone === 'error'
                                ? 'bg-error-50 text-error-700'
                                : ds.tone === 'warning'
                                ? 'bg-warning-50 text-warning-700'
                                : ds.tone === 'brand'
                                ? 'bg-brand-50 text-brand-700'
                                : 'bg-ink-100 text-ink-600'
                            }`}
                          >
                            <Clock size={11} />
                            {ds.label}
                          </span>
                          <span className="text-xs text-ink-400">
                            due {fmtDate(g.deadline)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-semibold text-brand-700">
                        {g.progress}%
                      </div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar
                        value={g.progress}
                        tone={g.progress === 100 ? 'success' : 'brand'}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-ink-900">
            Recent feedback
          </h2>
          <div className="card p-4">
            {feedback.length === 0 ? (
              <EmptyState
                icon={<MessageSquareText size={22} />}
                title="No feedback yet"
                description="When your teacher leaves feedback on a goal, it'll appear here."
              />
            ) : (
              <ul className="space-y-4">
                {feedback.map((f) => (
                  <li key={f.id} className="flex gap-3">
                    <Avatar name="Teacher" size={32} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-900">
                          Teacher feedback
                        </p>
                        <span className="text-[11px] text-ink-400">
                          {timeAgo(f.created_at)}
                        </span>
                      </div>
                      {f.goal && (
                        <button
                          onClick={() =>
                            navigate({ name: 'student-goal', id: f.goal!.id })
                          }
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          on "{f.goal.title}"
                        </button>
                      )}
                      <p className="mt-1 text-sm text-ink-600">{f.comment}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
