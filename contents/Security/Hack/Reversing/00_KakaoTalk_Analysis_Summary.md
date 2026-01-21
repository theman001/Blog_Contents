---
title: "[카카오톡-정적분석] #1. 카카오톡 안드로이드 인증 프로토콜 분석 1편"
description: "카카오톡 PC·안드로이드 클라이언트를 리버스 엔지니어링하여 웹 클라이언트 구현을 시도한 분석 보고서. 프로토콜 분석부터 인증 우회, 네이티브 암호화 로직 분석까지의 진행 상황을 정리한다."
tags:
  - kakaotalk
  - reverse-engineering
  - protocol-analysis
  - security
author_type: "admin"
date: 2026-01-09
---

## 1. 개요 (Overview)

본 보고서는 카카오톡 PC 클라이언트를 리버스 엔지니어링하여  
독자적인 **웹 클라이언트(KakaoWebTalk)** 구현을 목표로 진행한 분석 과정을 정리한 종합 보고서입니다.

초기에는 PC 클라이언트(`KakaoTalk.exe`)의 프로토콜을 직접 복제하는 접근을 시도했으나,  
강력한 난독화(Themida)와 복잡한 바이너리 프로토콜(LOCO) 구조로 인해  
**안드로이드 API를 모방하는 하이브리드 전략**으로 방향을 전환했습니다.

현재는 **아이디·비밀번호 검증 단계까지 성공**했으며,  
마지막 관문인 **기기 등록(Device Registration)** 단계의 네이티브 암호화 로직을 분석 중입니다.

---

## 2. Phase 1: PC 클라이언트 정적 / 동적 분석

### 2.1 보호 기법 분석

- **Themida / WinLicense**
  - PC 클라이언트는 상용 패커인 Themida로 보호
  - Ghidra 기준, 진입점 및 함수 흐름 분석이 사실상 불가능
- **우회 시도**
  - `x64dbg` + `ScyllaHide`로 안티 디버깅 우회
  - 실행 중 메모리에 풀린 코드 영역을 **Memory Dump**로 추출
- **한계점**
  - 코드 가상화(Virtualization)
  - Stolen Bytes 기법 사용
  - 핵심 로직 복구 난이도 매우 높음

➡️ **결론**: PC 바이너리 기반 접근은 비용 대비 효율이 낮다고 판단

---

### 2.2 프로토콜 분석 (LOCO)

- **발견 사항**
  - 내부 문자열 및 구조 분석 결과
    - 독자적 바이너리 프로토콜 **LOCO**
    - 데이터 포맷으로 **BSON(Binary JSON)** 사용
- **인증 데이터**
  - 로그인 시 다음 정보가 메모리 상에서 확인됨
    - `email`
    - `password`
    - `device_uuid`
- **전략 변경 이유**
  - PC 전용 프로토콜은 재현 난이도가 매우 높음
  - 반면, 모바일 API는 HTTPS 기반으로 구조 파악이 용이

➡️ **안드로이드 프로토콜 기반 접근으로 전환**

---

## 3. Phase 2: 안드로이드 API 기반 인증 우회 전략

### 3.1 전략 개념

- 실제 사용자 계정 정보(`email`, `password`) 사용
- 서버에는 **안드로이드 단말로 위장한 클라이언트**처럼 요청 전송
- 목표:
  - PC ↔ 서버 직접 통신이 아닌
  - 웹 ↔ 안드로이드 API ↔ 서버 구조 구현

---

### 3.2 로그인 API 성공 (`/login.json`)

- **Endpoint**
  `https://ac-talk.kakao.com/android/account/login.json`

- **핵심 헤더**
  - **User-Agent**
    - `KT/x.x.x An/x.x ko` 형식
  - **X-VC**
    - 요청 무결성 검증 토큰
    - `User-Agent`, `email` 등을 조합하여 **SHA-512 해시**
  - **Device-Info**
    - `uuid`, 제조사, OS 정보 등 기기 식별 값 포함

- **성과**
  - Python 기반 요청 재현 성공
  - 서버 응답:
    - **Status -100 (기기 미등록)**
  - 의미:
    - 계정 인증(ID / PW) 자체는 정상 통과

---

## 4. Phase 3: 기기 등록 및 네이티브 암호화 분석 (Current Status)

로그인 이후 필수 단계인  
**인증 번호 요청 (`request_passcode.json`)** 단계에서 기술적 장벽에 도달했습니다.

---

### 4.1 문제 현상

- 서버 응답:
  - **Status -500 (Internal Server Error)**
  - 또는 **-400**
- 단순 파라미터(`phone_number`) 전송만으로는 실패
- 추가적인:
  - 파라미터 암호화
  - 요청 무결성 검증
  - 네이티브 로직 연동
  이 필요하다고 판단

---

### 4.2 네이티브 라이브러리 분석

JADX + Ghidra를 활용하여 APK 내부 네이티브 라이브러리 분석 진행

#### `libtalkand_aes.so`

- 카카오톡 전용 암호화 라이브러리
- **AES-256-CBC** 알고리즘 사용 확인
- 성과:
  - 하드코딩된 **Static Key**
  - **IV 값**
  - 내부 암호화 함수 흐름 일부 식별
- 추정:
  - `request_passcode` 요청 파라미터가 이 라이브러리를 통해 암호화됨

#### `libNSaferJNI.so`

- 앱 무결성 / 보안 솔루션 계열
- 인증 단계 핵심 로직과 직접적 연관성은 낮다고 판단

---

### 4.3 동적 분석의 한계

- LDPlayer(x86) 환경에서 ARM 앱 실행 시:
  - `libhoudini` 호환성 문제 발생
- 결과:
  - Frida Hooking 실패
  - 실시간 암호화 함수 후킹 불가
  - 실제 패킷 형태 캡처 불가능

➡️ **분석 환경 자체가 병목 지점**

---

## 5. 향후 계획 (Roadmap)

### 5.1 분석 환경 개선

- Frida 안정성이 검증된 환경으로 이전
  - Nox Player (Android 9)
  - 또는 루팅된 실물 단말

---

### 5.2 정답지 확보 (Dynamic Analysis)

1. **Packet Capture**
   - SSL Pinning 우회
   - 실제 기기 등록 성공 시 트래픽 캡처
   - 암호화된 파라미터 구조 확인

2. **Native Hooking**
   - `libtalkand_aes.so` 내부 `encrypt` 계열 함수 후킹
   - 입력 평문 / 출력 암호문 실시간 확보

---

### 5.3 최종 구현 목표

- 확인된 암호화 로직:
  - AES Key / IV
  - Padding / Encoding 방식
- Python(`PyCryptodome`)으로 로직 이식
- `request_passcode.json` 요청 성공
- 최종적으로:
  - OAuth 토큰 획득
  - 웹 기반 카카오톡 클라이언트 구현

---

## 마무리

이 분석은 단순 기능 구현이 아닌,  
**상용 메신저가 어떤 방식으로 클라이언트를 식별하고 통제하는지**를 이해하는 과정이었습니다.

PC ↔ 모바일 ↔ 서버 간 인증 구조 차이,  
네이티브 암호화의 역할,  
그리고 분석 환경의 중요성까지  
실무적인 교훈을 다수 확보한 프로젝트로 남을 것입니다.
