export type AppRoute =
  | { kind: 'browse'; path: '/' }
  | { kind: 'drill-catalog'; path: '/drills' }
  | { kind: 'drill-detail'; path: `/drills/${string}`; drillId: string }
  | { kind: 'planner-list'; path: '/plan' }
  | { kind: 'planner-new'; path: '/plan/new' }
  | { kind: 'planner-detail'; path: `/plan/${string}`; sessionId: string }
  | { kind: 'shared-session'; path: `/session/${string}`; shareId: string }
  | { kind: 'editor-drill-new'; path: '/editor/drills/new' }
  | { kind: 'editor-drill-edit'; path: `/editor/drills/${string}/edit`; drillId: string }
  | { kind: 'editor-imports'; path: '/editor/imports' }
  | { kind: 'not-found'; path: string };

export type TopLevelShell = 'browse' | 'drill' | 'planner' | 'share' | 'editor' | 'not-found';

function normalizeHashPath(hash: string | null | undefined): string {
  if (!hash || hash === '#') {
    return '/';
  }

  const rawPath = hash.startsWith('#') ? hash.slice(1) : hash;
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  return normalizedPath === '' ? '/' : normalizedPath;
}

function getPathSegments(path: string): string[] {
  return path
    .split('/')
    .filter(Boolean)
    .map(segment => decodeURIComponent(segment));
}

export function parseHashRoute(hash: string | null | undefined): AppRoute {
  const path = normalizeHashPath(hash);
  const segments = getPathSegments(path);

  if (segments.length === 0) {
    return { kind: 'browse', path: '/' };
  }

  if (segments.length === 1 && segments[0] === 'drills') {
    return { kind: 'drill-catalog', path: '/drills' };
  }

  if (segments.length === 2 && segments[0] === 'drills' && segments[1]) {
    return {
      kind: 'drill-detail',
      path: `/drills/${encodeURIComponent(segments[1])}`,
      drillId: segments[1]
    };
  }

  if (segments.length === 1 && segments[0] === 'plan') {
    return { kind: 'planner-list', path: '/plan' };
  }

  if (segments.length === 2 && segments[0] === 'plan' && segments[1] === 'new') {
    return { kind: 'planner-new', path: '/plan/new' };
  }

  if (segments.length === 2 && segments[0] === 'plan' && segments[1]) {
    return {
      kind: 'planner-detail',
      path: `/plan/${encodeURIComponent(segments[1])}`,
      sessionId: segments[1]
    };
  }

  if (segments.length === 2 && segments[0] === 'session' && segments[1]) {
    return {
      kind: 'shared-session',
      path: `/session/${encodeURIComponent(segments[1])}`,
      shareId: segments[1]
    };
  }

  if (segments.length === 3 && segments[0] === 'editor' && segments[1] === 'drills' && segments[2] === 'new') {
    return { kind: 'editor-drill-new', path: '/editor/drills/new' };
  }

  if (
    segments.length === 4 &&
    segments[0] === 'editor' &&
    segments[1] === 'drills' &&
    segments[2] &&
    segments[3] === 'edit'
  ) {
    return {
      kind: 'editor-drill-edit',
      path: `/editor/drills/${encodeURIComponent(segments[2])}/edit`,
      drillId: segments[2]
    };
  }

  if (segments.length === 2 && segments[0] === 'editor' && segments[1] === 'imports') {
    return { kind: 'editor-imports', path: '/editor/imports' };
  }

  return { kind: 'not-found', path };
}

export function getTopLevelShell(route: AppRoute): TopLevelShell {
  switch (route.kind) {
    case 'browse':
      return 'browse';
    case 'drill-catalog':
    case 'drill-detail':
      return 'drill';
    case 'planner-list':
    case 'planner-new':
    case 'planner-detail':
      return 'planner';
    case 'shared-session':
      return 'share';
    case 'editor-drill-new':
    case 'editor-drill-edit':
    case 'editor-imports':
      return 'editor';
    case 'not-found':
      return 'not-found';
  }
}
