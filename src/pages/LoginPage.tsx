import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Logo, Spinner } from '../components/ui';
import { useToast } from '../components/Toast';
import {
  Target,
  Users,
  TrendingUp,
  CheckCircle2,
  GraduationCap,
  Mail,
  Lock,
  ShieldCheck,
} from 'lucide-react';

// Change this to whatever secret your school uses
const TEACHER_CODE = 'BallyTeacher2025';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(error);
        else toast.push('success', 'Welcome back!');
      } else {
        if (fullName.trim().length < 2) {
          setError('Please enter your full name.');
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }
        if (role === 'teacher') {
          if (!teacherCode.trim()) {
            setError('Enter the staff registration code to create a teacher account.');
            setSubmitting(false);
            return;
          }
          if (teacherCode.trim() !== TEACHER_CODE) {
            setError('Incorrect staff registration code. Contact your school administrator.');
            setSubmitting(false);
            return;
          }
        }
        const { error } = await signUp(email.trim(), password, fullName.trim(), role);
        if (error) setError(error);
        else toast.push('success', 'Account created!');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const features = [
    { icon: Target, title: 'Set SMART goals', desc: 'Structured Specific, Measurable, Achievable, Relevant, Time-based.' },
    { icon: TrendingUp, title: 'Track progress', desc: 'Sliders, milestones, journals and reflections show real growth.' },
    { icon: Users, title: 'Teacher support', desc: 'Teachers follow class progress and leave timely feedback.' },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Left — branding */}
      <div className="relative hidden overflow-hidden bg-brand-700 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_-10%_-10%,rgba(255,255,255,0.18),transparent),radial-gradient(700px_500px_at_110%_110%,rgba(255,255,255,0.12),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <div className="leading-tight">
              <div className="text-lg font-bold">SMART Goals</div>
              <div className="text-xs font-medium uppercase tracking-wider text-brand-200">Bally Boys</div>
            </div>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              Where every student sets goals worth chasing.
            </h1>
            <p className="mt-4 text-brand-100">
              A simple portal that helps students turn intentions into measurable progress — and gives teachers a clear view of who needs support.
            </p>
            <div className="mt-9 space-y-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex items-start gap-3.5">
                    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="font-semibold">{f.title}</div>
                      <div className="text-sm text-brand-100">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-brand-100">
            <CheckCircle2 size={16} />
            Trusted by educators to support student growth
          </div>
        </div>
      </div>

      {/* Right — auth form */}
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10 lg:min-h-0">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <Logo size={40} />
            <div className="leading-tight">
              <div className="text-base font-bold text-ink-900">SMART Goals</div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-ink-400">Bally Boys</div>
            </div>
          </div>

          <div className="card p-6 sm:p-8 animate-slideIn">
            <div className="mb-1 flex rounded-xl bg-ink-100 p-1">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    mode === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
                  }`}
                >
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <h2 className="mt-6 text-xl font-bold text-ink-900">
              {mode === 'signin' ? 'Welcome back' : 'Join the portal'}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {mode === 'signin'
                ? 'Sign in with your school email to continue.'
                : 'Create an account to start setting SMART goals.'}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="label">Full name</label>
                  <div className="relative">
                    <GraduationCap size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jordan Smith"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="label">I am a</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['student', 'teacher'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setRole(r); setTeacherCode(''); setError(''); }}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition-all ${
                          role === r
                            ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-sm'
                            : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                        }`}
                      >
                        {r === 'student' ? <GraduationCap size={16} /> : <Users size={16} />}
                        {r}
                      </button>
                    ))}
                  </div>
                  {role === 'teacher' && (
                    <div className="mt-2 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">
                      Teacher accounts require a staff registration code from your school administrator.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                    className="input pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10"
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>
              </div>

              {mode === 'signup' && role === 'teacher' && (
                <div className="animate-slideIn">
                  <label className="label flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-warning-600" />
                    Staff registration code
                  </label>
                  <div className="relative">
                    <ShieldCheck size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="password"
                      value={teacherCode}
                      onChange={(e) => setTeacherCode(e.target.value)}
                      placeholder="Enter code provided by admin"
                      className="input pl-10"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-error-200 bg-error-50 px-3.5 py-2.5 text-sm text-error-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting && <Spinner className="text-white" />}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-ink-400">
            By continuing you agree to use this portal responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
