/**
 * CSP violation sink (`report-uri /api/csp-report`). Reports are logged so `docker compose logs web`
 * shows what a policy change would block; nothing is stored. Browsers post either the legacy
 * `{ "csp-report": {...} }` shape or a Reporting-API array.
 */
export const runtime = 'nodejs';

const MAX_BODY = 16 * 1024;

export async function POST(request: Request) {
  try {
    const text = (await request.text()).slice(0, MAX_BODY);
    const parsed = JSON.parse(text) as
      | { 'csp-report'?: Record<string, unknown> }
      | Array<{ body?: Record<string, unknown> }>;
    const reports = Array.isArray(parsed)
      ? parsed.map((entry) => entry.body ?? entry)
      : [parsed['csp-report'] ?? parsed];
    for (const report of reports) {
      const r = report as Record<string, unknown>;
      console.warn(
        '[csp]',
        JSON.stringify({
          directive: r['effective-directive'] ?? r['violated-directive'] ?? r.effectiveDirective,
          blocked: r['blocked-uri'] ?? r.blockedURL,
          document: r['document-uri'] ?? r.documentURL,
          source: r['source-file'] ?? r.sourceFile,
          line: r['line-number'] ?? r.lineNumber,
          sample: r['script-sample'] ?? r.sample,
        }),
      );
    }
  } catch {
    // Malformed report: ignore silently (never let this endpoint error).
  }
  return new Response(null, { status: 204 });
}
