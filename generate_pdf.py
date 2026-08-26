#!/usr/bin/env python3
import os
import subprocess

def generate_pdfs():
    project_root = os.path.dirname(os.path.abspath(__file__))
    docs_dir = os.path.join(project_root, "docs")
    assets_dir = os.path.join(project_root, "assets")

    chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

    targets = [
        {
            "html": os.path.join(docs_dir, "resume_master.html"),
            "pdf": os.path.join(assets_dir, "resume.pdf"),
            "name": "이력서 (resume.pdf)"
        },
        {
            "html": os.path.join(docs_dir, "portfolio_master.html"),
            "pdf": os.path.join(assets_dir, "portfolio.pdf"),
            "name": "포트폴리오 (portfolio.pdf)"
        },
        {
            "html": os.path.join(docs_dir, "portfolio_anonymous.html"),
            "pdf": os.path.join(assets_dir, "portfolio_anonymous.pdf"),
            "name": "익명 포트폴리오 (portfolio_anonymous.pdf)"
        }
    ]

    print("🚀 PDF 자동 변환 프로세스 시작...")

    for target in targets:
        html_file = target["html"]
        pdf_file = target["pdf"]
        name = target["name"]

        if not os.path.exists(html_file):
            print(f"❌ 오류: 원본 HTML 파일이 없습니다 ({html_file})")
            continue

        file_url = f"file://{html_file}"
        
        cmd = [
            chrome_path,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_file}",
            file_url
        ]

        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            size_kb = os.path.getsize(pdf_file) / 1024
            print(f"✅ 생성 완료: {name} → {pdf_file} ({size_kb:.1f} KB)")
        except Exception as e:
            print(f"❌ PDF 생성 실패 ({name}): {e}")

    print("\n🎉 모든 마스터 파일 PDF 변환이 완료되어 assets/ 폴더에 적용되었습니다!")

if __name__ == "__main__":
    generate_pdfs()
