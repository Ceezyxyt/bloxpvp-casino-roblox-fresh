---
name: Discord audit delivery
description: Reliability boundary for outbound Discord audit logging
---

Outbound Discord audit notifications are observability only. They should be sent after the relevant database transaction succeeds, and delivery failures must be logged without changing the already-completed user action.

**Why:** Discord availability and webhook configuration are external to BloxSurge; coupling them to game settlement or inventory mutation would turn a logging outage into a user-facing transaction failure.

**How to apply:** Keep webhook URLs in Replit Secrets, route each event type to its dedicated channel, and use fire-and-forget delivery after commit with bounded/sanitized embed fields.