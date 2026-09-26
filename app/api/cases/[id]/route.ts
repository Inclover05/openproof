import { database, failure } from "@/lib/server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id))
      return Response.json({ error: "Case not found." }, { status: 404 });
    const row = await database()
      .prepare("SELECT record FROM cases WHERE id=?")
      .bind(id)
      .first<{ record: string }>();
    if (!row)
      return Response.json({ error: "Case not found." }, { status: 404 });
    return Response.json(
      { record: JSON.parse(row.record) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e, 503);
  }
}
