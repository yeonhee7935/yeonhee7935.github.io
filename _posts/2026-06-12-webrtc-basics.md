---
layout: post
title: "웹 브라우저로 실시간 통신하기: WebRTC의 핵심 개념과 동작 원리"
category: WEB
date: 2026-06-12 10:00:00 +0900
readtime: "6 min read"
thumbnail: assets/project-webrtc.png
excerpt: "별도의 플러그인 없이 웹 브라우저 간에 오디오, 비디오, 데이터를 실시간으로 전송할 수 있는 WebRTC 기술의 3대 핵심 API와 시그널링, 그리고 NAT 홀펀칭(STUN/TURN) 메커니즘을 친숙한 비유로 알기 쉽게 정리합니다."
---

안녕하세요! 오늘은 웹 브라우저에서 플러그인이나 추가 프로그램 설치 없이도 오디오, 비디오, 데이터를 실시간으로 주고받을 수 있게 해주는 혁신적인 오픈소스 기술, **WebRTC(Web Real-Time Communication)**에 대해 알아보겠습니다.

줌(Zoom)이나 디스코드(Discord) 같은 웹 버전 화상회의 서비스부터 자율주행 차량의 원격 비디오 관제 및 웹 기반 원격 제어 솔루션까지, 실시간 초저지연 통신이 필요한 곳이라면 어디든 WebRTC가 핵심 역할을 맡고 있습니다. WebRTC를 처음 접하는 분들을 위해 기술의 핵심 개념과 동작 원리를 쉽고 정돈된 비유로 요약해 드립니다.

---

## 1. WebRTC란? 핵심은 P2P(Peer-to-Peer)

일반적인 웹 통신(HTTP)은 브라우저(클라이언트)가 서버에 요청을 보내고, 서버가 이에 응답하는 구조입니다. 하지만 화상 통화처럼 매초 수십 프레임의 대용량 비디오 데이터를 주고받을 때 모든 트래픽이 서버를 거치게 된다면 어떻게 될까요? 서버의 대역폭 비용이 감당하기 힘들 정도로 늘어나고, 서버를 거치는 과정에서 화면과 소리에 지연(Latency)이 발생할 수밖에 없습니다.

WebRTC는 이러한 병목을 해결하기 위해 **P2P(Peer-to-Peer) 통신** 모델을 채택했습니다. 초기에 연결 통로만 개설하고 나면 브라우저(Peer A)와 브라우저(Peer B)가 **서버를 중간에 거치지 않고 서로에게 직접 데이터를 쏘아 보내는 방식**입니다.

이 덕분에 WebRTC는 일반 웹 통신에 비해 훨씬 짧은 지연 시간(보통 0.2~0.5초 이내)으로 초저지연 실시간 통신을 실현할 수 있습니다.

---

## 2. WebRTC를 구성하는 3대 핵심 API

웹 브라우저에서 WebRTC를 다룰 때 프론트엔드 개발자가 주로 마주하는 핵심 웹 API는 크게 3가지로 분류됩니다.

### ① MediaStream (getUserMedia)
* **역할:** 사용자의 카메라, 마이크 등 하드웨어 장치에 접근해 비디오와 오디오 트랙을 획득합니다.
* **비유:** 방송 송출을 위한 비디오카메라와 마이크 장비를 켜고 선을 연결하는 단계입니다.

### ② RTCPeerConnection
* **역할:** WebRTC 기술의 심장이자 핵심 아키텍처입니다. 브라우저 간 P2P 연결을 생성, 유지하고 모니터링합니다. 오디오/비디오 미디어 스트림을 효율적으로 인코딩 및 디코딩하고, 네트워크 패킷 손실 시 복구하는 고난도 최적화 작업을 백그라운드에서 자동으로 처리합니다.
* **비유:** 두 기기 사이의 전용 광케이블 통로를 설치하고 데이터를 암호화하여 통신 규격을 맞추는 전산 장비입니다.

### ③ RTCDataChannel
* **역할:** 비디오/오디오 스트림 외에, 텍스트나 파일, 바이너리 같은 일반 데이터를 P2P로 주고받을 수 있는 양방향 채널입니다. 매우 빠르고 지연 시간이 적기 때문에 **원격 제어 기기의 마우스 클릭/키보드 입력 이벤트 송수신**이나 실시간 멀티플레이어 게임의 패킷 전송에 핵심적으로 활용됩니다.
* **비유:** 미디어 선로 옆에 나란히 놓인 초저지연 전용 초고속 데이터 셔틀 레일입니다.

---

