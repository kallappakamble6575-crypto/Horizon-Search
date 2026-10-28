# Horizon Search

A focused search interface backed by Brave Search. Horizon does not crawl or
independently index the web.

## Run locally

- Install Node.js 22.9 or newer.
- Run `npm start` in this folder.
- Open <http://localhost:3000>.

The homepage and server run without an API key. Live searches need
`BRAVE_SEARCH_API_KEY` set in the server environment. To use a local `.env`,
copy `.env.example` to `.env`, add the key there, and restart the server. `.env`
is ignored by Git. Never put the key in browser code or send it in chat.

Submitting a search leaves the home page intact and opens a separate results
page. Brave search requests are made only after the user submits a query or
selects another Brave-backed results category.

Search results support user-requested pagination: All, Videos, and News use
Brave's ten-page offset range; Images uses Brave's documented 200-result count
limit, shown as 20 pages of 10. Results include Brave-backed All, Images,
Videos, and News categories. Maps and Shopping are explicit links to Google
Maps and Google Shopping; the search is sent to Google only if the user follows
the link. The homepage footer links to the
[Terms & Conditions](./public/terms.html) and [Privacy Notice](./public/privacy.html).
Both are working drafts. The owner supplied operator/contact details,
India/Maharashtra jurisdiction, and a personal non-commercial use policy.
Hosting-provider practices and applicable legal requirements still need
confirmation and legal review before public launch.

## Security boundary

The local server binds to `127.0.0.1` and accepts search requests only with
JSON content, a matching same-origin `Origin`, and no cross-site Fetch Metadata
signal. If a trusted reverse proxy serves the app at another origin, set
`HORIZON_ALLOWED_ORIGIN` to that exact origin. Keep the Node server bound to
loopback behind that proxy.

These checks mitigate browser-based cross-site request forgery; they are not
user authentication. Do not expose this anonymous, billable search endpoint
publicly without deployment-level authentication or abuse controls, global
quotas, and provider budget alerts. The in-memory per-client rate limit is not
a substitute for those controls.

## Checks

Run `npm test` for provider and server tests. Tests use mocked provider
responses and do not call Brave.

## Current milestone

See [PROJECT-STATUS.md](./PROJECT-STATUS.md) for what is implemented and what
is waiting on the project owner.
