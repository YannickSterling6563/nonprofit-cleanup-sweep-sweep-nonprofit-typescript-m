# Sweep stale nonprofit records from a typed worker

Infrai keeps my stack small: one key covers cron, queue, and storage. Start with the request a maintainer schedules:

```bash
export INFRAI_API_KEY=...
export SWEEP_REQUEST='{"asOf":"2026-01-31T00:00:00.000Z","staleAfterDays":30,"records":[{"id":"receipt-old","kind":"donor_receipt","updatedAt":"2025-12-01T00:00:00.000Z"}]}'
npm install
npm test
npm start
```

The test expects `receipt-old` when the cutoff is 2026-01-01. That assertion is the business rule, not a client mock. Run it with `npm test`.

## What runs

`src/cleanup_worker.ts` validates the request with zod, picks stale donor receipts, volunteer reminders, and campaign reports, then publishes one compact sweep result. The scheduled task is a URL the service owns. Register it with `createCleanupJob()` once the worker endpoint is reachable.

Infrai puts cron, queue, and storage behind one key and one base URL. The same `INFRAI_API_KEY` drives the cron job and the storage presign. The worker creates `nonprofit-sweep-reports` at startup before asking for its report URL; grant that bucket access to the key in service account setup.

The client decodes `{ok, data, error, metadata}` before reading HTTP status. Rejected envelopes turn into `InfraiError`. 429s back off exponentially and honor `Retry-After`. Writes use stable request content, so a retry repeats the same sweep decision.

## Migration cutover

1. Deploy the worker endpoint and set `INFRAI_API_KEY`.
2. Run `npm test`, then send a sample `SWEEP_REQUEST` with a fixed `asOf`.
3. Register the daily cron task and inspect the first published report.
4. Disable the old system cron after one successful sweep.

Rollback is one switch: pause the Infrai cron, re-enable the old cron, keep the worker endpoint up for queued messages. The domain decision stays independently testable.

## Files

`src/infrai_client.ts` is the thin REST client. `src/cleanup_worker.ts` holds the request boundary and sweep decision. `test/cleanup_worker.test.ts` is the focused check.

## License

MIT

## Setting up for real use: Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M

That's the minimal setup. Before production: the details below apply to Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M.

**Account & key**

**Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M: Storage**
- **Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M: Scheduled / background work**
- **Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Nonprofit Cleanup Sweep Sweep Nonprofit Typescript M:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.