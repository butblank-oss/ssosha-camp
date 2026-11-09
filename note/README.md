# 캠핑수첩

때찌·때꾸와 평일 캠핑 갈 캠핑장 후보와 캠프닉 장소를 모아 보는 페이지예요. 쏘샤캠프와는 별개 앱이고, 나중에 다른 레포로 옮기기 쉽게 이 폴더 안에서 상대경로만 써요.

- 주소: https://butblank-oss.github.io/ssosha-camp/note/
- `camps.json`: 캠핑장 데이터 원본. `id`는 고정값이라 이름(`n`)을 바꿔도 찜·메모가 이어져요. 새 캠핑장은 겹치지 않는 영어 `id`를 붙여요.
- `photos.json`: 고캠핑(한국관광공사) 대표 사진. `.github/workflows/note-photos.yml`이 매주(그리고 camps.json이 바뀔 때) 시크릿 `GOCAMPING_KEY`로 받아 와요. 키는 페이지에 들어가지 않아요. 고캠핑 정보 조회서비스는 공공누리 제1유형이라 "사진: 고캠핑(한국관광공사)"를 표시해요.
- `config.js`: Supabase 연결 정보(쏘샤캠프와 같은 프로젝트, 표는 `camp_note`).
- `setup.sql`: 표 만드는 SQL. Supabase SQL Editor에서 한 번 실행해요.
- 파일을 고치면 `index.html`의 `?v=` 값(과 app.js 안의 `V`)을 올려서 휴대폰이 예전 파일을 쓰지 않게 해요.
