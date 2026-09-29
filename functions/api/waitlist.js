// POST /api/waitlist — store a waitlist signup in D1 (binding: DB).
//
// Signing up again with the same email updates the existing row (fields left
// empty keep their earlier value) instead of failing, and the response never
// reveals whether an email was already on the list.

// Bump this whenever the consent text in index.html / i18n.js changes, so we
// can tell which wording each person agreed to.
const CONSENT_VERSION = '2026-09-29';

const MAX_BODY_BYTES = 4096;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGIONS = new Set(['hovedstaden', 'sjaelland', 'syddanmark', 'midtjylland', 'nordjylland', 'outside-dk']);
const HOUSEHOLDS = new Set(['me', 'young-children', 'children', 'family']);
const INTERESTS = new Set(['chat', 'voice', 'video', 'photos', 'children', 'chronic']);
const LANGS = new Set(['en', 'da']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function pick(value, allowed) {
  return typeof value === 'string' && allowed.has(value) ? value : null;
}

export async function onRequestPost({ request, env }) {
  // Only accept submissions from our own pages.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: 'too_large' }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ ok: false, error: 'invalid_json' }, 400);

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if (body.company) return json({ ok: true });

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400);
  }
  if (body.consent !== true) return json({ ok: false, error: 'consent_required' }, 400);

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) || null : null;
  const interests = Array.isArray(body.interests)
    ? [...new Set(body.interests.filter((i) => typeof i === 'string' && INTERESTS.has(i)))]
    : [];

  if (!env.DB) {
    console.error('waitlist: D1 binding "DB" is not configured');
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO waitlist (email, name, region, household, interests, lang, consent_version, consent_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?8)
       ON CONFLICT(email) DO UPDATE SET
         name = COALESCE(excluded.name, waitlist.name),
         region = COALESCE(excluded.region, waitlist.region),
         household = COALESCE(excluded.household, waitlist.household),
         interests = CASE WHEN excluded.interests = '[]' THEN waitlist.interests ELSE excluded.interests END,
         lang = excluded.lang,
         consent_version = excluded.consent_version,
         consent_at = excluded.consent_at,
         updated_at = excluded.updated_at`
    )
      .bind(
        email,
        name,
        pick(body.region, REGIONS),
        pick(body.household, HOUSEHOLDS),
        JSON.stringify(interests),
        pick(body.lang, LANGS) || 'en',
        CONSENT_VERSION,
        now
      )
      .run();
  } catch (err) {
    console.error('waitlist: insert failed', err);
    return json({ ok: false, error: 'server_error' }, 500);
  }

  return json({ ok: true });
}

export function onRequest() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
