---
layout: post
title: "충전 트레일러 절차 다변화에 대응하는 API 규약 기반 FE 아키텍처 개편"
categories: [frontend]
date: 2025-05-05 10:00:00 +0900
readtime: "6 min read"
thumbnail: assets/project-fms.jpg
excerpt: "자율/원격/수동 주행 방식 및 충전사별로 복잡해지는 화면 분기 로직을 백엔드와의 API 인덱스 규약 제안으로 깔끔하게 디커플링한 경험을 공유합니다."
---

프로젝트를 진행하며 화면 기획서에 "이 상태일 때는 이 버튼이 노출되고 클릭 시 이 동작을 해야 한다"와 같은 비즈니스 조건이 계속 늘어나다 보면, 프론트엔드 코드 내부는 이를 제어하기 위한 복잡한 Boolean 플래그와 조건문으로 뒤덮이기 쉽습니다.

특히 **전기차 충전용 트레일러 관제 시스템**을 개발할 당시 이 문제가 가장 심각했습니다. 관제 화면의 대상 트레일러가 **자율주행**, **원격주행**, **수동주행**인지에 따라 거쳐야 하는 절차가 제각각이었고, 연동된 **충전기**의 통신 규격에 따라서도 오퍼레이터가 수행해야 하는 액션의 종류와 버튼 명칭이 달랐기 때문입니다.

처음에는 단순한 if-else 조건문으로 프론트엔드에서 이를 처리하려 했지만, 규격이 늘어날 때마다 컴포넌트 코드가 비대해지고 버그가 급증했습니다. 이를 극복하기 위해 **백엔드 팀에 상태 및 액션 인덱스 규약을 제안**하여 프론트엔드의 비즈니스 로직 의존성을 완전히 제거한 경험을 소개합니다.

---

### 문제 상황: 주행 방식과 충전사에 따른 렌더링/액션 파편화

관제 화면의 각 트레일러 카드에는 현재 상태에 따라 오퍼레이터가 눌러야 하는 액션 버튼들이 노출되어야 했습니다. 문제는 트레일러의 주행 방식과 충전기 규격에 따라 거쳐야 하는 작업 흐름(Workflow)이 완전히 달랐습니다.

- **자율주행 트레일러 + A 충전사**: `대기` &rarr; `자율주행 출발` &rarr; `자동 커넥터 연결` &rarr; `충전 시작`
- **수동주행 트레일러 + B 충전사**: `대기` &rarr; `오퍼레이터 수동 이동` &rarr; `충전사 회원 인증` &rarr; `충전 시작`
- **원격주행 트레일러 + C 충전사**: `대기` &rarr; `원격 제어 터널 연결` &rarr; `원격 주행` &rarr; `충전 시작`

이러한 조건들을 화면 컴포넌트 내부에 단순 조건문으로 녹여내려 하자 다음과 같은 스파게티 코드가 작성되기 시작했습니다.

```javascript
// 🍝 주행 방식과 충전사가 늘어날수록 UI 컴포넌트가 비대해지는 위험한 구조
function TrailerActionButtons({ trailer, cpoType, driveType }) {
  const { status } = trailer;

  const handleAction = (actionType) => {
    if (driveType === "AUTONOMOUS" && cpoType === "A_CPO") {
      if (status === "PENDING") callAutoDriveStartApi();
      else if (status === "ARRIVED") callAutoConnectApi();
    } else if (driveType === "MANUAL" && cpoType === "B_CPO") {
      if (status === "PENDING") callManualMoveConfirmApi();
      else if (status === "ARRIVED") callCpoAuthApi();
    }
    // ... 주행 방식과 충전기가 늘어날 때마다 수십 줄의 조건문 추가
  };

  return (
    <div className="button-group">
      {driveType === "AUTONOMOUS" && status === "PENDING" && (
        <button onClick={() => handleAction("AUTO_START")}>
          자율주행 출발
        </button>
      )}
      {driveType === "MANUAL" && status === "PENDING" && (
        <button onClick={() => handleAction("MANUAL_CONFIRM")}>
          수동 이동 완료
        </button>
      )}
    </div>
  );
}
```

지원하는 트레일러 주행 모드나 충전기가 늘어날 때마다 프론트엔드 개발자가 매번 컴포넌트 안쪽의 복잡한 중첩 조건문을 고쳐야 했고, 엉뚱한 주행 모드에서 잘못된 버튼이 렌더링되는 버그로 이어졌습니다.

---

