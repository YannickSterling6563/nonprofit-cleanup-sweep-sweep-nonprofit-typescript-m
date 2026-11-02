import assert from "node:assert/strict";
import { staleRecordIds } from "../src/cleanup_worker.js";

const result = staleRecordIds({ asOf: "2026-01-31T00:00:00.000Z", staleAfterDays: 30, records: [
  { id: "receipt-old", kind: "donor_receipt", updatedAt: "2025-12-01T00:00:00.000Z" },
  { id: "reminder-current", kind: "volunteer_reminder", updatedAt: "2026-01-20T00:00:00.000Z" },
  { id: "report-old", kind: "campaign_report", updatedAt: "2025-12-15T00:00:00.000Z" }
] });
assert.deepEqual(result, ["receipt-old", "report-old"]);
console.log("cleanup decision: passed");
