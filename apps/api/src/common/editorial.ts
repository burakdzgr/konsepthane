import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ContentStatus } from '@ilham/database';
import type { AccessClaims } from './auth.types';
import type { DatabaseService } from './database.module';

/**
 * Editorial workflow rules shared by concepts and guides.
 *
 * - `concept.write` lets an editor create and edit (DRAFT / IN_REVIEW / ARCHIVED).
 * - `concept.publish` is required to set PUBLISHED (editors have it by default; a stricter
 *   newsroom can revoke it from the `editor` role and keep it on administrators).
 * - The public byline (`authorId`) must be an active editor profile; it defaults to the actor.
 *   Admin accounts without an editor profile can still create content, but the byline then
 *   stays empty and the page falls back to the organisation as author — no invented person.
 */
export function assertCanPublish(status: ContentStatus | undefined, actor: AccessClaims) {
  if (status === ContentStatus.PUBLISHED && !actor.permissions.includes('concept.publish'))
    throw new ForbiddenException('Yayınlamak için concept.publish yetkisi gerekir.');
}

export async function resolveEditorialAuthor(
  db: DatabaseService,
  requested: string | undefined,
  actor: AccessClaims,
): Promise<string | null> {
  const candidate = requested ?? actor.sub;
  const profile = await db.profile.findUnique({
    where: { userId: candidate },
    select: { kind: true, user: { select: { status: true } } },
  });
  if (requested) {
    if (!profile) throw new BadRequestException('Yazar bulunamadı.');
    if (profile.kind !== 'EDITOR' || profile.user.status !== 'ACTIVE')
      throw new BadRequestException('Yazar olarak yalnızca aktif bir editör seçilebilir.');
    return candidate;
  }
  return profile?.kind === 'EDITOR' ? candidate : null;
}
