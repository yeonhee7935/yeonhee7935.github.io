---
layout: post
title: "웹 브라우저로 실시간 통신하기: WebRTC의 핵심 개념과 동작 원리"
category: WEB
date: 2026-06-12 10:00:00 +0900
readtime: "6 min read"
thumbnail: assets/project-webrtc.png
excerpt: "별도의 플러그인 없이 웹 브라우저 간에 오디오, 비디오, 데이터를 실시간으로 전송할 수 있는 WebRTC 기술의 3대 핵심 API와 시그널링, 그리고 NAT 홀펀칭(STUN/TURN) 메커니즘을 친숙한 비유로 알기 쉽게 정리합니다."
---

 오늘은 웹 브라우저에서 플러그인이나 추가 프로그램 설치 없이도 오디오, 비디오, 데이터를 실시간으로 주고받을 수 있게 해주는 오픈소스 기술, **WebRTC(Web Real-Time Communication)**에 대해 알아보겠습니다.

줌(Zoom)이나 디스코드(Discord) 같은 웹 버전 화상회의 서비스부터 웹 기반 원격 제어 솔루션까지, 실시간 초저지연 통신이 필요한 곳이라면 어디든 WebRTC가 핵심 역할을 맡고 있습니다. WebRTC를 처음 접하는 분들을 위해 기술의 핵심 개념과 동작 원리를 쉽고 명확하게 정리해 드립니다.

---

## 1. WebRTC란? 핵심은 P2P(Peer-to-Peer)

일반적인 웹 통신(HTTP)은 브라우저(클라이언트)가 서버에 요청을 보내고, 서버가 이에 응답하는 구조입니다. 하지만 화상 통화처럼 매초 수십 프레임의 대용량 비디오 데이터를 주고받을 때 모든 트래픽이 서버를 거치게 된다면 어떻게 될까요? 서버의 대역폭 비용이 감당하기 힘들 정도로 늘어나고, 서버를 거치는 과정에서 화면과 소리에 지연(Latency)이 발생할 수밖에 없습니다.

WebRTC는 이러한 병목을 해결하기 위해 **P2P(Peer-to-Peer) 통신** 모델을 채택했습니다. 초기에 연결 통로만 개설하고 나면 브라우저(Peer A)와 브라우저(Peer B)가 **서버를 중간에 거치지 않고 서로에게 직접 데이터를 쏘아 보내는 방식**입니다.

이 덕분에 WebRTC는 일반 웹 통신에 비해 훨씬 짧은 지연 시간(보통 0.1~0.3초 이내)으로 초저지연 실시간 통신을 실현할 수 있습니다.

### 내가 WebRTC를 도입했던 이유: 차량 모빌리티 원격 제어

제가 WebRTC를 기술 스택에 검토하고 적극 도입했던 실제 개발 배경도 이와 맞닿아 있습니다. 당시 프로젝트에서는 클라이언트 사이드의 차량 모빌리티에서 촬영되는 카메라 비디오를 다른 망에 위치한 오퍼레이터 브라우저로 실시간 전송하여 모니터링하고, 동시에 브라우저에서의 마우스 조작과 키보드 제어 명령을 차량 클라이언트로 보내서 원격 데스크톱처럼 조종을 수행해야 하는 기능을 개발해야 했습니다.

이때 차량에서 발생하는 고용량 비디오 데이터를 일반적인 비디오 스트리밍 방식처럼 서버를 경유하여 브라우저에 전달하는 구조를 검토하기도 했습니다. 하지만 이 방식은 비디오를 서버로 전송하고, 서버가 다시 브라우저로 중계하는 다단계 홉(Hop)을 거치면서 실시간 제어가 불가능할 수준의 큰 네트워크 지연(Latency)이 야기되었습니다.

원격 제어 환경에서 실시간성은 곧 안전 및 조작의 감각과 직결되기에, 양방향 초저지연 통신이 가능하고 서버의 비디오 중계 부하를 없애고 직접 피어 간에 연결 통로를 열어줄 수 있는 WebRTC를 자연스럽게 연구하고 도입하게 되었습니다.

---

## 2. WebRTC를 구성하는 3대 핵심 API

웹 브라우저에서 WebRTC를 다룰 때 프론트엔드 개발자가 주로 마주하는 핵심 웹 API는 크게 3가지로 분류됩니다.

