/**
 * Vercel Serverless Function — /api/photo
 * 추억 사진을 state.json과 분리해 Supabase Storage에 한 장씩 저장합니다.
 *   POST /api/photo?id=<id>  (본문: JPEG 바이너리) → { ok, url }
 *   GET  /api/photo?id=<id>  → 이미지 (사진은 안 바뀌므로 오래 캐시)
 */

const { resolveSupabaseCredentials, authHeaders } = require("./_supabase");

const PHOTO_BUCKET = "couple-app-photos";
const MAX_BYTES = 4 * 1024 * 1024; // Vercel 요청 본문 한도(4.5MB) 안쪽
const ID_PATTERN = /^[a-zA-Z0-9_-]{4,80}$/;

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  const { url, key } = resolveSupabaseCredentials();
  if (!url || !key) {
    sendJson(res, 503, { ok: false, error: "Supabase environment variables not connected yet" });
    return;
  }

  const query = new URL(req.url, "http://localhost").searchParams;
  const id = String(query.get("id") || "");
  if (!ID_PATTERN.test(id)) {
    sendJson(res, 400, { ok: false, error: "invalid id" });
    return;
  }
  const objectUrl = `${url}/storage/v1/object/${PHOTO_BUCKET}/${id}.jpg`;

  try {
    if (req.method === "GET") {
      const r = await fetch(objectUrl, { headers: authHeaders(key) });
      if (!r.ok) {
        sendJson(res, r.status === 400 || r.status === 404 ? 404 : 502, { ok: false });
        return;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      res.statusCode = 200;
      res.setHeader("Content-Type", "image/jpeg");
      // 사진 id마다 내용이 고정이라 한 번 받으면 폰·CDN에 계속 캐시 → 전송량 절약
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.end(buf);
      return;
    }

    if (req.method === "POST") {
      const body = await readRawBody(req);
      if (!body.length) {
        sendJson(res, 400, { ok: false, error: "empty body" });
        return;
      }

      // 버킷이 없으면 생성 (이미 있으면 무시됨)
      try {
        await fetch(`${url}/storage/v1/bucket`, {
          method: "POST",
          headers: authHeaders(key, { "Content-Type": "application/json" }),
          body: JSON.stringify({ id: PHOTO_BUCKET, name: PHOTO_BUCKET, public: false })
        });
      } catch (_) {}

      const up = await fetch(objectUrl, {
        method: "POST",
        headers: authHeaders(key, {
          "Content-Type": "image/jpeg",
          "x-upsert": "true",
          "Cache-Control": "max-age=31536000"
        }),
        body
      });
      if (!up.ok) {
        const text = await up.text().catch(() => "");
        sendJson(res, 502, { ok: false, error: `storage upload ${up.status}: ${text}` });
        return;
      }
      sendJson(res, 200, { ok: true, url: `/api/photo?id=${id}` });
      return;
    }

    sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
  } catch (err) {
    sendJson(res, err.status || 500, { ok: false, error: err.message || "error" });
  }
};
