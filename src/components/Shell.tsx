import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  LayoutDashboard,
  Target,
  PlusCircle,
  User,
  School,
  BookOpen,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { navigate, type Route } from '../lib/router';
import { Logo, Avatar } from './ui';
import { NotificationsBell } from './NotificationsBell';

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  route: Route;
  match: Route['name'][];
};

export function Shell({
  children,
  active,
}: {
  children: ReactNode;
  active: Route['name'];
}) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isTeacher = profile?.role === 'teacher';

  const navItems: NavItem[] = isTeacher
    ? [
        {
          label: 'Dashboard',
          icon: LayoutDashboard,
          route: { name: 'teacher-dashboard' },
          match: ['teacher-dashboard'],
        },
        {
          label: 'Classes',
          icon: School,
          route: { name: 'teacher-classes' },
          match: ['teacher-classes', 'teacher-class', 'teacher-student'],
        },
      ]
    : [
        {
          label: 'Dashboard',
          icon: LayoutDashboard,
          route: { name: 'student-dashboard' },
          match: ['student-dashboard'],
        },
        {
          label: 'My Goals',
          icon: Target,
          route: { name: 'student-goals' },
          match: ['student-goals', 'student-goal'],
        },
        {
          label: 'New Goal',
          icon: PlusCircle,
          route: { name: 'student-create-goal' },
          match: ['student-create-goal'],
        },
        {
          label: 'Journal',
          icon: BookOpen,
          route: { name: 'student-goals' },
          match: ['student-journal'],
        },
        {
          label: 'Profile',
          icon: User,
          route: { name: 'student-profile' },
          match: ['student-profile'],
        },
      ];

  function go(route: Route) {
    setMobileOpen(false);
    navigate(route);
  }

  function handleSignOut() {
    signOut();
    navigate({ name: 'login' });
  }

  const roleLabel = isTeacher ? 'Teacher' : 'Student';

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-100 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button
              className="flex items-center gap-2.5"
              onClick={() =>
                go(isTeacher ? { name: 'teacher-dashboard' } : { name: 'student-dashboard' })
              }
            >
              <Logo size={36} />
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-[15px] font-bold text-ink-900">SMART Goals</div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
                  Bally Boys
                </div>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <div className="hidden items-center gap-2.5 pl-2 sm:flex">
              <Avatar name={profile?.full_name || 'U'} size={34} />
              <div className="text-left leading-tight">
                <div className="text-sm font-semibold text-ink-900 max-w-[160px] truncate">
                  {profile?.full_name || 'User'}
                </div>
                <div className="text-[11px] font-medium text-ink-400">{roleLabel}</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="grid h-10 w-10 place-items-center rounded-xl text-ink-500 hover:bg-error-50 hover:text-error-600 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 flex-shrink-0 border-r border-ink-100 bg-white/60 px-3 py-5 lg:block">
          <NavList items={navItems} active={active} onGo={go} isTeacher={isTeacher} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white px-3 py-5 shadow-pop animate-slideIn">
              <div className="mb-5 flex items-center gap-2.5 px-2">
                <Logo size={32} />
                <div className="leading-tight">
                  <div className="text-sm font-bold text-ink-900">SMART Goals</div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
                    Bally Boys
                  </div>
                </div>
              </div>
              <NavList items={navItems} active={active} onGo={go} isTeacher={isTeacher} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-5xl animate-fadeIn">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavList({
  items,
  active,
  onGo,
  isTeacher,
}: {
  items: NavItem[];
  active: Route['name'];
  onGo: (r: Route) => void;
  isTeacher: boolean;
}) {
  return (
    <nav className="flex flex-col gap-1">
      <div className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {isTeacher ? 'Teacher' : 'Student'}
      </div>
      {items.map((item) => {
        const isActive = item.match.includes(active);
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={() => onGo(item.route)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-brand-50 text-brand-700 shadow-sm'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
            }`}
          >
            <Icon
              size={18}
              className={isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'}
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