### ① MediaStream (getUserMedia)
사용자의 카메라, 마이크 등 하드웨어 장치에 접근하여 오디오 및 비디오 <span class="glossary-term" data-term="Stream">스트림(Stream)</span>을 획득하는 인터페이스입니다. 이를 통해 획득한 미디어 트랙들은 P2P 연결을 통해 상대 브라우저로 전달됩니다.

### ② RTCPeerConnection
WebRTC 기술의 핵심 아키텍처로서 브라우저 간 P2P 연결을 생성하고 유지하며 모니터링하는 인터페이스입니다. 오디오/비디오 미디어 스트림을 효율적으로 인코딩 및 디코딩하고, 네트워크 패킷 손실 시 복구하는 복잡한 최적화 작업을 브라우저 자체 엔진이 백그라운드에서 자동으로 처리하도록 돕습니다.

### ③ RTCDataChannel
비디오/오디오 미디어 데이터 외에, 일반적인 텍스트, 바이너리 파일 등을 P2P 연결을 통해 양방향으로 직접 주고받을 수 있는 통로입니다. 매우 빠르고 지연 시간이 적기 때문에 원격 제어 기기의 마우스 클릭/키보드 입력 이벤트 송수신이나 실시간 멀티플레이어 게임의 패킷 전송에 핵심적으로 활용됩니다.

---

## 3. P2P 연결은 어떻게 만들어질까? NAT와 방화벽 넘기

서버 없이 직접 브라우저끼리 통신하는 개념은 훌륭하지만, 현실 인터넷 환경에서는 큰 장벽이 존재합니다. 바로 <span class="glossary-term" data-term="NAT">NAT</span>와 <span class="glossary-term" data-term="Firewall">방화벽</span>입니다.

대부분의 개인용 컴퓨터와 스마트폰은 공유기 아래에 있어 사설 IP를 가집니다. 상대방 브라우저는 나의 사설 IP로 직접 패킷을 보낼 수 없기 때문에, 우리는 상대방이 찾아올 수 있는 공인 IP 주소와 포트 번호를 알아내야 합니다. 이 과정을 **NAT 트래버스(Traversing) 또는 홀펀칭(Hole Punching)**이라고 부르며, 이를 위해 STUN과 TURN 서버가 활약합니다.

<div class="blog-callout-placeholder">
  <div class="blog-callout-header">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="callout-icon">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>
    <span>WebRTC 연결 아키텍처: 시그널링과 NAT 트래버스 통신 흐름</span>
  </div>
  <div class="blog-callout-body">
    <div class="sleek-diagram-container">
      <div class="diagram-flow">
        <div class="flow-node">
          <span class="node-title">Peer A (브라우저)</span>
          <span class="node-subtitle">사설 IP 주소</span>
        </div>
        <div class="flow-arrow" style="color: #3182f6;">&leftrightarrow;</div>
        <div class="flow-node" style="background-color: rgba(49, 130, 246, 0.05); border-color: #3182f6;">
          <span class="node-title">시그널링 서버</span>
          <span class="node-subtitle">SDP/ICE 교환 중개</span>
        </div>
        <div class="flow-arrow" style="color: #3182f6;">&leftrightarrow;</div>
        <div class="flow-node">
          <span class="node-title">Peer B (브라우저)</span>
          <span class="node-subtitle">사설 IP 주소</span>
        </div>
      </div>
      <div class="diagram-flow" style="margin-top: 16px;">
        <div class="flow-node" style="background-color: #f5f5f7;">
          <span class="node-title">STUN / TURN 서버</span>
          <span class="node-subtitle">공인 IP 조회 & 릴레이</span>
        </div>
      </div>
      <div class="diagram-flow" style="margin-top: 16px; border-top: 1.5px dashed #3182f6; padding-top: 16px; width: 100%;">
        <div class="flow-node" style="background-color: rgba(49, 130, 246, 0.1); border-color: #3182f6;">
          <span class="node-title">Peer A</span>
        </div>
        <div class="flow-arrow" style="color: #3182f6; font-weight: bold;">====== ( P2P Direct Connection / RTCDataChannel ) ======</div>
        <div class="flow-node" style="background-color: rgba(49, 130, 246, 0.1); border-color: #3182f6;">
          <span class="node-title">Peer B</span>
        </div>
      </div>
    </div>
    <p class="diagram-caption">그림 1: WebRTC 통신 초기 구조. 시그널링 서버를 통해 연결 정보(SDP)를 교환한 후, 최종적으로 직접(P2P) 초저지연 통신 경로를 엽니다.</p>
  </div>
