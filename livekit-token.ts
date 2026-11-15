// Supabase Edge Function: livekit-token
// 로그인한 승인 회원에게만 영상 서버(LiveKit) 입장권을 발급한다.
// 학생: 자기 영상 보내기만 가능 / 관리자: 영상 보기만 가능.
// 필요한 Secrets: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function signJwt(claims: Record<string, unknown>, secret: string): Promise<string> {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(head + "." + body)));
  return head + "." + body + "." + b64url(sig);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const lkUrl = Deno.env.get("LIVEKIT_URL"), lkKey = Deno.env.get("LIVEKIT_API_KEY"), lkSecret = Deno.env.get("LIVEKIT_API_SECRET");
    if (!lkUrl || !lkKey || !lkSecret) return json({ error: "LiveKit Secrets가 설정되지 않았습니다" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, apikey, { global: { headers: { Authorization: auth } } });

    const { data: u, error: uErr } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (uErr || !u?.user) return json({ error: "로그인이 필요합니다" }, 401);
    const user = u.user;

    // 아래 두 조회는 로그인한 본인 권한으로 실행되므로, 승인되지 않은 회원은 설정을 읽지 못한다.
    const { data: prof } = await sb.from("profiles").select("name,role").eq("id", user.id).maybeSingle();
    if (!prof || (prof.role !== "student" && prof.role !== "admin")) return json({ error: "승인된 회원이 아닙니다" }, 403);
    const { data: st } = await sb.from("settings").select("room_code").eq("id", 1).maybeSingle();
    if (!st?.room_code) return json({ error: "설정을 읽지 못했습니다" }, 500);

    let want = "student";
    try { const b = await req.json(); if (b && b.as === "admin") want = "admin"; } catch (_) { /* 본문 없음 */ }
    const asAdmin = want === "admin";
    if (asAdmin && prof.role !== "admin") return json({ error: "관리자만 가능합니다" }, 403);

    const now = Math.floor(Date.now() / 1000);
    const identity = (asAdmin ? "admin-" : "stu-") + user.id;
    const token = await signJwt({
      iss: lkKey, sub: identity, name: prof.name || user.email || "", nbf: now - 10, exp: now + 6 * 3600,
      video: { room: st.room_code, roomJoin: true, canPublish: !asAdmin, canSubscribe: asAdmin, canPublishData: true },
    }, lkSecret);
    return json({ url: lkUrl, token, identity });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
