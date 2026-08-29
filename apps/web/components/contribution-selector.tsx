'use client';

import { useState } from 'react';
import { useSession } from '@/components/session/session-provider';
import { Button, Card, Input, TextArea, TextInput } from '@ilham/ui';
import type { Dictionary } from '@/lib/i18n';

type ContributionKind = 'comment' | 'question' | 'experience';
export type ContributionLabels = Dictionary['pages']['contribution'];

export function ContributionSelector({
  conceptTitle,
  action,
  signedIn: signedInProp,
  loginHref,
  labels: t,
  initialKind = 'comment',
}: {
  conceptTitle: string;
  action: (formData: FormData) => Promise<void>;
  /** Optional override; by default the visitor's session decides. */
  signedIn?: boolean;
  loginHref: string;
  labels: ContributionLabels;
  initialKind?: ContributionKind;
}) {
  const [kind, setKind] = useState<ContributionKind>(initialKind);
  const session = useSession();
  const signedIn = signedInProp ?? Boolean(session.member);
  const kinds: ContributionKind[] = ['comment', 'question', 'experience'];
  return (
    <Card className="border-0 bg-[var(--paper-2)] p-5 shadow-none sm:p-7">
      <p className="section-eyebrow">{t.eyebrow}</p>
      <h3 className="mt-2 text-2xl">{t.title}</h3>
      <div role="tablist" aria-label={t.title} className="mt-5 grid gap-2 sm:grid-cols-3">
        {kinds.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            onClick={() => setKind(value)}
            className={`contribution-choice ${kind === value ? 'is-active' : ''}`}
          >
            <strong>{t.kinds[value][0]}</strong>
            <span>{t.kinds[value][1]}</span>
          </button>
        ))}
      </div>
      {!signedIn ? (
        <div className="surface mt-6 p-5 text-sm leading-6 shadow-none">
          <p>
            {kind === 'comment'
              ? t.loginComment
              : kind === 'question'
                ? t.loginQuestion
                : t.loginExperience}
          </p>
          <a href={loginHref} className="btn btn-primary mt-4">
            {t.loginCta}
          </a>
        </div>
      ) : (
        <form action={action} className="mt-6 grid gap-4">
          <input type="hidden" name="kind" value={kind} />
          {kind !== 'comment' && (
            <TextInput
              key={`${kind}-title`}
              label={kind === 'question' ? t.questionTitle : t.experienceTitle}
              name="title"
              minLength={10}
              maxLength={180}
              required
            />
          )}
          <TextArea
            key={`${kind}-body`}
            label={
              kind === 'comment'
                ? t.bodyComment
                : kind === 'question'
                  ? t.bodyQuestion
                  : t.bodyExperience
            }
            name="body"
            minLength={kind === 'experience' ? 40 : kind === 'question' ? 20 : 2}
            maxLength={kind === 'comment' ? 3000 : kind === 'question' ? 10000 : 15000}
            required
            rows={kind === 'comment' ? 4 : 7}
            hint={
              kind === 'experience'
                ? t.hintExperience
                : kind === 'question'
                  ? t.hintQuestion
                  : undefined
            }
          />
          {(kind === 'question' || kind === 'experience') && (
            <label className="photo-dropzone">
              <strong>{kind === 'experience' ? t.photos : t.photosOptional}</strong>
              <span>{kind === 'experience' ? t.photosRule : t.photosRuleOptional}</span>
              <input
                name="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                required={kind === 'experience'}
              />
            </label>
          )}
          {kind === 'experience' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  {t.city}
                  <Input name="city" maxLength={100} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t.venue}
                  <Input name="venueType" placeholder={t.venuePlaceholder} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t.age}
                  <Input name="ageLabel" placeholder={t.agePlaceholder} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t.guests}
                  <Input name="guestCount" type="number" min={1} max={10000} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t.budget}
                  <Input name="budgetLabel" placeholder={t.budgetPlaceholder} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t.colors}
                  <Input name="colors" placeholder={t.colorsPlaceholder} />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold">
                {t.tip}
                <Input name="tips" maxLength={3000} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  {t.worked}
                  <Input name="whatWorked" maxLength={3000} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t.change}
                  <Input name="whatWouldChange" maxLength={3000} />
                </label>
              </div>
              <label className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm leading-6">
                <input name="rightsConfirmed" type="checkbox" required className="mt-1" />
                <span>{t.rights}</span>
              </label>
            </>
          )}
          <p className="text-xs leading-5 text-[var(--muted)]">
            {t.note.replace('{title}', conceptTitle)}
          </p>
          <Button type="submit">
            {kind === 'comment'
              ? t.submitComment
              : kind === 'question'
                ? t.submitQuestion
                : t.submitExperience}
          </Button>
        </form>
      )}
    </Card>
  );
}