</div>

### STUN (Session Traversal Utilities for NAT)
<span class="glossary-term" data-term="STUN">STUN</span> 서버는 사설 IP 주소를 가진 기기가 자신의 네트워크 외부 공인 IP 주소와 통신 포트 번호를 식별할 수 있도록 돕는 도구입니다. 브라우저가 STUN 서버에 요청 패킷을 보내면 서버는 해당 패킷이 거쳐간 공인 IP와 포트 번호를 담아 응답합니다. 이를 기반으로 브라우저는 연결 통로 개설을 위한 물리적 연결 주소 후보인 <span class="glossary-term" data-term="ICE">ICE</span> Candidate를 확보하게 됩니다.

### TURN (Traversal Using Relays around NAT)
<span class="glossary-term" data-term="TURN">TURN</span> 서버는 피어 간에 위치한 사설 방화벽의 규칙이 지나치게 엄격하거나 양쪽 브라우저가 대칭형 NAT 환경 뒤에 위치하여 직접적인 P2P 홀펀칭이 아예 불가능할 때, 트래픽을 중간에서 인프라 레벨로 직접 릴레이(중계)해 주는 서버입니다. 중계에 따른 대역폭 전송 비용이 발생하므로 최후의 연결 수단으로 작동하지만, 사내망 등 엄격한 보안 통신 규격을 가진 환경에서 100% 연결 신뢰성을 보장하기 위해 엔터프라이즈 환경에서는 필수로 구축합니다.

### ICE (Interactive Connectivity Establishment)와 시그널링 (Signaling)
<span class="glossary-term" data-term="Signaling">시그널링</span>은 두 브라우저가 직접 P2P 연결을 설립하기 전에, 상대방의 식별자 정보나 네트워크 통로, 서로 주고받을 미디어의 해상도 및 코덱 등의 제어 데이터(<span class="glossary-term" data-term="SDP">SDP</span>)를 교환하는 첫 연동 과정입니다. 시그널링 정보들은 웹소켓 등의 백엔드 중계 채널을 경유하여 전달되며, 연결이 설립된 이후에는 실제 비디오나 데이터 트래픽 교환에 개입하지 않습니다.
ICE는 이러한 시그널링 과정과 STUN/TURN 서버를 복합적으로 결합하여 피어 간에 연결을 맺을 수 있는 잠재적인 주소쌍들을 검사하고, 이 중 가장 짧은 지연 시간과 낮은 통신 비용을 보장하는 최적의 직접/간접 통신 경로를 동적으로 선택 및 타협하는 브라우저 표준 네트워크 프레임워크입니다.

| 구분 | STUN 서버 | TURN 서버 |
| :--- | :--- | :--- |
| **핵심 역할** | 사설 IP 기기의 공인 IP/포트 정보 탐색 | 직접 P2P 불가능 시 서버가 트래픽 중계 |
| **서버 부하** | 극도로 낮음 (최초 주소 확인 시에만 사용) | 매우 높음 (실시간 미디어/데이터 스트림 중계) |
| **운영 비용** | 저렴함 (퍼블릭 STUN 활용 가능) | 서버 대역폭에 따른 트래픽 인프라 비용 발생 |
| **연결 성공률** | 약 70~80% (일반 홈 네트워크 환경) | 100% (보안 방화벽 환경 포함 최후의 수단) |

---

## 4. 요약 및 마치며

WebRTC는 복잡한 하드웨어 디바이스 조작, 오디오/비디오 코덱 인코딩, NAT 홀펀칭 등 고난도의 실시간 통신 인프라를 웹 표준 API 3가지로 추상화하여 제공하는 웹 기술의 혁신입니다.

서버 전송 비용을 극적으로 줄이는 **P2P 스트리밍**과, 실시간 비디오 및 원격 이벤트 데이터를 빠르고 안정적으로 상대 브라우저로 직접 전달하는 **초저지연 통신망** 덕분에 화싱 회의, 원격 지원, 실시간 협업 도구 등 다양한 웹 서비스 환경에서 핵심적인 실시간 통신 기술로 자리 잡았습니다. 

 
