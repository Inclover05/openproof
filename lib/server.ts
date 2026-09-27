import { neon } from "@neondatabase/serverless";
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error(
      "Case storage is unavailable. Your input has not been lost.",
    );
  const sql = neon(url);
  return {
    prepare(query: string) {
      let index = 0;
      const text = query.replace(/\?/g, () => "$" + ++index);
      return { bind(...values: (string | number | null)[]) {
        return {
          async first<T>() { const rows = await sql.query(text, values); return (rows[0] as T | undefined) || null; },
          async run() { const result = await sql.query(text, values, { fullResults: true }); return {meta:{changes:result.rowCount}}; },
        };
      }};
    },
  };
}
export async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("Use a JSON request.");
  if (Number(request.headers.get("content-length") || 0) > 10000)
    throw new Error("Request is too large.");
  if (!request.body) throw new Error("Request is empty.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 10000) {
      await reader.cancel();
      throw new Error("Request is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return JSON.parse(text);
}
export async function limit(request: Request, action: string) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  if (origin && (new URL(origin).host !== host || !["http:", "https:"].includes(new URL(origin).protocol)))
    throw new Error("Cross-site requests are not accepted.");
  const ip = process.env.VERCEL
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : request.headers.get("cf-connecting-ip") || "local";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip),
  );
  const key =
    action +
    ":" +
    Array.from(new Uint8Array(digest))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  const now = Date.now();
  const row = await database()
    .prepare(
      "INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires<? THEN 1 ELSE rate_limits.count+1 END, expires=CASE WHEN rate_limits.expires<? THEN ? ELSE rate_limits.expires END RETURNING count",
    )
    .bind(key, now + 300000, now, now, now + 300000)
    .first<{ count: number }>();
  if (!row || row.count > 10)
    throw new Error("Please wait five minutes before trying more requests.");
}
export function failure(e: unknown, status = 400) {
  return Response.json(
    {
      error:
        e instanceof Error ? e.message : "The request could not be completed.",
    },
    { status },
  );
}
