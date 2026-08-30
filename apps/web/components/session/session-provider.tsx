'use client';

import { usePathname } from 'next/navigation';
import type { InteractionState, MemberCollection, MemberSummary } from '@ilham/shared-types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type SessionSnapshot = {
  member: MemberSummary | null;
  saved: string[];
  interaction: InteractionState | null;
  collections: MemberCollection[];
  /** Slugs of the topic hubs the member follows. */
  followedTopics?: string[];
};

type SessionContextValue = {
  status: 'loading' | 'ready';
  member: MemberSummary | null;
  saved: Set<string>;
  followedTopics: Set<string>;
  /** Re-fetches the snapshot (called after a mutation completes). */
  refresh: () => Promise<void>;
  /** Fetches interaction state + boards for one content item; cached per key. */
  loadContent: (key: string) => Promise<Pick<SessionSnapshot, 'interaction' | 'collections'>>;
  version: number;
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function fetchSnapshot(content?: string): Promise<SessionSnapshot> {
  const url = content ? `/api/session?content=${encodeURIComponent(content)}` : '/api/session';
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('session unavailable');
  return (await response.json()) as SessionSnapshot;
}

const empty: SessionSnapshot = {
  member: null,
  saved: [],
  interaction: null,
  collections: [],
  followedTopics: [],
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(empty);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [version, setVersion] = useState(0);
  const contentCache = useRef(new Map<string, Promise<SessionSnapshot>>());

  const refresh = useCallback(async () => {
    contentCache.current.clear();
    try {
      setSnapshot(await fetchSnapshot());
    } catch {
      setSnapshot(empty);
    } finally {
      setStatus('ready');
      setVersion((value) => value + 1);
    }
  }, []);

  // Fetch on mount and again after every client-side navigation: sign-in/out redirect through
  // server actions without remounting the provider, so the snapshot must follow the route.
  const pathname = usePathname();
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  const loadContent = useCallback(
    async (key: string) => {
      if (!snapshot.member) return { interaction: null, collections: [] };
      let pending = contentCache.current.get(key);
      if (!pending) {
        pending = fetchSnapshot(key);
        contentCache.current.set(key, pending);
      }
      const result = await pending;
      return { interaction: result.interaction, collections: result.collections };
    },
    [snapshot.member],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      member: snapshot.member,
      followedTopics: new Set(snapshot.followedTopics ?? []),
      saved: new Set(snapshot.saved),
      refresh,
      loadContent,
      version,
    }),
    [status, snapshot, refresh, loadContent, version],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>.');
  return context;
}

/** Interaction state (saved/liked/following/boards) for one content item, for the current member. */
export function useContentInteraction(contentType: string, contentId: string) {
  const session = useSession();
  const [state, setState] = useState<Pick<SessionSnapshot, 'interaction' | 'collections'>>({
    interaction: null,
    collections: [],
  });
  const key = `${contentType}:${contentId}`;
  useEffect(() => {
    if (session.status !== 'ready') return;
    let active = true;
    void session.loadContent(key).then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, [session, key]);
  return { ...state, member: session.member, ready: session.status === 'ready' };
}
