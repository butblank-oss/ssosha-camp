/* Supabase 설정 (공유 기록 저장소)
 * Supabase 대시보드 → Project Settings → API에서 Project URL과 anon public 키를 넣어요.
 * anon 키는 공개돼도 괜찮아요. 누가 고칠 수 있는지는 boards 테이블의 RLS 정책이 정해요.
 * null이면 기록은 이 브라우저에만 저장돼요. */
window.SOSHA_SUPABASE = null;
