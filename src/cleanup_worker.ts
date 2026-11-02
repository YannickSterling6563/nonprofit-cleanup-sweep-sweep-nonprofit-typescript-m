import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const sweepRequest = z.object({ asOf: z.string().datetime(), staleAfterDays: z.number().int().positive(), records: z.array(z.object({ id: z.string(), kind: z.enum(["donor_receipt", "volunteer_reminder", "campaign_report"]), updatedAt: z.string().datetime() })) });
export type SweepRequest = z.infer<typeof sweepRequest>;

export function staleRecordIds(input: SweepRequest): string[] {
  const cutoff = Date.parse(input.asOf) - input.staleAfterDays * 86_400_000;
  return input.records.filter((record) => Date.parse(record.updatedAt) < cutoff).map((record) => record.id);
}

export async function runSweep(input: unknown, client = new InfraiClient()) {
  const request = sweepRequest.parse(input);
  const staleIds = staleRecordIds(request);
  const receipt = { asOf: request.asOf, staleIds, removed: staleIds.length };
  await client.createBucket("nonprofit-sweep-reports");
  const report = await client.presign("nonprofit-sweep-reports", `sweeps/${request.asOf}.json`);
  await client.publish("nonprofit-sweep-results", receipt);
  return { staleIds, reportUrl: report.url };
}

if (process.argv[1]?.endsWith("cleanup_worker.ts")) {
  const body = process.env.SWEEP_REQUEST;
  if (!body) throw new Error("SWEEP_REQUEST must contain a JSON request body");
  runSweep(JSON.parse(body)).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error); process.exitCode = 1; });
}
