---
layout: post
title: "소켓(Socket.io)으로 구현한 자율주행 모듈의 실시간 상태 관제"
category: ARCHITECTURE
date: 2026-06-12 09:00:00 +0900
readtime: "5 min read"
thumbnail: assets/project-fms.jpg
excerpt: "기존의 주기적 데이터베이스 조회(Polling) 방식을 웹소켓(Socket.io) 기반의 실시간 통신으로 전환하여, 데이터베이스 과부하를 해소하고 화면 동기화 지연 시간을 기존 2초에서 0.5초로 단축한 과정을 다룹니다."
---

저희 팀은 자율주행 개발 차량에 탑재된 소프트웨어 모듈들의 상태를 실시간으로 브라우저에 표시하는 시스템을 구축했습니다. 기존의 주기적 데이터베이스 조회(Polling) 방식을 웹소켓(Socket.io) 기반의 실시간 통신으로 전환하여, 데이터베이스 과부하를 해소하고 화면 동기화 지연 시간을 기존 2초에서 0.5초로 단축했습니다. 이 과정에서 겪은 아키텍처 고민과 데이터베이스 부하 최적화 노하우를 공유합니다.

---

## 1. 배경: 자율주행 모듈과 원격 모니터링

실험용 차량에 설치되는 자율주행 소프트웨어는 기능별로 독립적인 도커(Docker) 컨테이너 단위로 실행됩니다. 경로를 계획하는 플래닝 모듈이나 차량 제어를 담당하는 컨트롤 모듈 등이 각각 가상 환경에서 개별적으로 작동하는 구조입니다.

이 모듈들이 실제로 움직이고 있는지 원격지에서 확인하기 위해 웹 브라우저 기반의 모니터링 화면을 개발했습니다. 화면의 정보 지연이 발생하면 오퍼레이터가 현재 차량의 상세 상태를 즉각 파악하기 어려워 모니터링의 신뢰도가 떨어지기 때문에, 실시간성을 확보하는 것이 최우선 과제였습니다.

---

## 2. 문제: 주기적 조회의 한계와 데이터베이스 부하

초기에는 구현이 단순한 요청-응답(HTTP API) 구조를 사용했습니다. 차량 내부 프로그램이 모듈 상태를 서버에 전송해 데이터베이스에 저장하면, 웹 브라우저가 주기적으로 데이터베이스를 호출(Polling)하여 화면을 갱신하는 방식이었습니다. 

이러한 데이터베이스 경유 방식은 크게 두 가지 문제를 일으켰습니다.

첫째는 **데이터베이스의 물리적 부하**였습니다. 관제 화면을 실행하는 브라우저와 차량의 수가 늘어날수록 데이터베이스에 저장 쿼리와 조회 쿼리가 기하급수적으로 몰렸습니다. 이로 인해 데이터베이스 락(DB Lock)이 빈번하게 발생하여 모듈 상태 조회 외에 다른 API 요청들까지 대기 상태에 빠지는 현상으로 이어졌습니다.

둘째는 **화면의 동기화 지연**이었습니다. 웹 브라우저가 일정 주기마다 새 정보를 물어보는 구조이다 보니, 실제 차량에서 상태 변화가 일어난 뒤에 브라우저가 다음 주기에 이를 가져오기까지 지연 시간이 발생할 수밖에 없었습니다.

---

<div class="blog-callout-placeholder">
  <div class="blog-callout-header">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="callout-icon">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>
    <span>아키텍처 흐름도 1: 기존 Polling 방식 데이터 흐름 및 병목 지점</span>
  </div>
  <div class="blog-callout-body">
    <div class="sleek-diagram-container">
      <div class="diagram-flow">
        <div class="flow-node">
          <span class="node-title">차량 클라이언트</span>
          <span class="node-subtitle">Docker 모듈</span>
        </div>
        <div class="flow-arrow flow-arrow-accent">&rarr;</div>
        <div class="flow-node highlight-error">
          <span class="node-title">API 서버</span>
          <span class="node-subtitle">서버 병목</span>
        </div>
        <div class="flow-arrow flow-arrow-accent">&rarr;</div>
        <div class="flow-node db-node highlight-error">
          <span class="node-title">데이터베이스</span>
          <span class="node-subtitle">DB Lock 발생</span>
        </div>
      </div>
      <div class="diagram-flow polling-flow" style="margin-top: 16px;">
        <div class="flow-node browser-node">
          <span class="node-title">웹 브라우저</span>
          <span class="node-subtitle">모니터링 화면</span>
        </div>
        <div class="flow-arrow arrow-reversed">&larr;</div>
        <div class="flow-node db-node highlight-error">
          <span class="node-title">데이터베이스</span>
          <span class="node-subtitle">부하 집중</span>
        </div>
      </div>
    </div>
    <p class="diagram-caption">그림 1: 기존 Polling 통신 아키텍처. 기기 상태가 변할 때마다 매번 DB 쓰기/읽기 락이 중첩되는 구조적 병목이 존재합니다.</p>
  </div>
</div>

---

## 3. 해결을 위한 대안 검토: Redis vs SSE vs Socket.io

데이터베이스 부하를 줄이기 위해 여러 대안 기술을 검토했습니다. 각 기술의 특징과 프로젝트 목적에 따른 적합도는 다음과 같습니다.

