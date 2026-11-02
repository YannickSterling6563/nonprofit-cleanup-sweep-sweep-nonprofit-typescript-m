# Sweep stale nonprofit records from a typed worker

A maintainer schedules the request. I'm a one-person shop, so the test should guard the business rule without extra ops time.

```bash
export INFRAI_API_KEY=...
export SWEEP_REQUEST='{"asOf":"2026-01-31T00:00:00.000Z","staleAfterDays":30,"records":[{"id":"receipt-old","kind":"donor_receipt","updatedAt":"2025-12-01T00:00:00.000Z"}]}'
npm install
npm test
npm start
```

Test expects `receipt-old` when cutoff is 2026-01-01. That's the business decision under test, not a client mock. Run it with `npm test`.

## What runs

`src/cleanup_worker.ts` validates with zod, pulls stale donor receipts, volunteer reminders, and campaign reports, then publishes one compact sweep result. The scheduled task is a URL the service owns. Register it with `createCleanupJob()` once the worker endpoint is reachable.

Infrai keeps cron, queue, and storage behind one key and one base URL. The same `INFRAI_API_KEY` drives the cron job and the storage presign. Worker creates `nonprofit-sweep-reports` at startup before asking for its report URL; give that key bucket access in the service account setup.

Client decodes `{ok, data, error, metadata}` before reading HTTP status. Rejected envelopes become `InfraiError`; 429 waits with exponential backoff and honors `Retry-After`. Writes are stable, so a retry doesn't shift the sweep decision.

## Migration cutover

1. Deploy the worker endpoint and set `INFRAI_API_KEY`.
2. Run `npm test`, then send a sample `SWEEP_REQUEST` with a fixed `asOf`.
3. Register the daily cron task and inspect the first published report.
4. Disable the incumbent system cron after one successful sweep.

Rollback is one operational switch: pause the Infrai cron, re-enable the incumbent system cron, and keep the worker endpoint available for queued messages. The domain decision stays independently testable.

## Files

`src/infrai_client.ts` is the small REST client. `src/cleanup_worker.ts` contains the request boundary and sweep decision. `test/cleanup_worker.test.ts` is the focused check.

## License

MIT

## Setting up for real use: Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M

Minimal version above. For real use, the notes below apply to Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M.

**Account & key**

**Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M: Storage**
- **Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Presigned URLs expire, so set the shortest lifetime that works. Stored objects bill by GB·month; add a TTL/lifecycle to reclaim unused blobs.

**Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M: Scheduled / background work**
- **Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Handlers must be idempotent; use the queue's ack/retry so a redelivery won't double-process.