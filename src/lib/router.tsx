import { useEffect, useState } from 'react';

export type Route =
  | { name: 'login' }
  | { name: 'student-dashboard' }
  | { name: 'student-goals' }
  | { name: 'student-create-goal' }
  | { name: 'student-goal'; id: string }
  | { name: 'student-journal'; id: string }
  | { name: 'student-profile' }
  | { name: 'teacher-dashboard' }
  | { name: 'teacher-classes' }
  | { name: 'teacher-class'; id: string }
  | { name: 'teacher-student'; id: string };

export function parsePath(pathname: string): Route {
  const clean = pathname.replace(/\/+$/, '');
  if (clean === '' || clean === '/login') return { name: 'login' };

  const parts = clean.split('/').filter(Boolean);

  if (parts[0] === 'student') {
    if (parts[1] === 'dashboard') return { name: 'student-dashboard' };
    if (parts[1] === 'goals') return { name: 'student-goals' };
    if (parts[1] === 'create-goal') return { name: 'student-create-goal' };
    if (parts[1] === 'goal' && parts[2] && parts[3] === 'journal') return { name: 'student-journal', id: parts[2] };
    if (parts[1] === 'goal' && parts[2]) return { name: 'student-goal', id: parts[2] };
    if (parts[1] === 'profile') return { name: 'student-profile' };
  }

  if (parts[0] === 'teacher') {
    if (parts[1] === 'dashboard') return { name: 'teacher-dashboard' };
    if (parts[1] === 'classes') return { name: 'teacher-classes' };
    if (parts[1] === 'class' && parts[2]) return { name: 'teacher-class', id: parts[2] };
    if (parts[1] === 'student' && parts[2]) return { name: 'teacher-student', id: parts[2] };
  }

  return { name: 'login' };
}

export function routeToPath(route: Route): string {
  switch (route.name) {
    case 'login': return '/login';
    case 'student-dashboard': return '/student/dashboard';
    case 'student-goals': return '/student/goals';
    case 'student-create-goal': return '/student/create-goal';
    case 'student-goal': return `/student/goal/${route.id}`;
    case 'student-journal': return `/student/goal/${route.id}/journal`;
    case 'student-profile': return '/student/profile';
    case 'teacher-dashboard': return '/teacher/dashboard';
    case 'teacher-classes': return '/teacher/classes';
    case 'teacher-class': return `/teacher/class/${route.id}`;
    case 'teacher-student': return `/teacher/student/${route.id}`;
  }
}

export function navigate(route: Route) {
  const path = routeToPath(route);
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}
