---
title: "00. 카카오톡 분석 및 웹 클라이언트 구현 종합 보고서"
tags: ["kakaotalk", "reverse-engineering", "protocol-analysis", "security"]
author_type: "admin"
date: 2026-01-13
---

## 1. 개요 (Overview)

본 보고서는 카카오톡 PC 클라이언트를 리버스 엔지니어링하여 독자적인 **웹 클라이언트(KakaoWebTalk)**를 구현하기 위한 일련의 분석 과정과 기술적 발견 사항을 종합한 문서입니다.

초기에는 PC 클라이언트(`KakaoTalk.exe`)의 프로토콜 복제를 시도했으나, 강력한 난독화(Themida)와 바이너리 프로토콜(LOCO)의 복잡성으로 인해 **안드로이드 API를 모방하는 하이브리드 전략**으로 선회하였습니다. 현재 로그인 검증에는 성공하였으며, 최종 기기 등록 단계의 암호화 로직을 분석 중입니다.

## 2. Phase 1: PC 클라이언트 정적/동적 분석

### 2.1 보호 기법 분석
*   **Themida/WinLicense**: PC 버전은 상용 패커인 Themida로 보호되어 있어 정적 분석 도구(Ghidra)로 진입점 확인이 불가능했습니다.
*   **우회 시도**:
    *   `ScyllaHide`와 `x64dbg`를 사용하여 안티-디버깅을 우회하고 메모리에 풀린 코드의 덤프(Memory Dump)를 획득했습니다.
    *   덤프된 바이너리 분석 결과, **Virtualization(가상화)** 및 **Stolen Bytes** 기법으로 인해 핵심 코드의 복구가 난해함을 확인했습니다.

### 2.2 프로토콜 분석 (LOCO)
*   **발견 사항**: 메모리 내 평문 문자열과 심볼을 통해 카카오톡이 **LOCO**라는 독자적인 바이너리 프로토콜과 **BSON**(Binary JSON) 포맷을 사용함을 식별했습니다.
*   **인증 데이터**: `KakaoTalk.exe` 메모리 스캔을 통해 로그인 시 `email`, `password`, `device_uuid`가 전송됨을 확인했습니다.
*   **전략 변경**: PC 프로토콜의 복잡도와 높은 에뮬레이션 난이도로 인해, 표준 HTTPS를 사용하는 **모바일(안드로이드) 프로토콜**로 분석 대상을 변경했습니다.

## 3. Phase 2: 안드로이드 API 기반 인증 우회 전략

### 3.1 전략 개념
PC에서 사용하는 실제 계정 정보(`email`, `password`)를 이용하되, 서버에는 **안드로이드 기기**인 것처럼 위장하여 통신하는 전략입니다.

### 3.2 로그인 API (`/login.json`) 성공
*   **Endpoint**: `https://ac-talk.kakao.com/android/account/login.json`
*   **필수 헤더**:
    *   **X-VC**: 요청 무결성 검증 토큰. (`User-Agent`, `email` 등을 조합하여 SHA-512 해싱)
    *   **User-Agent**: 카카오톡 안드로이드 앱 표준 형식 (`KT/x.x.x An/x.x ko`)
    *   **Device-Info**: 기기 고유값(`uuid`) 및 하드웨어 정보 포함.
*   **성과**: 위 헤더를 Python으로 구현하여 서버로부터 **Status -100 (기기 미등록)** 응답을 획득, 아이디/비밀번호 검증을 통과했습니다.

### 4. Phase 3: 기기 등록 및 네이티브 암호화 분석 (Current Status)

로그인 후 필수 과정인 **인증 번호 요청(`request_passcode.json`)** 단계에서 현재 기술적 장벽에 봉착해 있습니다.

### 4.1 문제점
*   인증 번호 요청 시 서버로부터 **Status -500 (Internal Server Error)** 또는 **-400** 오류가 지속적으로 발생.
*   단순 파라미터(`phone_number`) 전송이 아닌, 추가적인 **암호화** 혹은 **무결성 검증**이 필요한 것으로 추정됩니다.

### 4.2 네이티브 라이브러리 분석
JADX 및 Ghidra를 통해 안드로이드 앱의 핵심 네이티브 라이브러리를 분석했습니다.

*   **`libtalkand_aes.so`**:
    *   카카오톡 전용 AES 암호화 라이브러리.
    *   **AES-256-CBC** 알고리즘 사용 확인.
    *   코드 내 하드코딩된 **Static Key** 및 **IV** 추출 성공.
    *   `request_passcode`의 파라미터가 이 라이브러리를 통해 암호화되어 전송될 가능성이 매우 높음.
*   **`libNSaferJNI.so`**: 앱 무결성 및 보안 솔루션으로, 우선순위는 낮음.

### 4.3 동적 분석의 한계 및 이슈
*   LDPlayer(x86) 환경에서 ARM 기반 앱을 구동할 때 `libhoudini` 호환성 문제로 **Frida Hooking**이 실패했습니다.
*   이로 인해 실제 전송되는 패킷의 형태를 캡처하거나, 암호화 함수를 실시간으로 가로채는 작업이 지연되고 있습니다.

## 5. 향후 계획 (Roadmap)

### 5.1 분석 환경 개선
*   Frida 호환성이 확보된 환경(Nox Player Android 9 또는 루팅된 실물 폰)으로 분석 환경을 이관합니다.

### 5.2 정답지 확보 (Dynamic Analysis)
1.  **Packet Capture**: 실제 기기 등록 성공 시의 트래픽을 SSL Pinning을 우회하여 캡처합니다. 이를 통해 암호화된 파라미터의 형태를 확인합니다.
2.  **Native Hooking**: `libtalkand_aes.so`의 `encrypt` 함수를 후킹하여, 어떤 데이터가 입력되고 출력되는지 실시간으로 관찰합니다.

### 5.3 최종 구현
*   확인된 암호화 로직(AES Key/IV 등)을 Python(`PyCryptodome`)으로 이식하여, `request_passcode.json` 요청을 성공시키고 OAuth 토큰을 획득합니다.


