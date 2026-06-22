import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Goal, ClassRow } from '../lib/types';
import { Avatar, ProgressBar, EmptyState, Spinner } from '../components/ui';
import { BadgesDisplay } from '../components/BadgesDisplay';
import { CheckCircle2, Target, Save, School, Mail, User as UserIcon, Award } from 'lucide-react';

export function StudentProfilePage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ total: number; active: number; completed: number; avg: number } | null>(null);
  const [cls, setCls] = useState<ClassRow | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    async function load() {
      if (!profile) return;
      const { data } = await supabase.from('goals').select('*').eq('student_id', profile.id);
      const goals = (data as Goal[]) || [];
      const active = goals.filter((g) => g.status === 'active');
      const completed = goals.filter((g) => g.status === 'completed');
      const avg = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;
      setStats({ total: goals.length, active: active.length, completed: completed.length, avg });
      if (profile.class_id) {
        const { data: classData } = await supabase.from('classes').select('*').eq('id', profile.class_id).maybeSingle();
        setCls((classData as ClassRow) || null);
      }
    }
    load();
  }, [profile]);

  async function saveName() {
    if (!profile) return;
    if (fullName.trim().length < 2) { toast.push('error', 'Please enter a valid name.'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', profile.id);
    setSaving(false);
    if (error) { toast.push('error', 'Could not save changes'); return; }
    toast.push('success', 'Profile updated');
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-ink-500">Your account details, goal summary, and achievements.</p>
      </header>

      <section className="card p-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile.full_name || 'U'} size={64} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-ink-900">{profile.full_name || 'Unnamed student'}</h2>
            <p className="truncate text-sm text-ink-500">{profile.email}</p>
            <span className="badge mt-1.5 bg-brand-50 text-brand-700 capitalize">{profile.role}</span>
          </div>
        </div>
        <div className="mt-5 space-y-3 border-t border-ink-100 pt-4 text-sm">
          <div className="flex items-center gap-2.5 text-ink-600"><Mail size={15} className="text-ink-400" />{profile.email}</div>
          <div className="flex items-center gap-2.5 text-ink-600"><UserIcon size={15} className="text-ink-400" />{profile.role === 'student' ? 'Student account' : 'Teacher account'}</div>
          <div className="flex items-center gap-2.5 text-ink-600"><School size={15} className="text-ink-400" />{cls ? cls.name : 'Not enrolled in a class'}</div>
        </div>
      </section>

      <section className="card p-6">
        <label className="label">Full name</label>
        <div className="flex gap-2">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          <button onClick={saveName} disabled={saving} className="btn-primary flex-shrink-0">
            {saving ? <Spinner className="text-white" /> : <Save size={15} />} Save
          </button>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-ink-900">Goal summary</h2>
        {!stats ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : stats.total === 0 ? (
          <EmptyState icon={<Target size={22} />} title="No goals yet" description="Once you create goals, your stats will appear here." />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Active" value={stats.active} tone="brand" />
            <Stat label="Completed" value={stats.completed} tone="success" icon={<CheckCircle2 size={15} />} />
            <Stat label="Total" value={stats.total} tone="neutral" />
            <div className="col-span-3 rounded-xl bg-ink-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-700">Average progress</span>
                <span className="font-bold text-brand-700">{stats.avg}%</span>
              </div>
              <ProgressBar value={stats.avg} tone={stats.avg === 100 ? 'success' : 'brand'} />
            </div>
          </div>
        )}
      </section>

      <section className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Award size={18} className="text-warning-500" />
          <h2 className="text-base font-semibold text-ink-900">Achievements</h2>
        </div>
        <BadgesDisplay studentId={profile.id} />
      </section>
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: number; tone: 'brand' | 'success' | 'neutral'; icon?: React.ReactNode }) {
  const toneClass = tone === 'success' ? 'text-success-600 bg-success-50' : tone === 'neutral' ? 'text-ink-600 bg-ink-100' : 'text-brand-600 bg-brand-50';
  return (
    <div className="rounded-xl border border-ink-100 p-3.5 text-center">
      <div className={`mx-auto mb-1.5 grid h-8 w-8 place-items-center rounded-lg ${toneClass}`}>
        {icon || <Target size={15} />}
      </div>
      <div className="text-xl font-bold text-ink-900">{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}
