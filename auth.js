// 로그인·회원가입·승인 확인. 통과하면 window.smAuth 를 채우고 "sm-ready" 이벤트를 보낸다.
(function () {
  var box = document.getElementById("auth"), app = document.getElementById("app");
  var cfg = window.SM_CONFIG;
  var css = document.createElement("style");
  css.textContent =
    ".authcard{max-width:380px;margin:48px auto;padding:24px;background:var(--panel);border:1px solid var(--line);border-radius:12px}" +
    ".authcard h1{font-size:22px;margin:0 0 4px}.authcard .sub{margin:0 0 16px;color:var(--muted);font-size:14px}" +
    ".authcard label{display:block;font-size:13px;margin-top:12px}" +
    ".authcard input{width:100%;margin-top:4px;padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit;background:#fff;color:var(--ink)}" +
    ".authcard button{width:100%;margin-top:14px}.authcard button.ghost{background:transparent;color:var(--ink);border-color:var(--line)}" +
    ".authcard .amsg{font-size:14px;color:var(--muted);margin:14px 0 0;min-height:1.5em}.authcard .amsg.err{color:var(--drowsy)}";
  document.head.append(css);

  function card(inner) { box.innerHTML = '<div class="authcard"><h1>독서실 모니터</h1>' + inner + "</div>"; box.hidden = false; app.hidden = true; }
  function q(id) { return document.getElementById(id); }
  function msg(text, err) { var m = q("aMsg"); if (m) { m.textContent = text || ""; m.classList.toggle("err", !!err); } }

  if (!window.supabase || !cfg) { card('<p class="amsg err">로그인 모듈을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.</p>'); return; }
  var sb = window.sb = window.supabase.createClient(cfg.url, cfg.key);
  function logout() { sb.auth.signOut().then(function () { location.reload(); }, function () { location.reload(); }); }

  var ERR = {
    "Invalid login credentials": "이메일 또는 비밀번호가 맞지 않습니다.",
    "Email not confirmed": "이메일 확인이 끝나지 않았습니다. 받은 메일의 링크를 눌러주세요.",
    "User already registered": "이미 가입된 이메일입니다. 로그인해 주세요.",
  };
  function explain(e) { var m = (e && e.message) || String(e); return ERR[m] || ("오류: " + m); }

  var mode = "login";
  function showForm(note, isErr) {
    var signup = mode === "signup";
    card('<p class="sub">' + (signup ? "회원가입 — 가입 후 관리자 승인이 필요합니다." : "로그인") + "</p>" +
      '<form id="aForm">' +
      (signup ? '<label>이름 <input type="text" id="aName" maxlength="20" autocomplete="name" required></label>' : "") +
      '<label>이메일 <input type="email" id="aEmail" autocomplete="email" required></label>' +
      '<label>비밀번호 (6자 이상) <input type="password" id="aPw" minlength="6" autocomplete="' + (signup ? "new-password" : "current-password") + '" required></label>' +
      '<button type="submit" id="aGo">' + (signup ? "가입하기" : "로그인") + "</button></form>" +
      '<button type="button" class="ghost" id="aSwitch">' + (signup ? "이미 계정이 있어요 — 로그인" : "처음이에요 — 회원가입") + "</button>" +
      '<p class="amsg" id="aMsg"></p>');
    msg(note, isErr);
    q("aSwitch").addEventListener("click", function () { mode = signup ? "login" : "signup"; showForm(); });
    q("aForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = q("aEmail").value.trim(), pw = q("aPw").value;
      q("aGo").disabled = true; msg("처리 중…");
      var done = function (r) {
        q("aGo") && (q("aGo").disabled = false);
        if (r.error) { msg(explain(r.error), true); return; }
        if (!r.data || !r.data.session) { mode = "login"; showForm("가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요."); return; }
        enter();
      };
      var fail = function (e) { q("aGo") && (q("aGo").disabled = false); msg(explain(e), true); };
      if (signup) {
        var name = q("aName").value.trim();
        if (!name) { q("aGo").disabled = false; msg("이름을 입력하세요.", true); return; }
        sb.auth.signUp({ email: email, password: pw, options: { data: { name: name } } }).then(done, fail);
      } else {
        sb.auth.signInWithPassword({ email: email, password: pw }).then(done, fail);
      }
    });
  }
  function showWait(text, isErr) {
    card('<p class="amsg' + (isErr ? " err" : "") + '" id="aMsg"></p>' +
      '<button type="button" id="aRetry">다시 확인</button><button type="button" class="ghost" id="aOut">로그아웃</button>');
    msg(text, isErr);
    q("aRetry").addEventListener("click", enter);
    q("aOut").addEventListener("click", logout);
  }

  async function enter() {
    try {
      var s = (await sb.auth.getSession()).data.session;
      if (!s) { showForm(); return; }
      var p = await sb.from("profiles").select("id,email,name,role").eq("id", s.user.id).maybeSingle();
      if (p.error) { showWait("계정 정보를 불러오지 못했습니다: " + p.error.message, true); return; }
      if (!p.data) { showWait("계정 정보가 아직 준비되지 않았습니다. 서버 설정(SQL)이 끝났는지 확인하세요.", true); return; }
      if (p.data.role === "pending") { showWait("가입이 접수되었습니다. 관리자가 승인하면 이용할 수 있습니다."); return; }
      if (window.SM_REQUIRE === "admin" && p.data.role !== "admin") { showWait("관리자 계정이 아닙니다.", true); return; }
      var st = await sb.from("settings").select("room_code,ntfy_topic").eq("id", 1).maybeSingle();
      if (st.error || !st.data) { showWait("설정을 불러오지 못했습니다" + (st.error ? ": " + st.error.message : "."), true); return; }
      window.smAuth = { profile: p.data, settings: st.data, logout: logout };
      box.hidden = true; app.hidden = false;
      document.dispatchEvent(new Event("sm-ready"));
    } catch (e) { showWait(explain(e), true); }
  }
  enter();
})();
