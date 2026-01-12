# Blog_Contents

# 📝 게시글 작성 가이드 (Blog Contents)

이 문서는 IT Security Blog의 **게시글 작성 규칙**을 정의합니다.  
모든 게시글은 Markdown(`.md`) 형식으로 작성되며,  
정적 웹 블로그에서 자동으로 파싱·렌더링됩니다.

---

## 📁 게시글 작성 위치

모든 게시글 파일은 아래 디렉터리에 작성해야 합니다.

```
contents/
```

> ⚠️ 해당 경로 외의 파일은 게시글로 인식되지 않습니다.

---

## 📄 파일 작성 규칙

### 1️⃣ 파일 형식
- 확장자: `.md`
- 파일명 권장 규칙:

```
Num. title.md
```

예시:
```
01. static-web-hosting-test.md
```

---

## 🧩 Front Matter (필수)

모든 게시글은 **파일 최상단에 YAML Front Matter를 반드시 포함**해야 합니다.

```md
---
title: "정적 웹 호스팅 테스트용 글"
tags: ["test"]
author_type: "admin"
date: 2026-01-12
---
```

### 필드 설명

| 필드 | 설명 |
|---|---|
| `title` | 게시글 제목 |
| `tags` | 게시글 태그 (배열 형식) |
| `author_type` | 작성자 유형 (`admin`, `guest`, `test` 등) |
| `date` | 게시일 (YYYY-MM-DD 형식) |

> ⚠️ Front Matter는 반드시 **파일의 첫 줄부터 시작**해야 합니다.

---

## ✍️ 본문 작성

Front Matter 이후부터는 자유롭게 Markdown 문법을 사용하여 작성합니다.

```md
## 개요
이 글은 정적 웹 블로그 환경에서 게시글 렌더링을 테스트하기 위한 글입니다.

## 내용
- Cloudflare Pages 배포 확인
- Markdown 파싱 동작 테스트
- 메타데이터 정상 인식 여부 확인

## 결론
게시글이 정상적으로 출력됨을 확인했습니다.
```

---

## ✅ 작성 시 유의사항

- Front Matter와 본문 사이에 **빈 줄 1줄 유지**
- `date`는 실제 게시일 기준으로 작성
- 태그는 **소문자 사용 권장**
- 코드 블록에는 반드시 언어 지정

```md
```bash
npm install
```
```

- 이미지 사용 시 상대 경로 기준 작성

```md
![example](/static/assets/example.png)
```

---

## 🧪 예시 전체 게시글

```md
---
title: "정적 웹 호스팅 테스트용 글"
tags: ["static", "test"]
author_type: "admin"
date: 2026-01-12
---

## 개요
정적 블로그 동작 여부를 확인하기 위한 테스트 게시글입니다.

## 테스트 항목
- 게시글 목록 노출
- 상세 페이지 이동
- 태그 필터링

## 마무리
Cloudflare Pages 환경에서 정상 동작을 확인했습니다.
```

---

## ✨ 확장용 메타데이터 (선택)

추후 기능 확장을 위해 아래 필드를 추가할 수 있습니다.

```md
description: "정적 웹 호스팅 테스트 게시글"
thumbnail: "/static/assets/thumbnail.png"
draft: false
```

---

## 📌 요약

> **게시글은 `contents/` 디렉터리에  
> Markdown 형식으로 작성하며,  
> YAML Front Matter는 필수입니다.**
