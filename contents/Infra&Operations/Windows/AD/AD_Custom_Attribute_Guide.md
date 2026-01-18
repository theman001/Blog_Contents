---
title: "01. Active Directory Custom Attribute 추가 방법 정리"
description: 기타 솔루션 제품과의 연동을 위한 AD Custom Attribute 추가
tags: ["active-directory", "schema", "custom-attribute", "ldap"]
author_type: "admin"
date: 2026-01-13
---

## 개요
이 글은 **Active Directory(AD)에 Custom Attribute(사용자 정의 속성)를 추가하는 방법**을 정리한 게시글입니다.  
DRM, NAC, IAM, 내부 인증/권한 시스템 연동 시 **사용자 또는 컴퓨터에 추가 메타데이터를 저장하기 위해** 자주 사용됩니다.

> ⚠️ AD 스키마 변경은 **포리스트 전체에 영향을 주는 작업**이므로 반드시 테스트 환경에서 사전 검증 후 진행해야 합니다.

---

## Custom Attribute란?
- AD 기본 속성 외에 **조직 목적에 맞게 직접 정의하는 속성**
- 예시:
  - `GroupID`
  - `DutyID`
  - `UserGroup_Type`
  - `DeviceClass`
- 사용자(User), 컴퓨터(Computer) 객체 등에 매핑 가능

---

## 사전 준비 사항
- **Schema Admins 그룹 권한**
- 스키마 변경 가능한 DC
- `Active Directory Schema` 콘솔 활성화
- 작업 전 **시스템 상태 백업 권장**

---

## 1️⃣ AD 스키마 관리 콘솔 활성화
기본적으로 스키마 콘솔은 비활성화되어 있으므로 등록이 필요합니다.

1. 관리자 권한 CMD 실행
2. 아래 명령 실행

`
regsvr32 schmmgmt.dll
`

3. `mmc` 실행 → 스냅인 추가/제거
4. **Active Directory Schema** 추가

---

## 2️⃣ Attribute 생성
1. **Active Directory Schema 콘솔 실행**
2. `Attributes` 우클릭 → `Create Attribute`

### 주요 설정 항목
- **Common Name**  
  예: `UserGroup_Type`
- **LDAP Display Name**  
  예: `userGroupType` (소문자 권장)
- **Unique X500 Object ID (OID)**  
  - 조직 고유 OID 사용
  - 예: `1.2.840.113556.1.8000.999999.1`
- **Syntax**
  - String (Unicode) → 가장 일반적
  - Integer, Boolean 등 필요에 따라 선택
- **Single/Multi-valued**
  - 대부분 `Single-valued` 권장

> ⚠️ OID 중복은 심각한 스키마 충돌을 유발할 수 있습니다.

---

## 3️⃣ Object Class에 Attribute 연결
생성한 Attribute는 바로 사용되지 않으며 **Class에 매핑해야 합니다.**

1. `Classes` 이동
2. 대상 클래스 선택
   - 사용자: `user`
   - 컴퓨터: `computer`
3. 속성 → `Attributes` 탭
4. **Optional Attributes**에 Custom Attribute 추가

---

## 4️⃣ ADUC 고급 기능 활성화
1. `dsa.msc` 실행
2. 상단 메뉴 → `보기(View)`
3. **고급 기능(Advanced Features)** 체크

---

## 5️⃣ Attribute 값 입력
1. 사용자 또는 컴퓨터 객체 속성 열기
2. `Attribute Editor` 탭 이동
3. 생성한 Custom Attribute 확인
4. 값 입력

예시 값:
- `ADMIN`
- `FINANCE`
- `EXTERNAL`
- `DEV_TEST`

---

## 6️⃣ PowerShell로 값 설정 (권장)
대량 적용 또는 자동화 시 PowerShell 사용이 효율적입니다.

### 사용자 예시
`
Set-ADUser -Identity user01 -Add @{userGroupType="FINANCE"}
`

### 컴퓨터 예시
`
Set-ADComputer -Identity PC-001 -Add @{deviceClass="SECURE"}
`

---

## 운영 시 주의사항
- 스키마 변경은 **되돌릴 수 없음**
- 명명 규칙 사전 정의 필수
- IAM / NAC / DRM 연동 시 값 변경 정책 명확화
- 멀티밸류 속성은 관리 복잡도 증가

---

## 활용 사례
- DRM 사용자 정책 분기
- NAC 단말 분류
- IAM 권한 매핑
- 내부 시스템 SSO 확장 정보 저장

---

## 결론
AD Custom Attribute는 **조직 맞춤 인증·권한·보안 정책의 핵심 확장 포인트**입니다.  
다만 스키마 변경은 신중해야 하며, 반드시 **명확한 목적과 운영 정책을 수립한 뒤 적용**해야 합니다.
