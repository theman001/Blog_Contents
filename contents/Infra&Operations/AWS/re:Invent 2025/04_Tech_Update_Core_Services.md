---
title: "[AWS re:Invent] #4. Tech Update: 코어 인프라 서비스 업데이트"
description: "Graviton5 칩셋과 M9g 인스턴스, Lambda Durable Functions, 그리고 S3 초대용량 객체 지원까지 성능·비용·운영 효율을 동시에 개선하는 AWS 코어 인프라 핵심 업데이트 정리"
tags: ["AWS", "Infrastructure", "Compute", "Graviton5", "Database", "Serverless"]
author_type: "admin"
date: 2025-02-05
---

## 개요
본 포스팅은 AWS re:Invent 2025에서 발표된 **코어 인프라(Core Infrastructure)** 서비스 업데이트를 정리한 글입니다.  
컴퓨팅, 컨테이너·서버리스, 데이터베이스, 스토리지, 네트워킹, 거버넌스 영역 전반에서  
**성능 향상**, **비용 최적화**, **운영 복잡성 제거**를 목표로 한 변화가 대거 공개되었습니다.

이번 업데이트는 단순 신규 기능 소개가 아닌,  
👉 *“어떻게 더 빠르고, 싸고, 안정적으로 운영할 것인가”*에 대한 AWS의 방향성이 명확히 드러난 세션이었습니다.

---

## 1. Compute: 차세대 실리콘과 워크로드 최적화

### AWS Graviton5 & M9g 인스턴스
AWS 자체 설계 ARM 기반 프로세서 **Graviton5**가 공개되었습니다.

- **성능:** Graviton4 대비 **25% 이상 성능 향상**
- **워크로드별 개선폭**
  - 데이터베이스: 최대 **30%**
  - 애플리케이션 서버: 최대 **35%**
- **M9g (Preview):**
  - Graviton5 기반 범용 인스턴스
  - 웹 서비스, API 서버, 마이크로서비스에 최적
  - 전력 효율 기반 **TCO 절감 효과** 기대

👉 기존 x86 기반 워크로드의 ARM 전환을 본격적으로 고려할 시점입니다.

---

### 워크로드 특화 신규 인스턴스
게임·고성능 서버를 겨냥한 **목적 지향형 인스턴스**가 다수 추가되었습니다.

- **EC2 H2a**
  - AMD 기반, 최대 192 vCPU
  - 대규모 동시 접속(MMORPG, 배틀로얄)
  - 가성비 **19% 향상**
- **EC2 M8h (Preview)**
  - High Clock 인스턴스
  - FPS, 액션 게임 등 **ms 단위 응답성** 요구 워크로드
- **X8a / X8g**
  - CPU:Memory = **1:32**
  - Redis, 인메모리 DB, 대규모 캐시 서버에 적합

---

### Interruptible Capacity Reservation
- 온디맨드 용량을 예약하되, AWS가 필요 시 회수 가능
- 그 대가로 **저렴한 단가 제공**
- 배치 처리, 비동기 작업, 테스트 환경에 적합

---

## 2. Containers & Serverless: 운영 부담 최소화

### Amazon ECS Express Mode
- ECS 환경을 **한 번의 명령으로 배포**
- 네트워크, 보안, 스케일링 설정이 AWS Best Practice로 자동 구성
- 컨테이너 초심자부터 운영팀까지 모두 부담 감소

---

### AWS Lambda Durable Functions (Drivable)
Lambda의 구조적 한계를 깨는 핵심 업데이트입니다.

- **최대 1년 실행 워크플로우**
- 함수 실행 중 Pause / Resume 가능
- 대기 시간 동안 **비과금**
- EC2·컨테이너 대비 **최대 90% 비용 절감**

👉 장기 배치, 승인 워크플로우, 이벤트 기반 자동화에 매우 적합

---

### Amazon EKS 관리형 애드온
- ArgoCD, KubeCost 등 인기 오픈소스 도구를
  **AWS 관리형 Add-on**으로 제공
- 클러스터 운영 복잡성 대폭 감소

---

## 3. Database: 초대형 스케일과 비용 통제

### 스토리지 한계 확장
- RDS for Oracle / SQL Server
- 최대 스토리지:
  - 기존 64TB → **256TB**
- 샤딩 없이 단일 인스턴스 운영 가능

---

### 비용 절감 옵션
- **RDS Database Savings Plans**
  - 약정 기반 할인
  - **30~35% 비용 절감**
- **SQL Server Developer Edition**
  - 개발·테스트 환경에서 라이선스 비용 제거

---

### Resource Governor (SQL Server)
- 워크로드별 CPU·메모리·I/O 제한
- 특정 쿼리의 리소스 독점 방지
- 엔터프라이즈 환경 안정성 강화

---

## 4. Storage & Networking: 초대규모 데이터 대응

### Amazon S3 대규모 업데이트
- **단일 객체 크기**
  - 5TB → **500TB**
- **Batch Operations**
  - 최대 **200억 개 객체**
  - 처리 속도 **10배 향상**

👉 미디어 원본, 대규모 백업, 데이터 레이크 운영에 결정적 변화

---

### Networking 주요 개선
- **ALB Target Optimizer**
  - 타겟이 요청을 *끌어오는(Pull)* 방식
  - 리소스 활용률 최대 **25% 향상**
- **Site-to-Site VPN Concentrator**
  - 사이트당 최대 **5Gbps**
  - 멀티 리전·멀티 사이트 VPN 중앙 관리

---

## 5. Security & Governance: 조직 운영 단순화

### AWS Organizations 계정 이동 개선
- 조직 간 **직접 계정 이전** 지원
- M&A, 조직 개편 시 계정 분리·재초대 과정 제거
- 거버넌스 운영 부담 감소

---

## 결론
AWS re:Invent 2025의 코어 인프라 업데이트는  
**더 빠르게, 더 싸게, 더 단순하게**로 요약됩니다.

- Graviton5 → 성능·전력·비용 구조 개선
- Lambda Durable → 서버리스 적용 범위 확장
- S3·DB 확장 → 초대규모 데이터 운영 현실화

스마일게이트 관점에서도  
👉 **기존 워크로드에 어떤 부분을 적용할 수 있을지**  
👉 **ARM 전환, 서버리스 재설계 가능성**을  
전략적으로 검토해볼 시점입니다.
