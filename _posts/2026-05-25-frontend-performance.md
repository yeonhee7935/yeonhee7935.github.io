---
layout: post
title: "번들 사이즈 줄이기: 초기 로딩 속도 개선을 위한 첫걸음"
category: PERFORMANCE
date: 2026-05-25 10:00:00 +0900
readtime: "5 min read"
thumbnail: assets/project-fms.jpg
excerpt: "프로덕션 빌드 경고 해결을 위해 ESLint 정리, 페이지 단위 코드 분할, depcheck를 통한 의존성 다이어트로 번들 크기를 줄이고 Lighthouse 점수를 개선한 기록입니다."
---

프로덕션 배포를 위해 빌드를 진행할 때 번들 사이즈가 너무 크다는 경고 메시지를 마주한 적이 있으신가요? 평소에는 CI/CD 파이프라인에서 빌드 성공 여부만 확인하곤 했지만, 최근 들어 배포 시 빌드 시간이 눈에 띄게 길어지면서 빌드 로그를 직접 분석해 보게 되었습니다.

확인 결과, 메인 번들 파일(`main.js`)의 용량이 기준치를 초과하여 경고가 발생하고 있었습니다. 이를 개선하기 위해 진행했던 **ESLint 규칙 정비, 페이지 단위의 코드 분할, 그리고 사용하지 않는 의존성 삭제** 과정을 정리해 보았습니다.

---

## 1. ESLint 규칙 다시 살리기 (Unused Code 정리)

먼저 가장 쉽고 직관적인 코드 정리부터 시작했습니다. 과거에 자바스크립트 프로젝트를 타입스크립트로 전환할 당시, 컴파일 에러를 빠르게 해결하기 위해 다수의 ESLint 규칙을 `off`로 꺼두었던 것이 원인이었습니다. 꺼두었던 규칙들을 하나씩 다시 활성화하면서 불필요한 코드를 걷어냈습니다.

### ① `@typescript-eslint/ban-types` 해결

컴포넌트에 Props로 아무것도 전달하지 않는 경우, 굳이 빈 객체 타입(`{}`)을 정의하여 사용하는 코드가 다수 존재했습니다. 어차피 사용하지 않는 타입이므로 객체 타입을 삭제하는 방향으로 수정했습니다.

```typescript
// Before
type ComponentProps = {};
const Component: React.FC<ComponentProps> = () => {
  return <div>Component</div>;
};

// After
const Component: React.FC = () => {
  return <div>Component</div>;
};
```

### ② `@no-unused-vars` 규칙 적용

선언해 두고 사용하지 않는 변수들을 제때제때 삭제하여 코드의 군더더기를 없앴습니다.

### ③ `@no-non-null-asserted-optional-chain` 규칙 및 옵셔널 체이닝(`?.`) 적용

중첩된 객체 속성에 안전하게 접근하기 위해 조건문으로 중간 객체의 존재 여부를 일일이 검사하는 대신, 옵셔널 체이닝(`?.`) 문법을 적극 활용했습니다. 이를 통해 중복된 조건문 코드를 줄여 가독성을 높이고 코드 크기를 줄였습니다.

```typescript
// Before
const city =
  user && user.profile && user.profile.address && user.profile.address.city;

// After
const city = user?.profile?.address?.city;
```

이와 같은 ESLint 기반의 코드 정리를 통해 첫 단계에서 약 **13.5 KB**의 용량을 줄일 수 있었습니다.

---

## 2. 페이지 단위 코드 분할 (Code Splitting)

그 다음으로 메인 번들 파일의 용량을 실질적으로 줄이기 위해 **코드 분할(Code Splitting)**을 적용했습니다. 모든 페이지의 코드가 단일 `main.js` 파일에 포함되어 로드되는 대신, 사용자가 특정 페이지에 진입할 때 필요한 자바스크립트만 로드하도록 구조를 변경했습니다.

React의 `lazy`와 `Suspense`를 활용하여 라우터 레벨에서 페이지별 컴포넌트를 청크(Chunk) 단위로 쪼갰습니다.

```typescript
import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';

// 페이지 컴포넌트를 lazy import로 선언
const Page = lazy(() => import('src/pages/Page'));

function App() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <Routes>
        <Route path="/page" element={<Page />} />
      </Routes>
    </Suspense>
  );
}
```

### 💡 구현 중 마주한 이슈와 해결 방법

