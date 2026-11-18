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
