import { database, failure, limit, readBody } from "@/lib/server";
import { addressSchema, type CaseRecord } from "@/lib/domain";
import { quote } from "@/lib/fee";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await limit(request, "quote");
    const { id } = await params;
    const { account } = await readBody(request);
    const parsed = addressSchema.safeParse(account);
    if (!parsed.success) throw new Error("A valid wallet address is required.");
    const row = await database()
      .prepare("SELECT record FROM cases WHERE id=?")
      .bind(id)
      .first<{ record: string }>();
    if (!row)
      return Response.json({ error: "Case not found." }, { status: 404 });
    const record: CaseRecord = JSON.parse(row.record);
    if (record.txId) throw new Error("This case has already been submitted.");
    return Response.json(await quote(record, parsed.data as `0x${string}`));
  } catch (e) {
    return failure(e);
  }
}