- **CSS 스타일 적용 문제**: 라우트 구조상 헤더가 공통으로 정의되어 있다 보니, 다른 헤더를 사용하는 페이지로 이동할 때 CSS 스타일이 비정상적으로 적용되는 현상이 발생했습니다.
- **이벤트 타이밍 제어 문제**: 메뉴 닫기 버튼 클릭 시 메뉴 객체의 reference를 `null`로 변경하는 시점과 페이지 이동(Navigation) 시점이 겹쳐 에러가 났습니다. `setTimeout`을 사용해 `null` 대입과 페이지 이동 사이에 0.3초의 시차를 주는 임시 조치를 취했으며, 근본적인 이벤트 호출 흐름에 대해서는 차후 추가 분석을 진행하기로 했습니다.

코드 분할 결과, 최초 로드 시 다운로드받는 `main.js` 파일의 크기가 크게 감소하는 성과를 얻었습니다.

---

## 3. 사용하지 않는 의존성 제거 (depcheck)

프로덕션 빌드 단계, 특히 도커(Docker) 빌드 과정에서 가장 오랜 시간이 걸리는 부분이 바로 의존성 패키지(`npm install`) 설치 단계였습니다. 캐시가 적용되어 있더라도 설치된 의존성 크기 자체가 크다 보니 캐시 검사 조차도 시간이 소요되었습니다.

이에 프로젝트 내에서 실제로 쓰이지 않는 의존성을 찾아 정리하기 위해 `depcheck` 도구를 사용했습니다.

```bash
$ npx depcheck
```

실행 결과, `@fontsource/public-sans`, `@fortawesome/react-fontawesome`, `jquery`, `moment`, `bootstrap` 등 소스 코드 내부에서 더 이상 직접 사용하지 않는 많은 패키지가 나열되었습니다. 이 중 시스템이나 플러그인 레벨에서 간접적으로 활용 중인 패키지가 있는지 주의하여 검토한 뒤, 약 10여 개의 사용하지 않는 라이브러리를 `package.json`에서 제거했습니다.

### 트리 쉐이킹(Tree Shaking) 결과

흥미로운 점은 안 쓰는 의존성 패키지들을 지운 뒤 다시 빌드했을 때, 결과물인 번들 파일의 전체 용량은 오히려 50바이트 정도 늘어나는 현상을 보였습니다.
이를 통해 빌드 도구(Create React App)가 실제로 임포트하여 사용하지 않는 모듈은 빌드 시점에 자동으로 포함하지 않는 **트리 쉐이킹(Tree Shaking)**을 정상적으로 수행하고 있음을 직접 확인할 수 있었습니다.
비록 번들 파일 크기 자체에는 큰 변화가 없었으나, 불필요한 패키지를 정리함으로써 빌드 타임의 라이브러리 설치 시간을 단축하고 프로젝트 구조를 한결 가볍게 유지할 수 있게 되었습니다.

---

## 4. 정적 에셋 최적화

자바스크립트 번들 파일 외에도, 실제 화면 렌더링 속도(LCP)를 저해하는 정적 에셋들 역시 최적화 대상이었습니다. 이 작업은 Webpack의 번들 크기 경고를 해결하는 것과는 직접적인 관련이 없지만, 네트워크 대역폭을 절약하고 초기 로딩 완료 속도를 높이기 위해 함께 진행했습니다.

### ① 폰트 확장자 변경 (WOFF2)

기존의 무거운 폰트 포맷 대신 압축률이 높은 WOFF2 포맷으로 폰트 파일을 교체하여 글꼴 파일이 로드될 때 발생하는 네트워크 전송 비용을 낮췄습니다.

### ② 이미지 포맷 변경 (WebP) 및 미사용 이미지 삭제

기존의 무거운 PNG, JPEG 이미지 파일들을 압축률이 높은 **WebP** 포맷으로 일괄 변환하여 리소스 용량을 크게 축소했습니다. 또한, 서비스 개편 과정에서 더 이상 화면에 노출되지 않지만 리소스 폴더에 방치되어 있던 미사용 이미지들을 추적하여 삭제함으로써 프로젝트 빌드 및 배포 패키지의 용량 자체를 한결 가볍게 다듬었습니다.

---

## 5. 최종 개선 결과

최적화 작업을 마친 후, 네트워크 로딩 용량과 Lighthouse 성능 점수에서 유의미한 변화를 확인할 수 있었습니다.

- **네트워크 자바스크립트 용량**:
  - **기존**: `main.js` (3.4 MB)
  - **개선 후**: `main.js` (696 KB) 및 페이지별 분할 청크 로드 방식으로 전환
- **Lighthouse 성능 점수**: 75점 $\rightarrow$ **94점**
- **최대 콘텐츠풀 페인트 (LCP)**: 3.8초 $\rightarrow$ **1.6초**
- **총 차단 시간 (TBT)**: 60ms $\rightarrow$ **0ms**
