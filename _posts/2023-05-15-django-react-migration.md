---
layout: post
title: "Django Template에서 React/TypeScript로의 점진적 마이그레이션 전략"
category: ARCHITECTURE
date: 2023-05-15 10:00:00 +0900
readtime: "6 min read"
thumbnail: assets/project-fms.jpg
excerpt: "기존 Django MTV 레거시 시스템을 React와 TypeScript 구조로 점진적 전환하여 개발 복잡성을 개선한 과정에 대해 알아보자"
---

안녕하세요! 오늘은 오토노미 스튜디오 프로젝트를 진행하며, 기존 Django MTV(Model-Template-View) 기반 레거시 시스템을 React와 TypeScript 구조로 안전하게 전환했던 과정을 소개하려합니다.

오토노미 스튜디오는 자율주행 차량 제어, 시뮬레이션 테스트, 디버깅 등 여러 화면에 파편화되어 있던 운영 도구들을 단일 웹 플랫폼으로 통합해 관리하는 운영 시스템입니다.

처음에는 단순한 데이터를 입력하고 조회하는 수준의 운영 도구였습니다. 하지만 차량의 주행 제어 상태와 여러 자율주행 모듈의 연결 정보를 실시간으로 화면에 동기화해야 하는 기능이 추가되면서 시스템의 복잡도가 증가했습니다. 여러 화면 요소가 하나의 데이터를 공유하며 실시간으로 반응해야 했으나, 기존의 Django 템플릿과 jQuery 구조만으로는 화면 갱신과 데이터 일관성을 제어하기에 한계가 있었습니다. 이를 해결하기 위해 UI 환경을 독립적인 React와 TypeScript로 분리하여 재구축하기로 결정했습니다.

---

## 1. 배경: Django Template의 한계와 마이그레이션 동기

기존 시스템은 Django의 서버 사이드 템플릿 엔진 구조로 설계되었습니다. 그러나 다음과 같은 복잡한 요구사항들이 누적되면서 한계에 직면했습니다.

- **실시간 차량 제어 데이터 모니터링**: 차량 제어 상태 및 모듈 전송 데이터를 실시간으로 모니터링해야 하는 요구사항이 늘어났습니다.
- **화면 간 상태 동기화 한계**: 차량 상태 요약창이나 세부 제어 패널 등의 화면 컴포넌트들이 실시간으로 수신되는 제어 데이터를 일치시켜야 했으나, jQuery 기반의 DOM 직접 조작 방식으로는 데이터 흐름을 명확하게 제어하기 어려웠고 상태 관리의 복잡성도 급격히 상승했습니다.
- **강한 결합도**: UI 코드와 비즈니스 로직이 밀접하게 결합되어 있어 코드 수정 영향 범위가 컸습니다.

---

## 2. 점진적 마이그레이션 아키텍처 및 화면별 개발 전략

서비스 전체를 한 번에 전환하는 대신, 개발 범위와 리스크를 분산하기 위해 화면 단위로 전환 대상을 분할하여 개발을 진행했습니다.

### ① 화면별 독립 테스트 및 점진적 이식

화면을 React 컴포넌트로 재설계함과 동시에, 이에 대응하는 백엔드 API는 Django REST Framework(DRF)를 활용해 REST API 뷰를 작성했습니다. 각 페이지마다 프론트엔드 컴포넌트와 백엔드 API를 독립적으로 개발하고 테스트하여 기능을 검증하는 과정을 거쳤으며, 최종 릴리즈 시점에 검증이 완료된 모듈들을 한번에 통합하여 배포를 완료했습니다.

### ② Django Template 내 React 마운트

기존 Django의 HTML 안에서 특정 div 요소를 마운트 대상으로 삼아 React 앱을 로드할 수 있도록 번들 스크립트를 연결했습니다.

{% raw %}

```html
<!-- dashboard.html -->
{% extends "base.html" %} {% load static %} {% block content %}
<div class="dashboard-container">
  <h2>실시간 차량 관제 대시보드</h2>
</div>

<!-- React 앱 마운트 대상 -->
<div id="react-dashboard-root"></div>

<!-- 빌드된 번들 스크립트 로드 -->
<script src="{% static 'dist/dashboard.bundle.js' %}"></script>
{% endblock %}
```

{% endraw %}

```typescript
// dashboard/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import DashboardApp from './DashboardApp';

const container = document.getElementById('react-dashboard-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <DashboardApp />
    </React.StrictMode>
  );
}
```

---

## 3. 세부 전환 및 조율 과정

### ① Simple JWT 기반 토큰 인증 전환

기존의 Django 세션/쿠키 기반 인증 방식에서 Django REST Framework의 Simple JWT를 활용한 JWT 토큰 인증 체계로 전환했습니다. 로그인 성공 후 발급받은 토큰 데이터를 브라우저의 로컬 스토리지(LocalStorage)에 저장하고, 모든 Axios 요청 헤더에 Authorization: Bearer <Token> 형태의 인증 정보를 주입하도록 인터셉터를 설계했습니다.

```typescript
// api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 4. 결과

서비스 전체를 한 번에 교체하지 않고 화면 단위로 전환한 덕분에 기존 기능에 영향을 최소화하면서 마이그레이션을 진행할 수 있었습니다.

또한 React와 TypeScript + DRF 구조로 분리하면서 UI와 비즈니스 로직의 경계가 명확해졌고, 실시간 데이터 처리 과정에서도 상태 흐름을 이전보다 쉽게 추적할 수 있게 되었습니다.
