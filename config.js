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
