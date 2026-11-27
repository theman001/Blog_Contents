---
title: "샘플: Android 인증 프로토콜 분석"
description: "기술 글 레이아웃 검증용 샘플 글입니다. 목차, 코드 블록, 표, 인용을 포함합니다."
tags: ["sample", "reversing", "android"]
author_type: "admin"
date: 2026-11-18
---

## 개요
이 글은 기술 글 레이아웃(목차, 코드, 표, 인용)을 확인하기 위한 샘플입니다.

> 인용문 예시: 구현은 설명보다 정직하다.

## 인증 흐름
1. 클라이언트가 기기 정보를 해시한다.
2. 서버가 챌린지를 내려준다.
3. 클라이언트가 응답을 서명한다.

| 단계 | 주체 | 설명 |
|---|---|---|
| 1 | 클라이언트 | 기기 정보 해시 |
| 2 | 서버 | 챌린지 발급 |
| 3 | 클라이언트 | 서명 응답 |

### 후킹 예시
```bash
frida -U -f com.example.app -l hook.js
```

```javascript
Java.perform(() => {
  const C = Java.use("com.example.Auth");
  C.sign.implementation = function (a) { return this.sign(a); };
});
```

### 키 조합
인라인 코드 `AES-256-GCM` 과 [링크](https://example.com) 예시. 이미지 경로는 `./assets/diagram.png` 형식을 쓴다.

## 정리
소제목이 3개 이상이므로 목차가 보여야 한다.
