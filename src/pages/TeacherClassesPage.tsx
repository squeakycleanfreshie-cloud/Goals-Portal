import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';
import type { ClassRow, Goal, Profile } from '../lib/types';
import { Avatar, EmptyState, ProgressBar, Spinner } from '../components/ui';
import { Modal } from '../components/Modal';
import {
  School,
  Plus,
  ArrowRight,
  Trash2,
  Edit3,
  UserPlus,
  Search,
} from 'lucide-react';

type ClassWithStats = ClassRow & {
  studentCount: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
};

export function TeacherClassesPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [classes, setClasses] = useState<ClassWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // edit modal
  const [editClass, setEditClass] = useState<ClassWithStats | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // add student modal
  const [addStudentClass, setAddStudentClass] = useState<ClassWithStats | null>(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

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
    const studentsResp = await supabase
      .from('profiles')
      .select('*')
      .in('class_id', classIds);
    const studentsList = (studentsResp.data as Profile[]) || [];
    const studentIds = studentsList.map((s) => s.id);
    const goalsResp =
      studentIds.length > 0
        ? await supabase.from('goals').select('*').in('student_id', studentIds)
        : { data: [] as Goal[] | null, error: null };
    const goalsList = (goalsResp.data as Goal[]) || [];

    const enriched: ClassWithStats[] = clsList.map((c) => {
      const classStudents = studentsList.filter((s) => s.class_id === c.id);
      const studentIdSet = new Set(classStudents.map((s) => s.id));
      const classGoals = goalsList.filter((g) => studentIdSet.has(g.student_id));
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
    const { error } = await supabase.from('classes').insert({
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

  function openEdit(c: ClassWithStats) {
    setEditClass(c);
    setEditName(c.name);
  }

  async function saveEdit() {
    if (!editClass) return;
    if (editName.trim().length < 2) {
      toast.push('error', 'Please enter a class name.');
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from('classes')
      .update({ name: editName.trim() })
      .eq('id', editClass.id);
    setSavingEdit(false);
    if (error) {
      toast.push('error', 'Could not update class');
      return;
    }
    setEditClass(null);
    toast.push('success', 'Class updated');
    load();
  }

  async function deleteClass(c: ClassWithStats) {
    if (!confirm(`Delete "${c.name}"? Students will be unenrolled. This cannot be undone.`)) return;
    const { error } = await supabase.from('classes').delete().eq('id', c.id);
    if (error) {
      toast.push('error', 'Could not delete class');
      return;
    }
    toast.push('success', 'Class deleted');
    load();
  }

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
    setSearchResult(data as Profile);
  }

  async function addStudent() {
    if (!addStudentClass || !searchResult) return;
    setAddingStudent(true);
    const { error } = await supabase
      .from('profiles')
      .update({ class_id: addStudentClass.id })
      .eq('id', searchResult.id);
    setAddingStudent(false);
    if (error) {
      toast.push('error', 'Could not add student');
      return;
    }
    toast.push('success', `${searchResult.full_name} added to ${addStudentClass.name}`);
    setAddStudentClass(null);
    setSearchResult(null);
    setStudentEmail('');
    load();
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Classes</h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage your classes and enrol students.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary self-start">
          <Plus size={17} /> New class
        </button>
      </header>

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
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => navigate({ name: 'teacher-class', id: c.id })}
                  className="min-w-0 flex-1 text-left"
                >
                  <h3 className="truncate font-semibold text-ink-900 hover:text-brand-700">
                    {c.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {c.studentCount} {c.studentCount === 1 ? 'student' : 'students'}
                  </p>
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    aria-label="Rename class"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => deleteClass(c)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-error-50 hover:text-error-600"
                    aria-label="Delete class"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ink-50 py-2">
                  <div className="text-lg font-bold text-ink-900">{c.activeGoals}</div>
                  <div className="text-[11px] font-medium text-ink-500">Active</div>
                </div>
                <div className="rounded-lg bg-ink-50 py-2">
                  <div className="text-lg font-bold text-ink-900">{c.completedGoals}</div>
                  <div className="text-[11px] font-medium text-ink-500">Done</div>
                </div>
                <div className="rounded-lg bg-ink-50 py-2">
                  <div className="text-lg font-bold text-ink-900">
                    {c.activeGoals + c.completedGoals}
                  </div>
                  <div className="text-[11px] font-medium text-ink-500">Total</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-ink-500">Avg progress</span>
                  <span className="font-semibold text-brand-700">{c.avgProgress}%</span>
                </div>
                <ProgressBar value={c.avgProgress} tone={c.avgProgress === 100 ? 'success' : 'brand'} />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate({ name: 'teacher-class', id: c.id })}
                  className="btn-secondary flex-1"
                >
                  View class <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => {
                    setAddStudentClass(c);
                    setSearchResult(null);
                    setStudentEmail('');
                  }}
                  className="btn-ghost px-3"
                  aria-label="Add student"
                  title="Add student"
                >
                  <UserPlus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create a class">
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
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editClass} onClose={() => setEditClass(null)} title="Rename class">
        <label className="label">Class name</label>
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
          className="input"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setEditClass(null)} className="btn-ghost">
            Cancel
          </button>
          <button onClick={saveEdit} disabled={savingEdit} className="btn-primary">
            {savingEdit ? <Spinner className="text-white" /> : <Edit3 size={15} />}
            Save
          </button>
        </div>
      </Modal>

      {/* Add student modal */}
      <Modal
        open={!!addStudentClass}
        onClose={() => setAddStudentClass(null)}
        title={`Add student to ${addStudentClass?.name || ''}`}
      >
        <label className="label">Student email</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
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
              <div className="truncate text-xs text-ink-500">
                {searchResult.email}
              </div>
            </div>
            <button
              onClick={addStudent}
              disabled={addingStudent}
              className="btn-primary px-3"
            >
              {addingStudent ? <Spinner className="text-white" /> : <Plus size={15} />}
              Add
            </button>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={() => setAddStudentClass(null)} className="btn-ghost">
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
