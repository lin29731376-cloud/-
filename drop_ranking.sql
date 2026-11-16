-- 공부시간 순위 기능 제거: 서버에 남아 있는 순위 조회 함수를 삭제. SQL Editor에 붙여넣고 Run.
drop function if exists public.day_ranking(date);
