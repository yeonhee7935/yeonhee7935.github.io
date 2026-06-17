---
layout: post
title: "GStreamer와 WebRTC를 활용한 실시간 영상 스트리밍 파이프라인 구축"
categories: [backend]
date: 2024-05-01 10:00:00 +0900
readtime: "6 min read"
thumbnail: assets/project-webrtc.png
excerpt: "GStreamer를 활용하여 실시간 카메라 영상을 획득하고, H.264 인코딩을 거쳐 WebRTC 프로토콜로 브라우저에 전송하는 미디어 파이프라인 설계 및 구현 방법을 정리했습니다."
---

낮은 지연 시간(Low Latency)을 요구하는 비디오 전송 서비스를 구현할 때 WebRTC는 가장 적합한 표준 프로토콜입니다. 하지만 서버나 디바이스에서 카메라 영상을 직접 캡처하고 인코딩하여 웹 브라우저로 송출하기 위해서는 미디어 파이프라인 설계가 선행되어야 합니다.

이 글에서는 강력한 멀티미디어 프레임워크인 **GStreamer**를 활용하여 로컬 카메라 영상을 캡처하고, H.264 코덱으로 압축한 뒤 WebRTC 프로토콜로 브라우저에 실시간 전송하는 파이프라인 구축 과정을 정리했습니다.

---

## 1. GStreamer 파이프라인의 구조적 특징

GStreamer는 각 멀티미디어 처리 단계를 수행하는 모듈형 객체인 **엘리먼트(Element)**를 연결하여 데이터를 처리하는 파이프라인 기반 프레임워크입니다. 엘리먼트들은 입력 및 출력을 담당하는 인터페이스인 **패드(Pad)**를 통해 서로 연결되어 데이터 스트림을 순차적으로 가공합니다.

- **Source (소스)**: 비디오 장치(카메라)나 파일 등에서 데이터를 입력받아 스트림을 시작하는 엘리먼트입니다.
- **Transform / Filter (변환 및 필터)**: 포맷 변환, 해상도 조절, 코덱 인코딩 등 데이터를 조작하고 압축하는 엘리먼트입니다.
- **Sink (싱크)**: 디스플레이 화면 출력, 파일 저장, 혹은 네트워크 전송 등 최종적으로 데이터를 처리하여 파이프라인을 종료하는 엘리먼트입니다.

---

## 2. WebRTC 송출을 위한 전체 데이터 흐름

카메라의 원본 영상이 브라우저까지 전송되는 전체적인 미디어 처리 흐름은 다음과 같습니다.

```
[ 카메라 (v4l2src) ]
       │ (원본 픽셀 데이터 캡처)
[ 포맷 변환 (videoconvert / videoscale) ]
       │ (인코더 규격에 맞는 YUV420 포맷 및 해상도 조절)
[ H.264 인코딩 (x264enc) ]
       │ (H.264 코덱으로 압축된 비트스트림 생성)
[ RTP 패킷화 (rtph264pay) ]
       │ (실시간 전송 프로토콜 패킷 데이터로 분할)
[ WebRTC 전송 (webrtcbin) ]
       │ (SDP 협상, ICE 경로 탐색 및 DTLS-SRTP 암호화 송출)
▼ (인터넷 네트워크 전송)
[ 웹 브라우저 (Chrome, Safari 등) ]
```

---

## 3. GStreamer WebRTC 파이프라인 구현

GStreamer의 명령행 도구(CLI) 또는 API 스크립트에서 활용하는 파이프라인의 전형적인 명세와 구성 요소에 대한 기술적 분석입니다.

### ① 파이프라인 예시

```bash
v4l2src device=/dev/video0 ! videoconvert ! videoscale ! video/x-raw,width=640,height=480,framerate=30/1 ! x264enc tune=zerolatency bitrate=500 speed-preset=ultrafast ! rtph264pay config-interval=1 pt=96 ! webrtcbin name=web
```

### ② 엘리먼트별 상세 설명

