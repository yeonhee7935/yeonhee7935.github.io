#!/bin/bash

# 스크립트 실행 위치를 기준 경로로 설정
cd "$(dirname "$0")"

echo "========================================================"
echo " Starting local Jekyll server via Docker container..."
echo " Access the site at: http://localhost:4000"
echo " To stop the server, press: Ctrl + C"
echo "========================================================"

# --watch와 --force_polling을 사용해 macOS 호스트-컨테이너 간의 실시간 파일 변경 감지 보장
docker run --rm \
  --volume="$PWD:/srv/jekyll" \
  -p 4000:4000 \
  -it jekyll/jekyll \
  jekyll serve --watch --force_polling