| 대안 기술 | 통신 방식 | 실시간성 | 프로젝트 적합도 및 한계 |
| :--- | :--- | :--- | :--- |
| **Redis (캐싱)** | 단방향 조회 (Polling) | 낮음 (조회 주기에 의존) | 데이터베이스 쿼리 부하는 줄일 수 있으나, 브라우저의 반복적인 요청과 화면 지연은 해결되지 않음. |
| **SSE (Server-Sent Events)** | 단방향 푸시 (서버 &rarr; 브라우저) | 높음 (실시간 수신) | 차량 상태를 수신하는 것은 가능하지만, 오퍼레이터가 브라우저에서 차량으로 제어 명령을 보낼 수 없음. |
| **Socket.io (선택)** | 양방향 소켓 (서버 &leftrightarrow; 브라우저) | 매우 높음 (양방향 즉시 전송) | 실시간 모니터링과 원격 제어 명령 송신을 모두 수용하며, 무선 연결이 끊겨도 자동으로 복구됨. |

따라서 데이터베이스 부하를 없애고 안정적인 실시간 양방향 통로를 확보하기 위해 최종적으로 웹소켓(Socket.io)을 선택했습니다.

---

## 4. 해결: 웹소켓과 방(Room) 구조 도입

웹소켓 서버를 허브로 삼아 차량 클라이언트와 브라우저가 데이터베이스를 거치지 않고 직접 데이터를 송수신하도록 설계했습니다.

<div class="blog-callout-placeholder">
  <div class="blog-callout-header">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="callout-icon">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>
    <span>아키텍처 흐름도 2: 개선 후 WebSocket 실시간 아키텍처</span>
  </div>
  <div class="blog-callout-body">
    <div class="sleek-diagram-container">
      <div class="diagram-flow">
        <div class="flow-node">
          <span class="node-title">차량 클라이언트</span>
          <span class="node-subtitle">Docker 모듈</span>
        </div>
        <div class="flow-arrow flow-arrow-success">&rarr;</div>
        <div class="flow-node websocket-node">
          <span class="node-title">Socket.io 서버</span>
          <span class="node-subtitle">지정된 Room</span>
        </div>
        <div class="flow-arrow flow-arrow-success">&rarr;</div>
        <div class="flow-node browser-node">
          <span class="node-title">웹 브라우저</span>
          <span class="node-subtitle">모니터링 화면</span>
        </div>
      </div>
    </div>
    <p class="diagram-caption">그림 2: 개선된 실시간 아키텍처. 데이터베이스 거치지 않고 소켓 Room을 통해 변경 사항이 즉시 화면에 갱신됩니다.</p>
  </div>
</div>

새로 변경된 아키텍처는 통신 흐름을 한 차례 더 단순화했습니다. 먼저 차량 내 클라이언트 프로그램과 브라우저가 소켓 서버 내에 지정된 고유의 **'소켓 방(Room)'**에 접속하도록 설계했습니다. 이후 도커 컨테이너의 상태 변화가 일어날 때마다 클라이언트 프로그램은 소켓 서버의 해당 방으로 데이터를 직접 송신합니다. 방에 대기하고 있던 브라우저는 즉시 소켓 이벤트를 캐치하여 전송된 데이터를 그대로 수신해 화면을 갱신합니다.

이러한 개선 과정을 통해 기존에 데이터베이스가 처리해야 했던 대량의 읽기 및 쓰기 쿼리를 완전히 제거할 수 있었습니다. 또한 무선 통신 환경의 불안정성으로 인한 끊김 현상은 Socket.io의 자동 재연결 규칙을 통해 복구되도록 세부 설정을 조율했습니다.

---

## 5. 마치며

이처럼 웹소켓 기반의 실시간 통신 환경을 구축하면서 서버의 운영 안정성 확보와 초저지연 모니터링을 실현할 수 있었습니다. 화면을 갱신할 때마다 데이터베이스를 거치던 불필요한 조회 동작을 생략함으로써 데이터베이스의 CPU 부하와 락(Lock) 발생률을 해소했습니다. 

동시에 기기의 상태 변화가 브라우저에 도달하는 지연 시간이 기존 2초에서 0.5초 이내로 대폭 줄어들어, 오퍼레이터가 실시간에 가깝게 차량 상황을 확인하고 대처할 수 있게 되었습니다. 또한 이동 과정에서 수시로 끊기던 무선 신호의 불안정성 역시 소켓의 자동 재연결 설정을 정교하게 조율하여, 수동으로 새로고침을 하지 않아도 통신이 즉시 복구되는 사용성을 확보했습니다.

이 프로젝트를 진행하면서 데이터베이스 부하의 근본적인 원인을 잡으려면 조회 주기(Polling) 방식 자체를 걷어내고 데이터가 발생할 때만 밀어주는 **이벤트 기반의 실시간 전송(Push)**으로 전환해야 함을 배웠습니다. 또한, 단순한 저장소 병목을 줄여주는 Redis에 비해 화면의 시차와 통신 요청 횟수를 원천적으로 줄이기 위해서는 **웹소켓(Socket.io)과 같은 연결형 통신 모델**이 적합했습니다. 제어 명령 송신과 차량 상태 수신이 모두 빈번하게 교차하는 양방향 관제 환경에서 웹소켓은 안정적인 서비스를 구현하기 위한 핵심적인 선택이었습니다.
