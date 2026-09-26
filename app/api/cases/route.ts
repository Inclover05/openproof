import { caseSchema, type CaseRecord } from "@/lib/domain";
import { readBody, limit, database, failure } from "@/lib/server";
export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const parsed = caseSchema.safeParse(body.input);
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    if (
      typeof body.snapshotId !== "string" ||
      !/^[a-f0-9-]{36}$/.test(body.snapshotId)
    )
      throw new Error("Collect evidence before saving.");
    await limit(request, "save");
    const existing = await database()
      .prepare("SELECT record FROM cases WHERE id=?")
      .bind(body.snapshotId)
      .first<{ record: string }>();
    if (existing) return Response.json({ record: JSON.parse(existing.record) });
    const snapshot = await database()
      .prepare(
        "SELECT input,evidence,created_at FROM evidence_snapshots WHERE id=?",
      )
      .bind(body.snapshotId)
      .first<{ input: string; evidence: string; created_at: number }>();
    if (!snapshot || Date.now() - snapshot.created_at > 900000)
      throw new Error(
        "This evidence preview has expired. Go back and collect it again.",
      );
    if (snapshot.input !== JSON.stringify(parsed.data))
      throw new Error(
        "Inputs changed after evidence collection. Collect evidence again.",
      );
    const record: CaseRecord = {
      id: body.snapshotId,
      input: parsed.data,
      evidence: JSON.parse(snapshot.evidence),
      createdAt: new Date().toISOString(),
      state: "draft",
    };
    await database()
      .prepare(
        "INSERT OR IGNORE INTO cases (id,record,created_at) VALUES (?,?,?)",
      )
      .bind(record.id, JSON.stringify(record), record.createdAt)
      .run();
    return Response.json({ record }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
