# Blog_Contents

IT Security Blog의 콘텐츠 레포입니다. `contents/**` 가 `main` 에 push 되면
`.github/workflows/sync.yml` 이 돌아가 마크다운을 Neon DB(`reports`/`categories`)에
동기화하고, 변경된 `assets/*` 를 R2에 업로드합니다. `main` 에 직접 커밋/push 하지
말고 브랜치에서 작업해 PR로 올리세요 — PR에는 `.github/workflows/lint-contents.yml`
이 DB 쓰기 없이 구조/필수 필드를 검사합니다.

## 디렉터리 구조

```
contents/
  tech/        _category.md            # name: "기술"
    security/  _category.md            # name: "보안"
      reversing/ _category.md          # name: "리버싱"
        sample-android-auth.md
  trends/      _category.md            # name: "동향·사건사고"
  essays/      _category.md            # name: "사유"
    why-security-learns-late.md
```

- 최상위 폴더는 정확히 `tech`, `trends`, `essays` 셋만 허용됩니다(= 섹션). `essays`
  는 하위 폴더 없이 평평하게 글을 둡니다.
- 폴더/파일 이름(확장자 제외)은 `^[a-z0-9]+(-[a-z0-9]+)*$` 만 허용합니다. 영소문자,
  숫자, 하이픈만 쓰고, 번호 접두사(`01-` 등)는 쓰지 않습니다. 정렬은 날짜순입니다.
- 글의 slug = `contents/` 기준 상대경로에서 `.md` 를 뗀 값입니다
  (예: `tech/security/reversing/sample-android-auth`).
- 폴더의 화면 표시 이름은 그 폴더의 `_category.md` 의 `name` 필드에서 읽습니다.
  `_category.md` 가 없으면 폴더명을 그대로 이름으로 씁니다.
- `_category.md` 자체는 글이 아닙니다 — DB의 `reports` 테이블에 올라가지 않고,
  본문은 무시됩니다. front matter는 `name` 하나만 봅니다:

  ```yaml
  ---
  name: "보안"
  ---
  ```

## 글 Front Matter

```yaml
---
title: "글 제목"             # 필수
description: "목록/SEO용 요약" # 필수 — 비어 있으면 CI(lint-contents) 실패
tags: ["reversing"]          # 배열, 소문자 권장
author_type: "admin"
date: 2026-11-20             # YYYY-MM-DD, 필수
related: "tech/security/reversing/sample-android-auth"  # 선택, essays 글에서만 사용
---
```

- `related` 은 다른 글을 가리킬 때만 씁니다. 글 경로(`tech/.../slug`) 또는
  `https://<도메인>/posts/<경로>` 형태의 URL을 모두 쓸 수 있고, 동기화 시 경로만
  남겨 `reports.related_slug` 에 저장합니다.
  - 자기 자신을 가리키면 동기화가 실패합니다.
  - 대상 글이 존재하지 않으면 경고만 출력되고 값은 그대로 저장됩니다(글이 나중에
    생기거나, 프론트에서 조용히 카드를 숨기는 걸 전제로 합니다).

### 작성 시 유의사항

- Front Matter는 파일 첫 줄부터 시작하고, 본문과는 빈 줄 1줄로 구분합니다.
- 날짜는 실제 게시일 기준, `YYYY-MM-DD` 로 적습니다.
- 코드 블록에는 언어를 지정합니다.
- 이미지는 `./assets/파일명` 형식으로 참조합니다(동기화 시 R2 URL로 치환됩니다).
- 코드 블록 안에 대괄호(`[`, `]`)가 있으면 렌더링이 깨질 수 있습니다. 코드펜스
  언어를 `text` 로 쓰거나, 문제되는 줄을 인라인 코드로 감싸 확인하세요.

## 로컬에서 확인하기

```bash
npm ci
npm test              # scripts/lib 순수 함수 단위 테스트 (DB 불필요)
npm run sync:dry-run  # 파일만 읽어 upsert/delete 될 내용을 출력, DB에 쓰지 않음
```

`DATABASE_URL` 환경변수가 설정돼 있으면 dry-run이 현재 DB와 비교해 삭제될
slug까지 보여줍니다(SELECT만 수행, 쓰기 없음). 설정돼 있지 않으면 파일 기준
upsert 목록만 보여줍니다 — PR의 `lint-contents.yml` 이 바로 이 모드로 돕니다.

## 안전장치

- **대량 삭제 가드**: 이번 동기화로 지워질 글 수가 10개를 초과하거나 현재 DB
  글 수의 50%를 초과하면, 환경변수 `ALLOW_MASS_DELETE=1` 없이는 동기화가 중단됩니다.
  GitHub Actions에서는 저장소 변수(Settings → Secrets and variables → Actions →
  Variables)로 `ALLOW_MASS_DELETE` 를 설정하세요. 의도적인 대량 삭제가 끝나면
  다시 지우거나 `0` 으로 되돌리는 걸 권장합니다.
- 파일이 하나도 없으면 동기화 자체가 중단됩니다.
- 이름 규칙/필수 필드를 위반하면 dry-run과 실제 동기화 모두 실패합니다.
