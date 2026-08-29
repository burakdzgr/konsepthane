# Security and privacy baseline

Passwords use bcrypt with cost 12; newly created or changed passwords require 12–128 characters.
The API issues a short-lived access token and a random refresh token whose hash and session metadata
are stored server-side. Browser applications keep both in isolated admin/member `HttpOnly`, `Secure`
(production), `SameSite=Strict` cookies; tokens are not stored in localStorage. Refresh rotation
revokes the previous session record. Concurrent refresh reuse revokes every active refresh session
for that user. Explicit logout revokes the server-side refresh record before deleting browser
cookies.

NestJS validation strips unknown input. A permission guard centralizes authorization and reloads the
active account's current permissions from PostgreSQL on every authenticated request, so suspension
or role removal takes effect immediately instead of waiting for JWT expiry. Helmet, explicit CORS
origins, request IDs, body limits and a global throttler protect the edge; login is limited to five
attempts per minute per throttler key. State-changing cookie-authenticated browser requests require
same-origin checks and a CSRF token when cross-origin deployment is introduced. Prisma
parameterization is the SQL injection boundary; React escaping plus a future sanitized rich-text
pipeline is the XSS boundary.

Uploads use presigned, short-lived object-store operations. The API validates declared type, size and
ownership before creating a pending asset; a worker verifies magic bytes and metadata before marking
it ready. Originals and derivatives use non-guessable keys. No container filesystem is durable media.

Authenticated mutations write an audit intent before the domain operation proceeds. Audit metadata
contains actor, method, route, entity and request ID but deliberately excludes request bodies,
secrets and raw tokens. Administrators with `audit.read` inspect the trail in the panel. Logs redact
authorization, cookies, passwords, phone/email where unnecessary and signed object URLs. Dependency
and container scanning belongs in CI.

The admin application sends a per-request nonce Content Security Policy, denies framing, disables
browser capabilities it does not use, sends `no-store`, and uses strict referrer and MIME-sniffing
policies. Destructive UI operations require an explicit confirmation; moderation actions that reduce
visibility require a written reason where the workflow supports reasons. API authorization remains
the security boundary—the UI only hides unavailable navigation for clarity.

KVKK/GDPR work is a real workflow: versioned consent evidence, export jobs, deletion requests,
retention schedules and legal-hold exceptions. Account deletion anonymizes content that must remain
for community integrity and removes data without a lawful retention basis. The product must complete
a legal data inventory before claiming compliance.

MFA/WebAuthn is not implemented yet and must be completed before calling the panel suitable for a
high-risk public production environment. Until then, production access should additionally be
restricted at the reverse proxy or identity-aware access layer.
