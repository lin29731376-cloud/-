// Supabase 프로젝트 주소와 공개 키 (공개돼도 되는 값. 비밀 키는 절대 여기에 넣지 않음)
window.SM_CONFIG = {
  url: "https://oqtuhkceuvkpcmrnvgob.supabase.co",
  key: "sb_publishable_Fo36F5RvrlXQg_eAcs7d5Q_AHp4IkXh",
};

// 약관·동의서(terms.html)에 들어가는 운영자 정보. 비워 두면 화면에 [미기재]로 표시됨.
window.SM_TERMS = {
  operator: "",        // 상호
  service: "",         // 서비스 이름
  ceo: "",             // 대표자 성명
  bizno: "",           // 사업자등록번호
  contact: "",         // 연락처 (전화, 이메일)
  manager: "",         // 영상을 보는 관리자 (성명 또는 직책)
  privacyOfficer: "",  // 개인정보 보호책임자 (성명, 연락처)
  fee: "",             // 이용요금 (예: 월 100,000원)
  pay: "",             // 결제 방법과 결제일
  refund: "",          // 이용 시작 후 환불 기준
  outageDays: "",      // 서비스 중단 시 보상 기준 일수 (예: 3일)
  noticeDays: "",      // 변경·종료 사전 안내 일수 (예: 7일)
  keep: "",            // 학습 기록 보유 기간 (예: 탈퇴 시까지)
  court: "",           // 관할 법원
  effective: "",       // 시행일
};
window.SM_CONSENT_VERSION = "2026-11-15";

// 아이디 로그인: 로그인 서버(Supabase)는 이메일 형식이 필요해서, 아이디 뒤에 아래 도메인을 붙여 내부적으로만 씀.
// 실제로 메일이 가지 않는 주소이고, 화면에는 아이디만 보임.
window.SM_ID_DOMAIN = "id.invalid";
window.smLoginOf = function (input) { // 입력값 → 로그인용 주소 ('@'가 있으면 예전 이메일 계정으로 봄)
  var v = String(input || "").trim().toLowerCase();
  return v.indexOf("@") >= 0 ? v : v + "@" + window.SM_ID_DOMAIN;
};
window.smIdOf = function (email) { // 로그인용 주소 → 화면에 보일 아이디
  var e = String(email || ""), suf = "@" + window.SM_ID_DOMAIN;
  return e.slice(-suf.length) === suf ? e.slice(0, -suf.length) : e;
};

// 앱 업데이트: 저장해 둔 화면 파일을 지우고 서버에서 새로 받아 다시 연다
window.smUpdate = async function (btn) {
  if (btn) { btn.disabled = true; btn.textContent = "업데이트 중…"; }
  try {
    var files = ["./", "./index.html", "./admin.html", "./terms.html", "./config.js", "./auth.js", "./sw.js",
                 "./manifest.webmanifest", "./admin.webmanifest"];
    await Promise.all(files.map(function (f) { return fetch(f, { cache: "reload" }).catch(function () {}); }));
    if (window.caches) { var ks = await caches.keys(); await Promise.all(ks.map(function (k) { return caches.delete(k); })); }
    if (navigator.serviceWorker) {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function (r) { return r.unregister(); }));
    }
  } catch (e) { /* 실패해도 새로고침은 함 */ }
  location.reload();
};

// 새 버전 알림: 사이트에 새 버전이 올라오면 화면 위에 「업데이트」 안내를 띄움
window.SM_VERSION = 63; // version.json 과 같아야 함 (새로 올릴 때 둘 다 올림)
window.smShowUpdateBar = function (text) {
  if (document.getElementById("smUpd")) return;
  var bar = document.createElement("div"); bar.id = "smUpd";
  bar.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;display:flex;gap:10px;align-items:center;" +
    "padding:12px 14px;border-radius:14px;background:#1e2a44;color:#fff;font:600 15px/1.4 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)";
  var t = document.createElement("span"); t.style.flex = "1"; t.textContent = text || "앱 새 버전이 나왔습니다. 업데이트해 주세요.";
  var b = document.createElement("button"); b.type = "button"; b.textContent = "업데이트";
  b.style.cssText = "font:700 15px sans-serif;padding:9px 14px;border-radius:10px;border:0;background:#fff;color:#1e2a44";
  b.addEventListener("click", function () { window.smUpdate(b); });
  bar.append(t, b); document.body.append(bar);
};
(function () {
  function check() {
    fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && Number(j.v) > window.SM_VERSION) window.smShowUpdateBar();
    }).catch(function () {});
  }
  setTimeout(check, 5000); setInterval(check, 120000); // 2분마다 확인
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") check(); });
})();