- **`v4l2src device=/dev/video0`**:
  - 리눅스 시스템의 비디오 캡처 드라이버(Video for Linux 2)를 통해 로컬 카메라 디바이스로부터 원본 비디오 스트림을 캡처하는 소스(Source) 엘리먼트입니다.
- **`videoconvert ! videoscale`**:
  - 수신한 원본 비디오의 색상 모델(RGB 등)을 뒤이어 연결될 인코더의 입력 사양(YUV420)에 맞게 변환하고 물리적인 크기를 제어합니다.
- **`video/x-raw,width=640,height=480,framerate=30/1`**:
  - GStreamer에서 데이터 포맷을 강제하는 **Capabilities(Caps)** 설정입니다. 해상도를 640x480으로 조정하고 초당 프레임 수(FPS)를 30프레임으로 제어하여 네트워크 대역폭 오버헤드를 줄입니다.
- **`x264enc tune=zerolatency bitrate=500 speed-preset=ultrafast`**:
  - H.264 소프트웨어 인코더 엘리먼트입니다.
  - `tune=zerolatency`: 지연 시간을 극도로 낮추기 위해 프레임 버퍼링(B-Frame 생성 등)을 비활성화하고 즉각 디코딩 가능한 프레임 흐름을 유도합니다.
  - `bitrate=500`: 스트림 전송 속도를 500kbps로 한계 지정하여 대역폭 과부하를 방지합니다.
  - `speed-preset=ultrafast`: 인코딩 연산 속도를 최고 속도로 설정하여 인코딩 시 발생하는 지연(Processing Latency)을 방지합니다.
- **`rtph264pay config-interval=1 pt=96`**:
  - 인코딩된 H.264 스트림을 WebRTC 내 미디어 전송 규격인 RTP(Real-time Transport Protocol) 패킷 형태로 포장(Payloader)합니다.
  - `config-interval=1`: 화면 구성 매개변수인 SPS(Sequence Parameter Set)와 PPS(Picture Parameter Set)를 매 1초마다 전송하도록 지정하여, 수신 측 브라우저가 도중에 스트림에 참여해도 즉시 디코딩을 재개할 수 있도록 돕습니다.
- **`webrtcbin name=web`**:
  - WebRTC 통신 표준을 처리하는 핵심 싱크(Sink) 엘리먼트입니다. ICE 후보자 수집, DTLS 핸드셰이크를 통한 보안 키 교환, SRTP 암호화 미디어 송출 등의 백엔드 규격을 내장하여 처리합니다.

---

## 4. WebRTC 시그널링(Signaling) 연동

`webrtcbin` 엘리먼트는 미디어 스트리밍의 암호화 및 네트워크 전송을 직접 담당하지만, 최초 접속 단계인 **시그널링 과정**은 직접 수행하지 않습니다.

따라서 Python 등으로 구현된 제어 스크립트에서 WebSocket 등의 채널을 통해 다음 과정을 중계해야 합니다.

1. **SDP 생성**: `webrtcbin`이 미디어 명세(H.264 코덱 정보 등)를 담아 생성한 SDP Offer를 시그널링 서버로 전송합니다.
2. **SDP 교환**: 웹 브라우저가 Offer를 수신하고 그에 대한 Answer SDP를 생성하여 시그널링 서버를 통해 `webrtcbin`으로 응답합니다.
3. **ICE Candidate 교환**: 브라우저와 `webrtcbin` 상호 간의 통신 경로를 식별하기 위해 ICE Candidate 후보 데이터를 서로 교환하여 최종 P2P 네트워크 터널을 개설합니다.

---

## 5. 요약

GStreamer를 통한 WebRTC 스트리밍 구현은 미디어 캡처, 인코딩, 실시간 RTP 패킷화, 그리고 WebRTC 피어 연결 관리까지 순차적인 엘리먼트 조율을 필요로 합니다.
실시간성을 최우선으로 확보하기 위해서는 인코더의 지연 방지 설정(`tune=zerolatency`), 적절한 해상도 규제(Caps), 그리고 안정적인 시그널링 환경 구축이 병행되어야 합니다.
