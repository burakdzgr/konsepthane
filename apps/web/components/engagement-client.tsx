'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition, type ReactNode } from 'react';
import { Icon } from '@ilham/ui';
import { useContentInteraction, useSession } from '@/components/session/session-provider';

type Target = { contentType: string; contentId: string; returnTo: string };
type FormAction = (formData: FormData) => Promise<void>;

function HiddenTarget({ contentType, contentId, returnTo }: Target) {
  return (
    <>
      <input type="hidden" name="contentType" value={contentType} />
      <input type="hidden" name="contentId" value={contentId} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );
}

/** Runs a server action from a client form and refreshes the session snapshot afterwards. */
function useSessionAction(action: FormAction) {
  const session = useSession();
  const [pending, start] = useTransition();
  const run = (formData: FormData) =>
    start(async () => {
      try {
        await action(formData);
      } finally {
        await session.refresh();
      }
    });
  return { run, pending };
}

export function SaveToggleClient({
  action,
  labels,
  compact = false,
  ...target
}: Target & {
  action: FormAction;
  labels: { save: string; unsave: string; savedText: string; saveText: string };
  compact?: boolean;
}) {
  const session = useSession();
  const saved = session.saved.has(`${target.contentType}:${target.contentId}`);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const { run } = useSessionAction(action);
  const active = session.status === 'ready' ? optimistic : false;
  return (
    <form
      action={(formData) => {
        setOptimistic(!optimistic);
        run(formData);
      }}
      className="contents"
    >
      <HiddenTarget {...target} />
      <button
        type="submit"
        aria-pressed={active}
        aria-label={active ? labels.unsave : labels.save}
        className={
          compact
            ? `save-toggle ${active ? 'is-active' : ''}`
            : `community-action ${active ? 'is-active' : ''}`
        }
      >
        <Icon name={active ? 'bookmark-filled' : 'bookmark'} size={compact ? 18 : 17} />
        {!compact && <span>{active ? labels.savedText : labels.saveText}</span>}
      </button>
    </form>
  );
}

export function LikeToggleClient({
  action,
  count = 0,
  ...target
}: Target & { action: FormAction; count?: number }) {
  const { interaction, member } = useContentInteraction(target.contentType, target.contentId);
  const [optimistic, setOptimistic] = useOptimistic(interaction?.liked ?? false);
  const { run } = useSessionAction(action);
  if (!member) return null;
  const total = Math.max(
    0,
    count +
      (optimistic && !interaction?.liked ? 1 : 0) -
      (!optimistic && interaction?.liked ? 1 : 0),
  );
  return (
    <form
      action={(formData) => {
        setOptimistic(!optimistic);
        run(formData);
      }}
      className="contents"
    >
      <HiddenTarget {...target} />
      <button
        type="submit"
        aria-pressed={optimistic}
        className={`community-action ${optimistic ? 'is-active' : ''}`}
      >
        <Icon name={optimistic ? 'heart-filled' : 'heart'} size={17} /> <span>{total}</span>
      </button>
    </form>
  );
}

export function QuestionFollowToggleClient({
  action,
  questionId,
  returnTo,
  labels,
}: {
  action: FormAction;
  questionId: string;
  returnTo: string;
  labels: { following: string; follow: string };
}) {
  const { interaction, member } = useContentInteraction('QUESTION', questionId);
  const [optimistic, setOptimistic] = useOptimistic(interaction?.following ?? false);
  const { run } = useSessionAction(action);
  if (!member) return null;
  return (
    <form
      action={(formData) => {
        setOptimistic(!optimistic);
        run(formData);
      }}
      className="contents"
    >
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        aria-pressed={optimistic}
        className={`btn ${optimistic ? 'btn-soft' : 'btn-ghost'}`}
      >
        <Icon name={optimistic ? 'check' : 'bell'} size={16} />
        {optimistic ? labels.following : labels.follow}
      </button>
    </form>
  );
}

