// Worker entry point. Static files in ./public are served by Workers static
// assets before this code runs; only requests that match no file reach it.
import { handleWaitlist, json } from './waitlist.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/waitlist') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
      return handleWaitlist(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
