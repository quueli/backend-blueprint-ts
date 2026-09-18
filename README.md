# backend-blueprint-ts

![ci](https://github.com/quueli/backend-blueprint-ts/actions/workflows/ci.yml/badge.svg)

the backend half of a template i used for spinning up small marketing sites with an admin panel: contact form -> lead pipeline -> admin list with live updates, plus auth, a few cms blocks and outbound integrations (email, telegram ping, crm webhook, an imap poller that attaches replies to leads).

next.js + prisma + zod + next-auth. published as typescript source, build it yourself.

worth reading:

- src/leads/pipeline.ts, rate limit -> captcha -> honeypot -> validate -> insert -> notify. the notify jobs are fire and forget so a dead smtp server never blocks the response
- src/leads/policy.ts, the active pool and the archive are bounded, overflow pushes the oldest out, except won/contract deals which never get auto-deleted
- src/leads/events.ts, in-process event bus feeding sse to the admin page. single instance only, swap in redis pubsub if you ever scale out

## dev

    npm i
    npm test            # node:test via tsx with a fake prisma, no db needed

templates/ holds the app routes and admin components that go into a next project using this package.