### 해결책: 백엔드 API 인덱스 플래그 규약 제안

이 문제를 근본적으로 해결하기 위해, 프론트엔드가 트레일러의 세부 비즈니스 로직(주행방식, 충전기 종류)을 알 필요가 없도록 백엔드 팀에 "상태 및 액션 인덱스 플래그 인터페이스"를 제안했습니다.

#### 💡 제안한 API 인터페이스 구조

백엔드가 현재 트레일러의 상태 정보와 함께 **"수행 가능한 액션 식별 인덱스(actionIndex)"** 및 **"활성화 여부(enabled: 0/1)"** 플래그 배열을 프론트엔드에 전달하도록 규약을 정하였습니다.

```json
{
  "trailerId": "TR_104",
  "currentState": "MOVING",
  "currentStateName": "이동 중",
  "availableActions": [
    { "actionIndex": 1, "enabled": 1 },
    { "actionIndex": 2, "enabled": 0 }
  ]
}
```

---

### 리팩토링 후 프론트엔드 코드: 인덱스 기반 UI 매핑 (ACTION_UI_MAP)

프론트엔드 컴포넌트는 더 이상 주행 방식이나 충전사의 종류에 따른 복잡한 `if-else` 분기문을 가지지 않습니다.

대신 **인덱스별 UI 속성 매핑 딕셔너리(`ACTION_UI_MAP`)**를 관리하여, 백엔드가 내려준 `actionIndex`에 맞게 라벨과 버튼 스타일을 매칭시켜 출력하고, 클릭 시 해당 `actionIndex`를 백엔드로 전달하는 단순한 구조가 되었습니다.

```tsx
// 🟢 프론트엔드가 관리하는 액션 인덱스별 UI 매핑 객체(예시)
const ACTION_UI_MAP: Record<
  number,
  { label: string; variant: "primary" | "secondary" }
> = {
  1: { label: "자율주행 출발", variant: "primary" },
  2: { label: "수동 이동 완료", variant: "secondary" },
  3: { label: "충전사 회원 인증", variant: "primary" },
  4: { label: "원격 제어 연결", variant: "primary" },
};

interface ActionItem {
  actionIndex: number;
  enabled: number;
}

interface Props {
  trailerId: string;
  availableActions: ActionItem[];
  onExecuteAction: (trailerId: string, actionIndex: number) => void;
}

export function TrailerActionButtons({
  trailerId,
  availableActions,
  onExecuteAction,
}: Props) {
  return (
    <div className="action-buttons-group">
      {availableActions.map(({ actionIndex, enabled }) => {
        // 인덱스에 해당하는 UI 정보 매핑
        const uiConfig = ACTION_UI_MAP[actionIndex] || {
          label: "알 수 없는 액션",
          variant: "secondary",
        };

        return (
          <button
            key={actionIndex}
            disabled={enabled === 0}
            className={`btn-${uiConfig.variant}`}
            onClick={() => onExecuteAction(trailerId, actionIndex)}
          >
            {uiConfig.label}
          </button>
        );
      })}
    </div>
  );
}
```

#### 액션 실행 핸들러 (Index 전달)

```typescript
// 유저가 버튼을 누르면 인덱스만 백엔드로 전송
const handleExecuteAction = async (trailerId: string, actionIndex: number) => {
  try {
    await api.post(`/api/trailers/${trailerId}/action`, { actionIndex });
    toast.success("명령이 성공적으로 전달되었습니다.");
  } catch (error) {
    toast.error("명령 수행에 실패했습니다.");
  }
};
```

---

### 성과 및 배운 점

1. **복잡한 비즈니스 조건문 100% 제거**: UI 컴포넌트 내부의 중첩된 `if-else` 분기문을 전면 제거하고, 단순 $O(1)$ 인덱스 UI 매핑 딕셔너리(`ACTION_UI_MAP`) 구조로 정돈했습니다.
2. **유지보수성 및 확장성 향상**: 신규 주행 방식이나 액션이 추가되어도 컴포넌트의 렌더링/이벤트 로직을 고칠 필요 없이 `ACTION_UI_MAP`에 인덱스 키와 라벨만 추가해 주면 즉시 대응 가능한 정갈한 구조를 확립했습니다.
3. **주도적인 백엔드 협업 경험**: 프론트엔드 개발자가 단순 화면 구현을 넘어, API 데이터 인터페이스 구조를 선제 제안하여 전체 아키텍처의 생산성을 높일 수 있음을 배운 귀중한 경험이었습니다.
