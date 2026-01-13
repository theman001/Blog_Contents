---
title: "00. AWS 핵심 용어·서비스·역할 정리"
tags: ["aws", "cloud", "infrastructure", "iam", "security"]
author_type: "admin"
date: 2026-01-13
---

## 📌 개요
이 글은 **AWS(Amazon Web Services)** 를 처음 접하거나,  
이미 사용 중이지만 용어가 헷갈리는 운영·보안·인프라 담당자를 위해  
**실무에서 실제로 가장 많이 사용되는 AWS 용어 / 서비스 / 역할**을  
**사용 빈도 기준(상 → 하)** 으로 정리한 문서입니다.

이론 위주가 아닌 **현업 운영 체감 기준**으로 구성되어 있으며,  
AWS 인프라 설계·운영·보안 업무 전반에서 참고용으로 활용할 수 있습니다.

---

## 1️⃣ AWS 기본 개념 (모든 서비스의 공통 기반)

- **Account**  
  AWS 리소스를 소유하는 논리적 단위 (회사·서비스 단위로 분리 권장)

- **Region**  
  AWS 데이터센터가 위치한 물리적 지역 (예: ap-northeast-2)

- **Availability Zone (AZ)**  
  Region 내 독립된 데이터센터 단위  
  장애 대응을 위해 다중 AZ 구성 권장

- **ARN (Amazon Resource Name)**  
  AWS 리소스를 전역적으로 식별하는 고유 식별자

- **Console / CLI / SDK**  
  웹 UI / 명령어 / 코드 기반 관리 방식

---

## 2️⃣ IAM (Identity and Access Management) — 가장 중요

> AWS 보안과 권한 관리의 핵심 영역

- **User**  
  실제 사람 계정 (운영에서는 최소 사용 권장)

- **Group**  
  사용자 권한 묶음

- **Role**  
  서비스·계정·사용자 간 권한 위임용 객체  
  👉 실무에서 가장 많이 사용

- **Policy**  
  JSON 형식의 권한 정의 문서

- **AssumeRole**  
  다른 Role의 권한을 임시로 획득하는 행위

- **STS (Security Token Service)**  
  임시 자격증명 발급 서비스

- **MFA**  
  다중 인증 수단

📌 **실무 체감 중요도**
`Role > Policy > AssumeRole > User > Group > STS > Root`

---

## 3️⃣ EC2 & 컴퓨트 서비스

- **EC2**  
  가상 서버 인스턴스

- **Instance Type**  
  서버 사양 (t3, m5, c6g 등)

- **AMI**  
  EC2 인스턴스 생성용 이미지

- **Key Pair**  
  SSH 접속 인증 키

- **Security Group**  
  인스턴스 단위 가상 방화벽

- **Elastic IP**  
  고정 공인 IP 주소

- **Auto Scaling**  
  트래픽에 따른 서버 자동 증감

---

## 4️⃣ VPC & 네트워크

- **VPC**  
  AWS 내 독립 가상 네트워크

- **Subnet**  
  VPC 내 네트워크 분할 단위

- **Route Table**  
  트래픽 라우팅 규칙 정의

- **Internet Gateway (IGW)**  
  VPC ↔ 인터넷 연결

- **NAT Gateway**  
  내부 리소스의 외부 통신용 게이트웨이

- **NACL**  
  서브넷 단위 방화벽

---

## 5️⃣ 스토리지 서비스

- **S3**  
  객체 스토리지 (가장 많이 사용)

- **Bucket / Object**  
  S3 저장 단위 / 파일

- **Versioning**  
  파일 버전 관리

- **Lifecycle Policy**  
  스토리지 비용 절감 정책

- **EBS**  
  EC2 전용 블록 스토리지

- **Snapshot**  
  EBS 백업 이미지

- **EFS**  
  공유 파일 시스템

---

## 6️⃣ 데이터베이스 (RDS 계열)

- **RDS**  
  관리형 관계형 데이터베이스

- **Aurora**  
  AWS 고성능 DB 엔진

- **Multi-AZ**  
  장애 대응용 이중화 구성

- **Read Replica**  
  읽기 전용 복제본

- **Parameter Group**  
  DB 설정 집합

---

## 7️⃣ 로드밸런싱 & 트래픽 제어

- **ELB**  
  로드밸런서 서비스 총칭

- **ALB**  
  HTTP/HTTPS 기반 로드밸런서

- **NLB**  
  TCP/UDP 기반 고성능 로드밸런서

- **Target Group**  
  트래픽 전달 대상 그룹

- **Health Check**  
  서비스 상태 점검

---

## 8️⃣ 모니터링 & 감사 로그

- **CloudWatch**  
  지표·로그·알람 관리

- **Metric / Alarm**  
  수치 지표 / 경보 설정

- **Log Group**  
  로그 집합 단위

- **EventBridge**  
  이벤트 기반 자동화

- **CloudTrail**  
  AWS API 호출 감사 로그 (보안 필수)

---

## 9️⃣ 보안 서비스

- **KMS**  
  암호화 키 관리

- **Secrets Manager**  
  비밀 정보 관리

- **GuardDuty**  
  위협 탐지 서비스

- **Security Hub**  
  보안 상태 통합 관리

- **WAF**  
  웹 애플리케이션 방화벽

- **Shield**  
  DDoS 방어 서비스

---

## 🔟 비용 관리 & 계정 운영

- **Cost Explorer**  
  비용 분석 도구

- **Budget**  
  비용 초과 알림

- **Savings Plan / Reserved Instance**  
  비용 절감 수단

- **Organizations**  
  다계정 통합 관리

---

## 🎯 실무 기준 AWS 최다 사용 TOP 20

1. IAM Role  
2. IAM Policy  
3. EC2  
4. Security Group  
5. VPC  
6. Subnet  
7. S3  
8. CloudWatch  
9. RDS  
10. Route Table  
11. NAT Gateway  
12. ALB  
13. EBS  
14. Snapshot  
15. CloudTrail  
16. KMS  
17. Lambda  
18. Auto Scaling  
19. Cost Explorer  
20. AssumeRole  

---

## ✍️ 마무리
AWS는 서비스 수가 매우 많지만,  
**실무에서 반복적으로 사용하는 핵심 서비스와 개념은 제한적**입니다.

이 문서는:
- AWS 인프라 운영자
- 보안 담당자
- 클라우드 입문자

모두에게 **빠른 레퍼런스용 정리 문서**로 활용할 수 있습니다.

---
