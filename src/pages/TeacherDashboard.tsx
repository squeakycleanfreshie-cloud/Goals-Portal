import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';
import type { ClassRow, Goal, Profile } from '../lib/types';
import { EmptyState, ProgressBar, Spinner } from '../components/ui';
import {
  School,
  Plus,
  Target,
  CheckCircle2,
  TrendingUp,
  Users,
  ArrowRight,
} from 'lucide-react';

type ClassWithStats = ClassRow & {
  studentCount: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
};

export function TeacherDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [classes, setClasses] = useState<ClassWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });

    const clsList = (data as ClassRow[]) || [];
    if (clsList.length === 0) {
      setClasses([]);
      setLoading(false);
      return;
    }

    const classIds = clsList.map((c) => c.id);

    const [students] = await Promise.all([
      supabase.from('profiles').select('*').in('class_id', classIds),
    ]);

    const studentsList = (students.data as Profile[]) || [];
    const studentIds = studentsList.map((s) => s.id);
    const goalsResp =
      studentIds.length > 0
        ? await supabase.from('goals').select('*').in('student_id', studentIds)
        : { data: [] as Goal[] | null, error: null };
    const goalsList = (goalsResp.data as Goal[]) || [];

    const enriched: ClassWithStats[] = clsList.map((c) => {
      const classStudents = studentsList.filter((s) => s.class_id === c.id);
      const studentIds = new Set(classStudents.map((s) => s.id));
      const classGoals = goalsList.filter((g) => studentIds.has(g.student_id));
      const active = classGoals.filter((g) => g.status === 'active');
      const completed = classGoals.filter((g) => g.status === 'completed');
      const avg = classGoals.length
        ? Math.round(
            classGoals.reduce((s, g) => s + g.progress, 0) / classGoals.length
          )
        : 0;
      return {
        ...c,
        studentCount: classStudents.length,
        activeGoals: active.length,
        completedGoals: completed.length,
        avgProgress: avg,
      };
    });

    setClasses(enriched);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function createClass() {
    if (!profile) return;
    if (newName.trim().length < 2) {
      toast.push('error', 'Please enter a class name.');
      return;
    }
    setCreating(true);
    const { error } = await supabase
      .from('classes')
      .insert({
        name: newName.trim(),
        teacher_id: profile.id,
      });
    setCreating(false);
    if (error) {
      toast.push('error', 'Could not create class');
      return;
    }
    setNewName('');
    setShowCreate(false);
    toast.push('success', 'Class created');
    load();
  }

  if (!profile) return null;

  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0);
  const totalActive = classes.reduce((s, c) => s + c.activeGoals, 0);
  const totalCompleted = classes.reduce((s, c) => s + c.completedGoals, 0);
  const overallAvg =
    classes.length > 0
      ? Math.round(
          classes.reduce((s, c) => s + c.avgProgress, 0) / classes.length
        )
      : 0;

  const stats = [
    { label: 'Classes', value: classes.length, icon: School, tone: 'brand' },
    { label: 'Students', value: totalStudents, icon: Users, tone: 'brand' },
    { label: 'Active goals', value: totalActive, icon: Target, tone: 'brand' },
    { label: 'Completed', value: totalCompleted, icon: CheckCircle2, tone: 'success' },
    { label: 'Avg progress', value: `${overallAvg}%`, icon: TrendingUp, tone: 'brand' },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
            Teacher dashboard
          </h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary self-start">
          <Plus size={17} /> New class
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          const tone =
            s.tone === 'success'
              ? 'text-success-600 bg-success-50'
              : 'text-brand-600 bg-brand-50';
          return (
            <div key={s.label} className="card card-hover p-4 sm:p-5">
              <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
                <Icon size={17} />
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Your classes</h2>
          {classes.length > 0 && (
            <button
              onClick={() => navigate({ name: 'teacher-classes' })}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              View all
            </button>
          )}
        </div>

        {loading ? (
          <div className="card flex justify-center py-10">
            <Spinner />
          </div>
        ) : classes.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<School size={22} />}
              title="No classes yet"
              description="Create your first class to start tracking student goals."
              action={
                <button onClick={() => setShowCreate(true)} className="btn-primary">
                  <Plus size={16} /> Create a class
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate({ name: 'teacher-class', id: c.id })}
                className="card card-hover block p-5 text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-ink-900">{c.name}</h3>
                    <p className="mt-0.5 text-sm text-ink-500">
                      {c.studentCount} {c.studentCount === 1 ? 'student' : 'students'}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-ink-300" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Active" value={c.activeGoals} />
                  <MiniStat label="Done" value={c.completedGoals} />
                  <MiniStat label="Goals" value={c.activeGoals + c.completedGoals} />
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium text-ink-500">Avg progress</span>
                    <span className="font-semibold text-brand-700">{c.avgProgress}%</span>
                  </div>
                  <ProgressBar value={c.avgProgress} tone={c.avgProgress === 100 ? 'success' : 'brand'} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative w-full max-w-md card animate-slideIn">
            <div className="border-b border-ink-100 px-5 py-4">
              <h2 className="text-base font-semibold text-ink-900">Create a class</h2>
            </div>
            <div className="px-5 py-5">
              <label className="label">Class name</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createClass()}
                placeholder="e.g. Year 9 Maths — 9A"
                className="input"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="btn-ghost">
                  Cancel
                </button>
                <button onClick={createClass} disabled={creating} className="btn-primary">
                  {creating ? <Spinner className="text-white" /> : <Plus size={15} />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-50 py-2">
      <div className="text-lg font-bold text-ink-900">{value}</div>
      <div className="text-[11px] font-medium text-ink-500">{label}</div>
    </div>
  );
}
