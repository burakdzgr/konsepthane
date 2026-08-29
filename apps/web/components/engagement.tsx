import Link from 'next/link';
import { Suspense } from 'react';
import { Icon } from '@ilham/ui';
import {
  CollectionPickerClient,
  FlashClient,
  LikeToggleClient,
  QuestionFollowToggleClient,
  OwnerGate,
  SaveToggleClient,
  SessionGate,
} from '@/components/engagement-client';
import {
  addToCollectionAction,
  removeFromCollectionAction,
  reportContentAction,
  toggleQuestionFollowAction,
  toggleReactionAction,
  toggleSaveAction,
} from '@/lib/actions';
import { loginHref } from '@/lib/auth';
import { getDictionary, localeFromPath } from '@/lib/i18n';

/**
 * Engagement controls. These server wrappers only resolve labels (dictionary by locale of the
 * return path) and hand the work to client islands that read the visitor's state from
 * `/api/session` — pages never read cookies for them, so they can render statically.
 */
type Target = { contentType: string; contentId: string; returnTo: string };

function HiddenTarget({ contentType, contentId, returnTo }: Target) {
  return (
    <>
      <input type="hidden" name="contentType" value={contentType} />
      <input type="hidden" name="contentId" value={contentId} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );
}

/** Dictionary for the locale embedded in the return path (`/en/...`). */
function dict(returnTo: string) {
  return getDictionary(localeFromPath(returnTo));
}

/** Compact save toggle used on cards. Visitors are routed to login and back. */
export function SaveToggle({
  label,
  compact = false,
  ...target
}: Target & { active?: boolean | undefined; label?: string | undefined; compact?: boolean }) {
  const t = dict(target.returnTo).cards;
  const subject = label ?? t.concept;
  return (
    <SaveToggleClient
      {...target}
      compact={compact}
      action={toggleSaveAction}
      labels={{
        save: t.saveItem(subject),
        unsave: t.unsaveItem(subject),
        savedText: t.saved,
        saveText: t.save,
      }}
    />
  );
}

export function LikeToggle({
  count = 0,
  ...target
}: Target & { active?: boolean | undefined; count?: number }) {
  return <LikeToggleClient {...target} action={toggleReactionAction} count={count} />;
}

export function QuestionFollowToggle({
  questionId,
  returnTo,
}: {
  questionId: string;
  active?: boolean | undefined;
  returnTo: string;
}) {
  const t = dict(returnTo).engagement;
  return (
    <QuestionFollowToggleClient
      action={toggleQuestionFollowAction}
      questionId={questionId}
      returnTo={returnTo}
      labels={{ following: t.following, follow: t.followQuestion }}
    />
  );
}

/** "Koleksiyona kaydet" panel: quick save + pick/create a planning board. */
export function CollectionPicker(target: Target) {
  const t = dict(target.returnTo).engagement;
  return (
    <CollectionPickerClient
      {...target}
      saveAction={toggleSaveAction}
      addAction={addToCollectionAction}
      removeAction={removeFromCollectionAction}
      loginHref={loginHref(target.returnTo)}
      labels={{
        saveToCollection: t.saveToCollection,
        savedLabel: t.savedLabel,
        savedList: t.savedList,
        remove: t.remove,
        save: t.save,
        myBoards: t.myBoards,
        added: t.added,
        removeFromBoard: t.removeFromBoard,
        add: t.add,
        noBoards: t.noBoards,
        newBoardPlaceholder: t.newBoardPlaceholder,
        create: t.create,
      }}
    />
  );
}

export function ReportForm(target: Target & { signedIn?: boolean }) {
  const t = dict(target.returnTo).engagement;
  const login = (
    <Link href={loginHref(target.returnTo)} className="community-action ml-auto">
      <Icon name="flag" size={15} /> {t.report}
    </Link>
  );
  return (
    <SessionGate fallback={login} loading={login}>
      <details className="report-form ml-auto">
        <summary className="community-action">
          <Icon name="flag" size={15} /> {t.report}
        </summary>
        <form action={reportContentAction} className="report-form-panel">
          <HiddenTarget {...target} />
          <label className="grid gap-1 text-xs font-semibold">
            {t.reason}
            <select name="reason" className="field min-h-10">
              {(Object.keys(t.reasons) as Array<keyof typeof t.reasons>).map((key) => (
                <option key={key} value={key}>
                  {t.reasons[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            {t.details}
            <textarea
              name="details"
              maxLength={1000}
              rows={3}
              className="field text-sm font-normal"
            />
          </label>
          <button type="submit" className="btn btn-primary justify-self-start">
            {t.send}
          </button>
        </form>
      </details>
    </SessionGate>
  );
}

/** Flash message from `?mesaj=` / `?hata=`; read on the client so the page stays static. */
export function Flash() {
  return (
    <Suspense fallback={null}>
      <FlashClient />
    </Suspense>
  );
}

/** Server-side gate for member-only fragments (reply forms etc.). */
export { OwnerGate, SessionGate };
