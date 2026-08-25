# Headless Client API

This is a minimal integration guide for a third-party client talking to Clawix
over HTTP + WebSocket, without using the bundled web dashboard. It requires a
user account with `role: client` (`UserRole.client` in `schema.prisma`) —
other roles can open the chat socket but will get `403 Forbidden` on the
download endpoint below.

A client account gets no dashboard UI and no database/backend access of any
kind — everything below is the same public HTTP/WebSocket surface any
external caller uses, scoped by JWT to that one user's own rows.

## 0. Provision a client account

In the admin dashboard: **Settings → Users → API Clients tab → Add Client**.
This is the only supported way to create a `role: client` account — it
creates the user, its policy, and its required agent binding in one step
(the generic Users tab's Create User dialog intentionally does not offer the
Client role, since it can't enforce that agent binding). That's the only
admin-side step — from here on, everything happens over the API below.

A ready-to-run reference implementation of steps 1–4 lives in
[`examples/client-demo.html`](./examples/client-demo.html): a single
dependency-free HTML file (login form, chat panel, run history/download) you
can hand to a third party as a starting point for their own client, or open
directly in a browser against your own deployment.

## 1. Log in

```
POST /auth/login
Content-Type: application/json

{ "email": "client@example.com", "password": "…", "professionalDomain": "finance" }
```

`professionalDomain` is optional and only takes effect the first time a user
without a domain logs in. Response:

```json
{ "accessToken": "<jwt>", "refreshToken": "<opaque token>" }
```

- `accessToken` is a JWT, valid for **15 minutes** — use it as a bearer token
  and as the WebSocket `token` query param below.
- `refreshToken` is also set as an httpOnly `clawix_refresh` cookie; for a
  non-browser client, keep the value from the response body and send it to
  `POST /auth/refresh` to mint a new pair before the access token expires.

## 2. Open the chat socket

```
wss://<host>/ws/chat?token=<accessToken>
```

The server verifies the JWT, re-checks the user is still active in the DB,
then sends:

```json
{ "type": "connection.ack", "payload": { "userId": "…" } }
```

Send a message:

```json
{ "type": "message.send", "payload": { "content": "…", "agentDefinitionId": "<optional cuid>" } }
```

`agentDefinitionId` is optional — omit it to use the user's default/bound
primary agent. `content` is 1–10,000 characters; anything else is dropped
silently by the server-side schema (`web.protocol.ts`).

## 3. Receive the response

```json
{
  "type": "message.create",
  "payload": {
    "messageId": "…",
    "sessionId": "…",
    "content": "…",
    "timestamp": "2026-07-29T…Z"
  }
}
```

Other frame types you may see: `typing.start` / `typing.stop` while the agent
is working, `pong` (reply to a client `ping`), and `error` (`{code, message}`)
on failures. The socket closes with code `4001` on missing/invalid/expired
token or a deactivated user, `4002` if the per-user connection limit is hit,
`4003` if the service isn't ready yet.

An agent run is created per `message.send`; its `id` isn't in the
`message.create` frame, so fetch it via `GET /api/v1/client/runs` (newest
first) to get the `id` for step 4.

## 4. Download the run output

```
GET /api/v1/client/runs/:id/download
Authorization: Bearer <accessToken>
```

Returns the run's output as `text/markdown`, `Content-Disposition: attachment`,
named `<agent-name>-<yyyy-mm-dd>-<last6ofid>.md`. `404` if the run doesn't
belong to the authenticated user, or if it hasn't produced output yet.
