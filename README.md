# sp-website
Website for Synthetic Practitioner

Pre-launch landing page for Synthetic Practitioner, vaerksted's AI general practitioner concept built on the experience of hejdoktor.dk. Includes use cases, the Danish legal limits on what an AI doctor may do, an FAQ and a waitlist signup.

## Structure

Static site with no build step:

- `index.html`: page content
- `styles.css`: styles (light and dark mode, responsive)
- `script.js`: waitlist form validation and submission

Preview locally with `python3 -m http.server` and open http://localhost:8000. Deploy to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## Waitlist backend

The form POSTs JSON (`name`, `email`, `region`, `interests[]`, `consent`, `submittedAt`) to the URL in the form's `data-endpoint` attribute in `index.html`. It is empty for now, so signups only show the success message and are logged to the console. Set it to a Formspree endpoint, serverless function or CRM webhook before launch.

## Legal content

The "Legal limits in Denmark" section summarises the Authorisation Act, Health Act, Medicines Act, EU MDR, EU AI Act, GDPR and the rules on marketing health services. Have it reviewed by legal counsel before publishing.