## 3. P2P 연결은 어떻게 만들어질까? NAT와 방화벽 넘기

서버 없이 직접 브라우저끼리 통신하는 개념은 훌륭하지만, 현실 인터넷 환경에서는 큰 장벽이 존재합니다. 바로 **NAT(Network Address Translation)**와 **방화벽(Firewall)**입니다.

대부분의 개인용 컴퓨터와 스마트폰은 공유기 아래에 있어 사설 IP(예: `192.168.0.x`)를 가집니다. 상대방 브라우저는 나의 사설 IP로 직접 패킷을 보낼 수 없기 때문에, 우리는 상대방이 찾아올 수 있는 **공인 IP(Public IP)와 포트 번호**를 알아내야 합니다. 이 과정을 **NAT 트래버스(Traversing) 또는 홀펀칭(Hole Punching)**이라고 부르며, 이를 위해 STUN과 TURN 서버가 활약합니다.

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

### STUN(Session Traversal Utilities for NAT) 서버
* **역할:** "내 공인 IP 주소와 열려 있는 포트가 무엇인지" 브라우저에 알려주는 간단한 반사판 역할을 합니다.
* **동작:** 브라우저가 STUN 서버에 요청을 보내면, STUN 서버는 브라우저가 도달한 공인 IP 주소 패킷 정보를 담아 응답해 줍니다. 브라우저는 이 정보를 토대로 자신의 연결 후보(ICE Candidate)들을 생성합니다.

### TURN(Traversal Using Relays around NAT) 서버
* **역할:** 네트워크 방화벽이 지나치게 엄격하거나 양쪽 브라우저가 모두 대칭형 NAT(Symmetric NAT) 뒤에 있어 직접적인 P2P 홀펀칭이 원천 불가할 때, 데이터를 중간에서 릴레이(중계)해 줍니다.
* **동작:** 최후의 수단으로 작동하며, 어쩔 수 없이 서버 자원(대역폭)을 사용해 트래픽을 전달하므로 비용이 발생하지만 연결 신뢰성을 100% 보장하기 위해 기업용 실시간 시스템에서는 필수적으로 구축합니다.

### ICE(Interactive Connectivity Establishment)와 시그널링(Signaling)
* **시그널링 서버:** 서로 주소도 모르는 Peer A와 Peer B가 만나기 위한 **'만남의 광장'**입니다. 미디어 형식 정보(SDP)와 공인 IP 정보(ICE Candidate)를 교환하기 위해 WebSocket 등으로 연동되며, 최초 연결 안내가 끝나면 더 이상 데이터 전송 관여를 중단합니다.
* **ICE:** STUN과 TURN 서버를 활용하여 수집된 다양한 연결 경로 후보군 중 **최적의 네트워크 연결 통로를 찾아 최종 합의**하는 프레임워크 규칙입니다.

| 구분 | STUN 서버 | TURN 서버 |
| :--- | :--- | :--- |
| **핵심 역할** | 사설 IP 기기의 공인 IP/포트 정보 탐색 | 직접 P2P 불가능 시 서버가 트래픽 중계 |
| **트래픽 부하** | 극도로 낮음 (최초 주소 확인 시에만 사용) | 매우 높음 (실시간 미디어/데이터 스트림 중계) |
| **운영 비용** | 저렴함 (퍼블릭 STUN 활용 가능) | 서버 대역폭에 따른 트래픽 인프라 비용 발생 |
| **연결 성공률** | 약 70~80% (일반 홈 네트워크 환경) | 100% (보안 방화벽 환경 포함 최후의 수단) |

---

## 4. 요약 및 마치며

WebRTC는 복잡한 하드웨어 조작과 오디오/비디오 코덱 인코딩, NAT 홀펀칭 등 고난도의 통신 기술 인프라를 웹 표준 API 3가지로 추상화하여 제공해 준 개발 혁신 기술입니다.

서버 비용을 혁신적으로 아끼는 **P2P 미디어 전송**과, 실시간 비디오 및 원격 이벤트 데이터를 단 0.1~0.3초 이내에 상대 브라우저로 직접 전달해 주는 **초저지연(Low Latency) 통신망** 덕분에 관제 및 원격 조종 환경에서 필수적인 표준 기술로 자리 잡았습니다. 

다음 포스트에서는 이 WebRTC에 실시간 미디어를 원활하게 가공하고 공급하기 위해 파이썬 프레임워크 환경에서 미디어 서버 파이프라인 엔진인 **GStreamer**를 결합하여 영상 제어 파이프라인을 구축해 나간 실무 아키텍처 경험을 이어서 다루어 보겠습니다!