export function CollectionPickerClient({
  saveAction,
  addAction,
  removeAction,
  loginHref,
  labels,
  ...target
}: Target & {
  saveAction: FormAction;
  addAction: FormAction;
  removeAction: FormAction;
  loginHref: string;
  labels: {
    saveToCollection: string;
    savedLabel: string;
    savedList: string;
    remove: string;
    save: string;
    myBoards: string;
    added: string;
    removeFromBoard: string;
    add: string;
    noBoards: string;
    newBoardPlaceholder: string;
    create: string;
  };
}) {
  const { interaction, collections, member, ready } = useContentInteraction(
    target.contentType,
    target.contentId,
  );
  const save = useSessionAction(saveAction);
  const add = useSessionAction(addAction);
  const remove = useSessionAction(removeAction);
  if (!ready || !member) {
    return (
      <Link href={loginHref} className="btn btn-primary">
        <Icon name="bookmark" size={16} /> {labels.saveToCollection}
      </Link>
    );
  }
  const saved = interaction?.saved ?? false;
  return (
    <details className="collection-picker">
      <summary className={`btn ${saved ? 'btn-soft' : 'btn-primary'}`}>
        <Icon name={saved ? 'bookmark-filled' : 'bookmark'} size={16} />
        {saved ? labels.savedLabel : labels.saveToCollection}
        <Icon name="chevron-down" size={14} />
      </summary>
      <div className="collection-picker-panel">
        <form action={save.run} className="flex items-center justify-between gap-3">
          <HiddenTarget {...target} />
          <span className="text-sm font-semibold">{labels.savedList}</span>
          <button type="submit" className="community-action is-active" disabled={save.pending}>
            {saved ? labels.remove : labels.save}
          </button>
        </form>
        <p className="section-eyebrow mt-4">{labels.myBoards}</p>
        {collections.length ? (
          <ul className="mt-2 space-y-1">
            {collections.map((collection) => {
              const added = interaction?.collectionIds.includes(collection.id);
              return (
                <li key={collection.id}>
                  <form
                    action={added ? remove.run : add.run}
                    className="flex items-center justify-between gap-3"
                  >
                    <HiddenTarget {...target} />
                    <input type="hidden" name="collectionId" value={collection.id} />
                    <span className="flex min-w-0 items-center gap-1.5 text-sm">
                      {added ? <Icon name="check" size={14} /> : null}
                      <span className="truncate">{collection.title}</span>
                    </span>
                    <button
                      type="submit"
                      disabled={added ? remove.pending : add.pending}
                      className={`community-action ${added ? 'is-remove' : ''} disabled:opacity-60`}
                      title={added ? labels.removeFromBoard : labels.add}
                    >
                      {added ? (
                        <>
                          <Icon name="x" size={14} /> {labels.removeFromBoard}
                        </>
                      ) : (
                        <>
                          <Icon name="plus" size={14} /> {labels.add}
                        </>
                      )}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">{labels.noBoards}</p>
        )}
        <form action={add.run} className="mt-3 flex gap-2">
          <HiddenTarget {...target} />
          <input
            name="newTitle"
            placeholder={labels.newBoardPlaceholder}
            className="field min-h-10 min-w-0 flex-1 rounded-full text-sm"
          />
          <button type="submit" className="community-action is-active" disabled={add.pending}>
            {labels.create}
          </button>
        </form>
      </div>
    </details>
  );
}

/** Renders `children` for signed-in members and `fallback` (or nothing) for visitors. */
export function SessionGate({
  children,
  fallback = null,
  loading = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}) {
  const session = useSession();
  if (session.status !== 'ready') return <>{loading}</>;
  return <>{session.member ? children : fallback}</>;
}

/** `?mesaj=` / `?hata=` flash read on the client so pages can stay static. */
// Pages may mount <Flash /> more than once (header + form); only the first mounted instance
// renders the fixed toast so the message never stacks.
const flashInstances = new Set<number>();
const flashListeners = new Set<() => void>();
let flashSeq = 0;
function usePrimaryFlash() {
  const [id] = useState(() => ++flashSeq);
  const [primary, setPrimary] = useState(false);
  useEffect(() => {
    flashInstances.add(id);
    const update = () => setPrimary(Math.min(...flashInstances) === id);
    flashListeners.add(update);
    flashListeners.forEach((listener) => listener());
    return () => {
      flashInstances.delete(id);
      flashListeners.delete(update);
      flashListeners.forEach((listener) => listener());
    };
  }, [id]);
  return primary;
}

export function FlashClient() {
  const primary = usePrimaryFlash();
  const params = useSearchParams();
  const hata = params.get('hata');
  const mesaj = params.get('mesaj');
  const message = hata ?? mesaj;
  const [visible, setVisible] = useState(Boolean(message));
  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const timer = window.setTimeout(() => setVisible(false), hata ? 8000 : 4500);
    return () => window.clearTimeout(timer);
  }, [message, hata]);
  // Once shown, drop the query params so a refresh/back does not replay the toast.
  useEffect(() => {
    if (!message) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('mesaj') && !url.searchParams.has('hata')) return;
    url.searchParams.delete('mesaj');
    url.searchParams.delete('hata');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [message]);
  if (!primary || !message || !visible) return null;
  return (
    <div className="toast-region" aria-live="polite">
      <div role={hata ? 'alert' : 'status'} className={`toast ${hata ? 'toast-error' : 'toast-success'}`}>
        <Icon name={hata ? 'x' : 'check'} size={16} />
        <span className="toast-text">{message}</span>
        <button type="button" className="toast-close" aria-label="Kapat" onClick={() => setVisible(false)}>
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}

/** Renders `children` only for the member whose profile username matches (e.g. question owner). */
export function OwnerGate({
  username,
  children,
}: {
  username: string | null | undefined;
  children: ReactNode;
}) {
  const session = useSession();
  const mine = Boolean(username && session.member?.profile?.username === username);
  return mine ? <>{children}</> : null;
}
