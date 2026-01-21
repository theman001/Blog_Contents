---
title: "[카카오톡-정적분석] #3. Cheat Sheet"
description: "카카오톡 Android 클라이언트의 네이티브·자바 레벨 정적 분석을 통해 도출한 인증·암호화 구조 핵심 치트 시트로, AES 키·IV, X-VC 생성 규칙, uvc3 페이로드 구성 및 주요 에러 코드 분석 결과를 정리한다."
tags: ["kakaotalk", "android", "reversing", "cryptography", "static-analysis", "mobile-security"]
author_type: "admin"
date: 2026-01-21
---

## 🛠️ MASTER CHEAT SHEET
카카오톡 안드로이드 클라이언트 정적 분석을 통해 확인된 핵심 인증·암호화 요소를 한눈에 볼 수 있도록 정리한 치트 시트이다.  
본 문서는 **동작 원리 이해 및 구조 분석 목적**의 기술 요약이다.

---

## 1. 🔑 암호화 마스터 키 (Verified Constants)

네이티브 라이브러리 **libtalkand_aes_v11.3.0.so** 에서 추출된 핵심 암호화 상수들이다.

| 항목 | 값 (Hex) | 설명 |
|---|---|---|
| AES Key | d317b436ed44dd2a47c65ba922ea39c017fb40b32d5c27f43add51cf49f15ac4 | AES-256 마스터 키 (Little Endian) |
| AES IV | b46ca0c59ae4aa0adf2f3c57286470ab | 초기화 벡터 (16바이트) |
| Algorithm | AES-256-CBC | 패딩 방식: PKCS7Padding |

---

## 2. 🛡️ X-VC 헤더 생성 공식

요청 무결성을 검증하기 위한 핵심 헤더로, SHA-512 기반 해시를 사용한다.

**포맷**
BARD|{User-Agent}|DANTE|{AccountKey}|SIAN

**AccountKey 규칙**
- 로그인 요청: 이메일 주소 (example@kakao.com)
- 인증번호 요청: 전화번호 (01012345678)

**생성 절차**
1. 위 문자열을 UTF-8 인코딩
2. SHA-512 해싱
3. 결과 해시의 **앞 16자리**를 X-VC 값으로 사용

---

## 3. 📦 uvc3 페이로드 (Telemetry JSON)

`Device-Info` 헤더에 포함되는 **암호화 대상 기기 정보(JSON)** 구조이다.

`
{
  "apkChecksum": "{CERT_HASH}",
  "e": "{DEVICE_E_TOKEN}",
  "batteryPct": 100,
  "sims": [{
    "tpn_eq_sim": 1,
    "operator": "45005"
  }],
  "installReferrer": "google-play"
}
`

- `apkChecksum`: APK 서명 인증서 해시 (가장 중요)
- `e`: 기기 고유 식별 토큰
- `batteryPct`: 반드시 **정수형(Integer)**
- `sims`: 유심 정보 (없을 경우 빈 리스트 또는 가공 데이터)
- `installReferrer`: 설치 경로 식별 값

---

## 4. 🚨 주요 에러 코드 및 대응법 (Troubleshooting)

| 에러 코드 | 의미 | 원인 및 분석 |
|---|---|---|
| -500 | Internal Server Error | apkChecksum 불일치 또는 uvc3 필수 필드 오류 |
| -400 | Bad Request | 파라미터 키 네이밍 불일치 (snake_case ↔ camelCase) |
| -100 | 기기 미등록 | 로그인 성공 상태이나 기기 인증 이전 단계 |
| 415 | Unsupported Media Type | Content-Type을 application/x-www-form-urlencoded 로 변경 필요 |

---

## 5. 📡 동적 분석(Frida) 핵심 후킹 포인트

정적 분석으로 한계에 도달했을 때 활용 가능한 주요 지점이다.

### 자바 레벨 암호화
- 위치: `com.kakao.talk.aes.TalkHello.encrypt(String input)`
- 효과: **암호화 직전 uvc3 평문 JSON 가로채기 가능**

### 네이티브 레벨 암호화
- 함수: `Java_com_kakao_talk_aes_TalkHello_encrypt`
- 주소: `0x0001db54`
- 효과: 인자로 전달되는 메모리 버퍼 덤프를 통해  
  `e` 토큰 등 핵심 식별 데이터 확보 가능

---

## 정리
이 치트 시트는 카카오톡 Android 인증 흐름에서  
**어디가 검증 포인트인지**, **어떤 값이 실패를 유발하는지**를 빠르게 판단하기 위한 참고 자료이다.  
향후 동적 분석·상태 머신 분석 문서의 기반 자료로 활용 가능하다.

---
