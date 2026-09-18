# backend-blueprint-ts

![ci](https://github.com/quueli/backend-blueprint-ts/actions/workflows/ci.yml/badge.svg)

the backend half of a template i used for spinning up small marketing sites with an admin panel: contact form -> lead pipeline -> admin list with live updates, plus auth, a few cms blocks and outbound integrations (email, telegram ping, crm webhook, an imap poller that attaches replies to leads).

    npm i
    npm test            # node:test via tsx with a fake prisma, no db needed
