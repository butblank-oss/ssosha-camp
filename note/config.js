/* 캠핑수첩 공유 기록(Supabase) 설정
 * 쏘샤캠프와 같은 Supabase 프로젝트를 쓰지만 표는 camp_note로 따로 써요.
 * publishable 키는 공개돼도 괜찮아요. 누가 고칠 수 있는지는 camp_note 표의 RLS(Row Level Security: 줄 단위 권한) 정책이 정해요.
 * 표를 만드는 SQL은 setup.sql에 있어요. null로 바꾸면 기록은 이 브라우저에만 저장돼요. */
window.CAMP_NOTE_SUPABASE = {
  url: "https://lcynjpiclpedxflfvhns.supabase.co",
  anonKey: "sb_publishable_tDpGepYjcn_CW6KjjKkdHQ_VwkQVuVo",
  table: "camp_note",
};
