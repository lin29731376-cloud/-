// Supabase Edge Function: ai-judge
// 학생 화면에서 보낸 카메라 사진 한 장을 AI(Claude)가 보고 "공부 중인지" 판단해 돌려준다.
// 로그인하고 승인된 회원만 쓸 수 있다. 사진은 저장하지 않고 판단에만 쓴다.
// 필요한 Secret: ANTHROPIC_API_KEY
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const VERDICTS = ["studying", "phone", "sleeping", "absent", "distracted", "unclear"];
const PROMPT = `You are checking one webcam snapshot from a student in an online supervised study room.
Decide what the student is doing right now. Reply with JSON only, no other text:
{"verdict": "<one of: studying, phone, sleeping, absent, distracted, unclear>", "reason": "<under 30 Korean characters>"}
- studying: reading, writing, solving problems, or looking at study materials or a study screen. Looking down at a book or notebook counts as studying.
- phone: holding or looking at a smartphone (not a laptop or tablet used as study material).
- sleeping: head down on the desk, or eyes clearly closed with the head drooping.
- absent: no person in the seat.
- distracted: a person is present but clearly not studying (eating, talking to someone, gaming, watching videos, leaning back idle).
- unclear: image too dark, blurry, or blocked to judge.
When unsure between studying and something else, choose studying. Write the reason in Korean.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, apikey, { global: { headers: { Authorization: auth } } });
    const { data: u, error: uErr } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (uErr || !u?.user) return json({ error: "로그인이 필요합니다" }, 401);
    const { data: prof } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
    if (!prof || (prof.role !== "student" && prof.role !== "admin")) return json({ error: "승인된 회원이 아닙니다" }, 403);

    const body = await req.json().catch(() => null);
    const img = body && typeof body.image === "string" ? body.image.replace(/^data:image\/jpeg;base64,/, "") : "";
    if (!img || img.length > 400000) return json({ error: "사진이 없거나 너무 큽니다" }, 400);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 120,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } },
          { type: "text", text: PROMPT },
        ] }],
      }),
    });
    const out = await r.json();
    if (!r.ok) return json({ error: "AI 호출 실패: " + (out?.error?.message ?? r.status) }, 502);
    const text = (out.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    let verdict = "unclear", reason = "";
    try { const j = JSON.parse(m ? m[0] : "{}"); if (VERDICTS.includes(j.verdict)) verdict = j.verdict; reason = String(j.reason ?? "").slice(0, 40); } catch (_) { /* 형식이 틀리면 unclear */ }
    return json({ verdict, reason });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
