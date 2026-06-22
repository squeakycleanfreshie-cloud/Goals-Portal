import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';
import type { ClassRow, Goal, Profile } from '../lib/types';
import { Avatar, EmptyState, ProgressBar, Spinner } from '../components/ui';
import { Modal } from '../components/Modal';
import { School, ArrowLeft, UserPlus, Search, Users, Target, CheckCircle2, Filter } from 'lucide-react';

type ProgressFilter = 'all' | 'low' | 'mid' | 'high';

type StudentWithStats = Profile & {
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  totalGoals: number;
};

export function TeacherClassPage({ classId }: { classId: string }) {
  const toast = useToast();
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');

  // add student
  const [showAdd, setShowAdd] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  const load = useCallback(async () => {
    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle();
    if (!classData) {
      setLoading(false);
      return;
    }
    setCls(classData as ClassRow);

    const { data: studentsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('class_id', classId)
      .order('full_name', { ascending: true });
    const studentsList = (studentsData as Profile[]) || [];
    const studentIds = studentsList.map((s) => s.id);
    const goalsResp =
      studentIds.length > 0
        ? await supabase.from('goals').select('*').in('student_id', studentIds)
        : { data: [] as Goal[] | null, error: null };
    const goalsList = (goalsResp.data as Goal[]) || [];

    const enriched: StudentWithStats[] = studentsList.map((s) => {
      const sGoals = goalsList.filter((g) => g.student_id === s.id);
      const active = sGoals.filter((g) => g.status === 'active');
      const completed = sGoals.filter((g) => g.status === 'completed');
      const avg = sGoals.length
        ? Math.round(sGoals.reduce((sum, g) => sum + g.progress, 0) / sGoals.length)
        : 0;
      return {
        ...s,
        activeGoals: active.length,
        completedGoals: completed.length,
        totalGoals: sGoals.length,
        avgProgress: avg,
      };
    });
    setStudents(enriched);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  async function searchStudent() {
    if (!studentEmail.trim()) return;
    setSearching(true);
    setSearchResult(null);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', studentEmail.trim().toLowerCase())
      .eq('role', 'student')
      .maybeSingle();
    setSearching(false);
    if (!data) {
      toast.push('error', 'No student found with that email.');
      return;
    }
    if (data.class_id === classId) {
      toast.push('error', 'Student is already in this class.');
      return;
    }
    setSearchResult(data as Profile);
  }

  async function addStudent() {
    if (!searchResult) return;
    setAddingStudent(true);
    const { error } = await supabase
      .from('profiles')
      .update({ class_id: classId })
      .eq('id', searchResult.id);
    setAddingStudent(false);
    if (error) {
      toast.push('error', 'Could not add student');
      return;
    }
    toast.push('success', `${searchResult.full_name} added`);
    setShowAdd(false);
    setSearchResult(null);
    setStudentEmail('');
    load();
  }

  const filtered = useMemo(() => {
    return students
      .filter((s) =>
        query.trim()
          ? s.full_name.toLowerCase().includes(query.trim().toLowerCase()) ||
            s.email.toLowerCase().includes(query.trim().toLowerCase())
          : true
      )
      .filter((s) => {
        if (s.totalGoals === 0) return progressFilter === 'all';
        if (progressFilter === 'low') return s.avgProgress < 50;
        if (progressFilter === 'mid') return s.avgProgress >= 50 && s.avgProgress < 100;
        if (progressFilter === 'high') return s.avgProgress === 100;
        return true;
      });
  }, [students, query, progressFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="card">
        <EmptyState
          icon={<School size={22} />}
          title="Class not found"
          description="This class may have been deleted."
          action={
            <button onClick={() => navigate({ name: 'teacher-classes' })} className="btn-primary">
              Back to classes
            </button>
          }
        />
      </div>
    );
  }

  const totalActive = students.reduce((s, x) => s + x.activeGoals, 0);
  const totalCompleted = students.reduce((s, x) => s + x.completedGoals, 0);
  const classAvg =
    students.length > 0
      ? Math.round(students.reduce((s, x) => s + x.avgProgress, 0) / students.length)
      : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate({ name: 'teacher-classes' })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft size={15} /> Back to classes
      </button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{cls.name}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary self-start">
          <UserPlus size={16} /> Add student
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Students" value={students.length} tone="brand" />
        <StatCard icon={Target} label="Active goals" value={totalActive} tone="brand" />
        <StatCard icon={CheckCircle2} label="Completed" value={totalCompleted} tone="success" />
        <StatCard icon={Target} label="Avg progress" value={`${classAvg}%`} tone="brand" />
      </div>

      <div className="card p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
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

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={students.length === 0 ? <School size={22} /> : <Users size={22} />}
            title={students.length === 0 ? 'No students yet' : 'No matching students'}
            description={
              students.length === 0
                ? 'Add students by their school email to see their goals here.'
                : 'Try adjusting your filters or search.'
            }
            action={
              students.length === 0 ? (
                <button onClick={() => setShowAdd(true)} className="btn-primary">
                  <UserPlus size={16} /> Add student
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate({ name: 'teacher-student', id: s.id })}
              className="card card-hover block p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <Avatar name={s.full_name} size={44} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-ink-900">
                    {s.full_name || 'Unnamed'}
                  </h3>
                  <p className="truncate text-xs text-ink-500">{s.email}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ink-50 py-1.5">
                  <div className="text-base font-bold text-ink-900">{s.totalGoals}</div>
                  <div className="text-[10px] font-medium text-ink-500">Goals</div>
                </div>
                <div className="rounded-lg bg-ink-50 py-1.5">
                  <div className="text-base font-bold text-ink-900">{s.activeGoals}</div>
                  <div className="text-[10px] font-medium text-ink-500">Active</div>
                </div>
                <div className="rounded-lg bg-ink-50 py-1.5">
                  <div className="text-base font-bold text-ink-900">{s.completedGoals}</div>
                  <div className="text-[10px] font-medium text-ink-500">Done</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-ink-500">Avg progress</span>
                  <span className="font-semibold text-brand-700">{s.avgProgress}%</span>
                </div>
                <ProgressBar value={s.avgProgress} tone={s.avgProgress === 100 ? 'success' : 'brand'} />
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Add student to ${cls.name}`}>
        <label className="label">Student email</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
              placeholder="student@school.edu"
              className="input pl-9"
            />
          </div>
          <button onClick={searchStudent} disabled={searching} className="btn-secondary">
            {searching ? <Spinner /> : <Search size={15} />}
            Find
          </button>
        </div>
        {searchResult && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3 animate-slideIn">
            <Avatar name={searchResult.full_name} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-900">
                {searchResult.full_name}
              </div>
              <div className="truncate text-xs text-ink-500">{searchResult.email}</div>
            </div>
            <button onClick={addStudent} disabled={addingStudent} className="btn-primary px-3">
              {addingStudent ? <Spinner className="text-white" /> : <UserPlus size={15} />}
              Add
            </button>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button onClick={() => setShowAdd(false)} className="btn-ghost">
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: 'brand' | 'success' | 'neutral';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success-600 bg-success-50'
      : tone === 'neutral'
      ? 'text-ink-600 bg-ink-100'
      : 'text-brand-600 bg-brand-50';
  return (
    <div className="card card-hover p-4 sm:p-5">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}>
        <Icon size={17} />
      </div>
      <div className="mt-3 text-2xl font-bold text-ink-900 sm:text-3xl">{value}</div>
      <div className="text-xs font-medium text-ink-500 sm:text-sm">{label}</div>
    </div>
  );
}
