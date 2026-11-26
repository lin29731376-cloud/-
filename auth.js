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
    ".authcard label.ck{display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.5}" +
    ".authcard label.ck input{width:auto;margin:4px 0 0;flex:none}" +
    ".authcard .note{font-size:13px;color:var(--muted);margin:10px 0 0}" +
    ".authcard .amsg{font-size:14px;color:var(--muted);margin:14px 0 0;min-height:1.5em}.authcard .amsg.err{color:var(--drowsy)}";
  document.head.append(css);

  function card(inner) { box.innerHTML = '<div class="authcard"><h1>바른결 관리형 독서실</h1>' + inner + "</div>"; box.hidden = false; app.hidden = true; }
  function q(id) { return document.getElementById(id); }
  function msg(text, err) { var m = q("aMsg"); if (m) { m.textContent = text || ""; m.classList.toggle("err", !!err); } }

  if (!window.supabase || !cfg) { card('<p class="amsg err">로그인 모듈을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.</p>'); return; }
  var sb = window.sb = window.supabase.createClient(cfg.url, cfg.key);
  function logout() { sb.auth.signOut().then(function () { location.reload(); }, function () { location.reload(); }); }

  var ERR = {
    "Invalid login credentials": "아이디 또는 비밀번호가 맞지 않습니다.",
    "Email not confirmed": "이메일 확인이 끝나지 않았습니다. 받은 메일의 링크를 눌러주세요.",
    "User already registered": "이미 사용 중인 아이디입니다. 다른 아이디를 쓰거나 로그인해 주세요.",
  };
  function explain(e) {
    var m = (e && e.message) || String(e);
    if (ERR[m]) return ERR[m];
    if (/email/i.test(m) && /invalid/i.test(m)) return "로그인 서버가 아이디 형식을 받아주지 않았습니다. 운영자에게 이 문구를 알려주세요. (" + m + ")";
    return "오류: " + m;
  }

  var mode = "login";
  function showForm(note, isErr) {
    var signup = mode === "signup";
    card('<p class="sub">' + (signup ? "회원가입 — 가입 후 관리자 승인이 필요합니다." : "로그인") + "</p>" +
      '<form id="aForm">' +
      (signup ? '<label>이름 <input type="text" id="aName" maxlength="20" autocomplete="name" required></label>' : "") +
      '<label>아이디' + (signup ? ' (영문 소문자·숫자·_ 4~20자)' : '') +
      ' <input type="text" id="aEmail" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>' +
      '<label>비밀번호 (6자 이상) <input type="password" id="aPw" minlength="6" autocomplete="' + (signup ? "new-password" : "current-password") + '" required></label>' +
      '<button type="submit" id="aGo">' + (signup ? "가입하기" : "로그인") + "</button></form>" +
      '<button type="button" class="ghost" id="aSwitch">' + (signup ? "이미 계정이 있어요 — 로그인" : "처음이에요 — 회원가입") + "</button>" +
      '<p class="amsg" id="aMsg"></p>');
    msg(note, isErr);
    q("aSwitch").addEventListener("click", function () { mode = signup ? "login" : "signup"; showForm(); });
    q("aForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var raw = q("aEmail").value.trim(), pw = q("aPw").value;
      if (signup && !/^[a-z0-9_]{4,20}$/.test(raw.toLowerCase())) {
        q("aGo").disabled = false; msg("아이디는 영문 소문자, 숫자, 밑줄(_)로 4~20자여야 합니다.", true); return;
      }
      var email = window.smLoginOf(raw);
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
    q("aRetry").addEventListener("click", function () { // 눌렸다는 것이 보이도록 잠깐 표시
      q("aRetry").disabled = true; msg("확인 중…");
      setTimeout(enter, 500);
    });
    q("aOut").addEventListener("click", logout);
  }

  // --- 약관·개인정보 동의 (서버에 동의 기록이 없으면 먼저 받음) ---
  var VER = window.SM_CONSENT_VERSION || "v1";
  async function needConsent(uid) {
    var c = await sb.from("consents").select("version").eq("user_id", uid).eq("version", VER).maybeSingle();
    if (c.error) return false; // 동의 기록용 서버 설정이 아직 없으면 건너뜀
    return !c.data;
  }
  function showConsent() {
    card('<p class="sub">이용 전에 아래 내용에 동의해 주세요. <a href="terms.html" target="_blank" rel="noopener">약관과 개인정보 안내 전문 보기</a></p>' +
      '<label class="ck"><input type="checkbox" id="c1"><span>[필수] 이용약관에 동의합니다.</span></label>' +
      '<label class="ck"><input type="checkbox" id="c2"><span>[필수] 개인정보 수집·이용에 동의합니다. 공부하는 동안의 카메라 영상이 관리자에게 실시간으로 전송되고, 화면 기록·얼굴 분석 결과·학습 기록이 처리됩니다.</span></label>' +
      '<label class="ck"><input type="checkbox" id="c3"><span>[필수] 개인정보 처리 위탁 및 국외 이전에 동의합니다.</span></label>' +
      '<label class="ck"><input type="radio" name="age" id="a14" value="over"><span>만 14세 이상입니다.</span></label>' +
      '<label class="ck"><input type="radio" name="age" id="u14" value="under"><span>만 14세 미만입니다.</span></label>' +
      '<p class="note" id="u14note" hidden>만 14세 미만은 보호자가 서명한 동의서를 운영자에게 제출해야 가입이 승인됩니다.</p>' +
      '<label class="ck"><input type="checkbox" id="c5"><span>[선택] 학습 리포트를 보호자에게 제공하는 데 동의합니다.</span></label>' +
      '<button type="button" id="cGo">동의하고 계속</button><button type="button" class="ghost" id="aOut">로그아웃</button>' +
      '<p class="amsg" id="aMsg"></p>');
    var age = function () { return q("u14").checked ? "under" : (q("a14").checked ? "over" : ""); };
    q("a14").addEventListener("change", function () { q("u14note").hidden = true; });
    q("u14").addEventListener("change", function () { q("u14note").hidden = false; });
    q("aOut").addEventListener("click", logout);
    q("cGo").addEventListener("click", function () {
      if (!q("c1").checked || !q("c2").checked || !q("c3").checked) { msg("필수 항목에 모두 동의해야 이용할 수 있습니다.", true); return; }
      if (!age()) { msg("만 14세 이상인지 선택해 주세요.", true); return; }
      q("cGo").disabled = true; msg("저장 중…");
      sb.from("consents").insert({ version: VER, under14: age() === "under", report_ok: q("c5").checked })
        .then(function (r) {
          if (r.error) { q("cGo").disabled = false; msg("저장 실패: " + r.error.message, true); return; }
          enter();
        }, function (e) { q("cGo").disabled = false; msg(explain(e), true); });
    });
  }

  async function enter() {
    try {
      var s = (await sb.auth.getSession()).data.session;
      if (!s) { showForm(); return; }
      var p = await sb.from("profiles").select("id,email,name,role").eq("id", s.user.id).maybeSingle();
      if (p.error) { showWait("계정 정보를 불러오지 못했습니다: " + p.error.message, true); return; }
      if (!p.data) { showWait("계정 정보가 아직 준비되지 않았습니다. 서버 설정(SQL)이 끝났는지 확인하세요.", true); return; }
      if (await needConsent(s.user.id)) { showConsent(); return; }
      if (p.data.role === "pending") { showWait("가입이 접수되었습니다. 아직 승인 전입니다. (" + new Date().toLocaleTimeString("ko-KR", { hour12: false }) + " 확인)"); return; }
      if (window.SM_REQUIRE === "admin" && p.data.role !== "admin") { showWait("관리자 계정이 아닙니다.", true); return; }
      var st = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
      if (st.error || !st.data) { showWait("설정을 불러오지 못했습니다" + (st.error ? ": " + st.error.message : "."), true); return; }
      window.smAuth = { profile: p.data, settings: st.data, logout: logout };
      box.hidden = true; app.hidden = false;
      document.dispatchEvent(new Event("sm-ready"));
    } catch (e) { showWait(explain(e), true); }
  }
  enter();
})();
