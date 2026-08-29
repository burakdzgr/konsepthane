/**
 * Public identity facts used by trust pages and the `Organization` entity. Everything here is
 * environment-driven so the same build serves staging and production; empty values are simply
 * omitted from the page and the structured data (never invented).
 */
export const siteIdentity = {
  /** No registered trade name is published; the site itself is the publisher identity. */
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? 'konsepthane.net',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info@konsepthane.net',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? 'info@konsepthane.net',
  /** Optional; empty = no postal address is published anywhere. */
  city: process.env.NEXT_PUBLIC_CITY ?? '',
  country: 'TR',
  foundingYear: '2026',
  /** Social profiles feed `Organization.sameAs`; only filled entries are emitted. */
  sameAs: [
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    process.env.NEXT_PUBLIC_SOCIAL_PINTEREST,
    process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
    process.env.NEXT_PUBLIC_SOCIAL_X,
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
  ].filter((value): value is string => Boolean(value)),
};
