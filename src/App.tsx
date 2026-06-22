import { useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { useRoute, navigate } from './lib/router';
import { ToastProvider } from './components/Toast';
import { Shell } from './components/Shell';
import { Spinner, Logo } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentGoalsPage } from './pages/StudentGoalsPage';
import { CreateGoalPage } from './pages/CreateGoalPage';
import { GoalDetailPage } from './pages/GoalDetailPage';
import { GoalJournalPage } from './pages/GoalJournalPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherClassesPage } from './pages/TeacherClassesPage';
import { TeacherClassPage } from './pages/TeacherClassPage';
import { TeacherStudentPage } from './pages/TeacherStudentPage';

function FullScreenSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <Logo size={48} />
        <Spinner className="h-6 w-6" />
      </div>
    </div>
  );
}

function Router() {
  const { session, profile, loading } = useAuth();
  const route = useRoute();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      if (route.name !== 'login') navigate({ name: 'login' });
      return;
    }
    if (!profile) return; // still loading profile — wait
    if (route.name === 'login') {
      navigate(profile.role === 'teacher' ? { name: 'teacher-dashboard' } : { name: 'student-dashboard' });
      return;
    }
    if (profile.role === 'teacher' && route.name.startsWith('student-')) {
      navigate({ name: 'teacher-dashboard' });
    }
    if (profile.role === 'student' && route.name.startsWith('teacher-')) {
      navigate({ name: 'student-dashboard' });
    }
  }, [session, profile, loading, route.name]);

  // Still initialising
  if (loading) return <FullScreenSpinner />;

  // No session — show login
  if (!session) return <LoginPage />;

  // Session exists but profile row not ready yet (trigger latency on first signup)
  if (!profile) return <FullScreenSpinner />;

  const isTeacher = profile.role === 'teacher';
  let content: React.ReactNode;

  switch (route.name) {
    case 'login':
      return <FullScreenSpinner />;
    case 'student-dashboard':
      content = <StudentDashboard />;
      break;
    case 'student-goals':
      content = <StudentGoalsPage />;
      break;
    case 'student-create-goal':
      content = <CreateGoalPage />;
      break;
    case 'student-goal':
      content = <GoalDetailPage goalId={route.id} />;
      break;
    case 'student-journal':
      content = <GoalJournalPage goalId={route.id} />;
      break;
    case 'student-profile':
      content = <StudentProfilePage />;
      break;
    case 'teacher-dashboard':
      content = <TeacherDashboard />;
      break;
    case 'teacher-classes':
      content = <TeacherClassesPage />;
      break;
    case 'teacher-class':
      content = <TeacherClassPage classId={route.id} />;
      break;
    case 'teacher-student':
      content = <TeacherStudentPage studentId={route.id} />;
      break;
    default:
      navigate(isTeacher ? { name: 'teacher-dashboard' } : { name: 'student-dashboard' });
      return <FullScreenSpinner />;
  }

  return <Shell active={route.name}>{content}</Shell>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AuthProvider>
  );
}
