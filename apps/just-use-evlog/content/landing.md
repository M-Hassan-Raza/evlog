---
title: Just fucking use evlog
description: Wide events and structured errors for TypeScript. One log per operation (request, job, or workflow), all the context, zero scavenger hunt.
ogTitle: Just fucking use evlog
ogDescription: Wide events and structured errors for TypeScript. One log per operation, zero scavenger hunt.
ogHeadline: Stop overthinking your logs
---

<p class="vitrine-eyebrow">Stop overthinking your logs</p>

# Just fucking use evlog.

You've been told to "add more logs" until your stdout looks like a twitch chat. You've opened Sentry at 3am and stared at a stack trace with zero context. You've told a junior "correlate by request id" while knowing half your handlers never set one. That isn't observability. It's hope with a JSON formatter.

evlog is built for **wide events**: one structured object per request (or job, or CLI run) that accumulates context as code runs, then **emits once** at the end. No sprawl of ten `INFO` lines that pretend to tell a story. No "mystery meat" errors where the client sees `500` and the server sees `Error: undefined` and nobody sees **why** or **what to do next**.

If that sounds like discipline instead of magic, good. That's the point.

---

## Your logs are a disaster.

Something breaks in prod. You open your log viewer and stare at a wall of events. Hundreds of lines, zero story. You scroll, you filter, you open three tabs trying to reconstruct what happened for *one* request or *one* job run. Half your output is noise ("handler started", "ok", "done"). The other half is missing **user**, **cart**, **flags**, or anything that tells you *what actually broke*.

```log [log-soup.log]
INFO  Starting handler
INFO  user loaded
INFO  db query ok
WARN  slow???
ERROR  Payment failed
ERROR  Error: undefined
INFO  done
```

Seven lines. Zero narrative. You end up in Slack asking "who touched checkout?" while mentally stitching fragments across log entries. **This is the debugging you've normalized.** Fine, but stop pretending scattered `console.log` is "good enough."

---

## One event instead of ten scattered lines.

A wide event is not "bigger JSON." It's a **single artifact** per operation: request, job, workflow step, script run. Everything you need to understand what happened, in one place. No tab-switching, no mental reconstruction.

You accumulate fields as your code runs: auth, cart, experiment flags, downstream latency, records synced, model info. Whatever matters for *this* operation. On success or failure, you emit **once**. The shape is stable. The **level** reflects outcome. Errors carry **why**, **fix**, and optional **link**, so your frontend (and future you at 3am) stop reverse-engineering stack traces.

---

## What the fuck is evlog, technically?

TypeScript-first logger that works everywhere. In **Nuxt, Nitro, Express, Fastify, Hono, Elysia, NestJS, TanStack Start**, framework hooks auto-create and auto-emit the logger at request boundaries. For scripts, jobs, and workflows, you create a logger, accumulate context, emit when done.

::code-group

```ts [Nuxt]
export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  log.set({ cart: { items: 3, total: 9999 } })
  return { ok: true }
})
```

```ts [Express]
app.post('/api/checkout', (req, res) => {
  req.log.set({ cart: { items: 3, total: 9999 } })
  res.json({ ok: true })
})
```

```ts [Hono]
app.post('/api/checkout', (c) => {
  const log = c.get('log')
  log.set({ cart: { items: 3, total: 9999 } })
  return c.json({ ok: true })
})
```

```ts [Standalone]
const log = createLogger({ jobId: job.id, source: 'sync' })
log.set({ recordsSynced: 150, duration: 3200 })
log.emit()
```

::

One operation. One event. Human-readable in dev, structured JSON in prod, whether it's an HTTP request, a cron job, or a multi-step workflow.

---

## Why it's fucking great

### Zero transitive dependencies

No peer deps, no polyfills, no bundler drama. Drains use platform `fetch`. The filesystem drain uses Node's `fs`. Nothing to audit, nothing that breaks on the next Node LTS.

### Emit is automatic (or manual, your call)

In framework mode, hooks call emit at request end. You add context with `log.set()`, the rest is wired. In standalone mode, you call `log.emit()` when the operation is done. Either way: no "remember to flush" surprise.

### Send logs anywhere, out of the box

**Axiom, OTLP** (Grafana, Datadog, Honeycomb…)**, Sentry, PostHog, Better Stack, HyperDX**: six built-in adapters, or two lines of `fetch()` if you roll your own. Sending is async, batched, out-of-band. Your users don't wait on your log pipeline.

### A filesystem drain your agents can read

Write NDJSON to disk locally. Your AI agents, your scripts, and your teammates can query structured context **without a Datadog subscription**. Wide events work for incidents. They also work for evals.

### AI routes stop being a black box

Wrap the model once with `createAILogger`. Token usage, tool calls, streaming metrics, finish reason: all land in the **same** wide event as the HTTP request.

```ts [server/api/chat.post.ts]
const log = useLogger(event)
const ai = createAILogger(log)

const result = streamText({
  model: ai.wrap('anthropic/claude-sonnet-4.6'),
  messages,
})
```

No callback conflicts. No separate pipeline for AI observability.

### Sampling that isn't naive

Head sampling trims volume by level. Tail sampling **keeps** slow, failed, and "we care about this path" traffic. Stop storing noise and still missing the incident.

### Errors that explain themselves

`createError({ why, fix, link })`. Parse with `parseError()` on the client. Your error toast can finally tell users *what went wrong* and *what to do about it*.

---

## "But wait…"

### "I already use pino."

pino is fast at writing lines. evlog emits **once** per operation, async and out-of-band. And zero transitive dependencies means nothing extra to audit. The real question isn't speed: it's whether your logs have **shape** your dashboard can actually query.

### "I already have Sentry / Datadog."

Then they'll get better data. One wide event with user, cart, duration, flags, and error context lands as a **single queryable row**, not twenty noisy INFO lines you mentally reassemble after an alert fires. The Sentry adapter and OTLP adapter are two lines of config.

### "Another dependency?"

One package, zero transitive deps. The alternative is another quarter of guessing. Your call.

### "We'll 'clean up logging' next sprint."

No you won't. Ship the pattern now or keep debugging the hard way forever.

---

## When you should actually use this

- You write TypeScript (APIs, jobs, scripts, workflows) and you're tired of **piecing together what happened from scattered logs**.
- You want **one artifact per operation** with business context and outcome together.
- You want errors your frontend, and agents, can **parse and act on**.
- You need sampling + drains without building a **second product** inside your repo.
- You're instrumenting AI calls and want usage and tool data in the **same** event as the rest of the operation.

## Enough excuses.

evlog isn't magic. It's **accumulate, emit once, drain safely, keep what matters**. Stop cargo-culting a dozen `console.log` calls per handler and calling it "good enough."

::landing-ctas
::
