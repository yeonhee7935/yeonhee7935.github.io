document.addEventListener('DOMContentLoaded', () => {
  initRandomProfileImage();
  initAccordionExclusiveBehavior();
  initScrollSpy();
  initImageViewer();
  initScrollReveal();
  initHeroGlowAnimation();
  initTypewriter();
  initSmoothScrolling();
  initGlossaryModal();
});

/**
 * 1. mutually exclusive accordion behavior (Cross-browser fallback)
 * Since HTML5 native 'name' attribute on <details> might not be fully supported in Firefox/Safari,
 * this function ensures only one details accordion remains open at a time.
 * Additionally, it scrolls the newly opened accordion to the top of the viewport
 * to prevent the scroll position from shifting awkwardly when other sections collapse.
 */
function initAccordionExclusiveBehavior() {
  const accordions = document.querySelectorAll('details[name="project-accordion"]');
  
  accordions.forEach((details) => {
    // Listen to the toggle event which fires when open state changes
    details.addEventListener('toggle', (e) => {
      if (details.open) {
        // 1. Close other accordions
        accordions.forEach((otherDetails) => {
          if (otherDetails !== details && otherDetails.open) {
            otherDetails.open = false;
          }
        });

        // 2. Smoothly scroll the opened card to the top, accounting for the sticky header
        // A short delay (100ms) allows the other accordion's collapse height transition to start
        // so that the getBoundingClientRect calculation measures the target position accurately.
        setTimeout(() => {
          const header = document.getElementById('main-header');
          const headerHeight = header ? header.offsetHeight : 72;
          const elementTop = details.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementTop - headerHeight - 16; // 16px margin spacing

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }, 100);
      }
    });
  });
}

/**
 * 2. Scroll Spy (Active nav link highlighting based on current view segment)
 * Since header navigation is simplified to high-level tabs (Portfolio, Blog),
 * standard scroll spy highlighting is bypassed to keep the page tab highlighted correctly.
 */
function initScrollSpy() {
  // Bypassed for simplified header navigation.
  return;
}

/**
 * 3. Image Viewer Modal (Lightbox effect)
 * Allows clicking on project mockup images or blog article images to view them in a larger modal overlay.
 */
function initImageViewer() {
  const modal = document.getElementById('image-viewer-modal');
  const modalImg = document.getElementById('viewer-img');
  const captionText = document.getElementById('viewer-caption');
  const closeBtn = document.querySelector('.close-viewer');

  if (!modal || !modalImg) return;

  // Find all project images and blog article images
  const images = document.querySelectorAll('.project-image, .blog-article-content img');

  images.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      modal.classList.add('show');
      modalImg.src = img.src;
      captionText.textContent = img.alt || '이미지 확대 보기';
      
      // Prevent body scrolling while modal is open
      document.body.style.overflow = 'hidden';
    });
  });

  // Close function
  function closeModal() {
    modal.classList.remove('show');
    // Restore body scrolling
    document.body.style.overflow = '';
  }

  // Close when clicking X button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Close when clicking outside the image
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target === captionText) {
      closeModal();
    }
  });

  // Close when pressing Esc key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
}

/**
 * 4. Scroll Reveal (Fade-up entry animation for section items)
 * Uses IntersectionObserver to trigger entry animations on scroll.
 * Standard items appear immediately when in view, while chat bubbles
 * appear sequentially with a staggered delay if they enter view together.
 */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal:not(.message)');
  const chatMessages = document.querySelectorAll('.message.reveal');
  
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px', // Trigger slightly before entering view for a smooth feel
    threshold: 0.05
  };

  // Standard scroll spy reveals
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Trigger only once
      }
    });
  }, observerOptions);

  reveals.forEach(el => {
    observer.observe(el);
  });

  // Staggered chat bubble reveals
  // On mobile (<= 768px), use a smaller rootMargin so bubbles trigger
  // as soon as they enter the viewport (not 350px deep into it)
  const isMobile = window.innerWidth <= 768;
  const chatRootMargin = isMobile ? '0px 0px -40px 0px' : '0px 0px -350px 0px';
  const chatThreshold = isMobile ? 0.05 : 0.2;

  const chatObserver = new IntersectionObserver((entries, observer) => {
    let delay = 0;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        setTimeout(() => {
          element.classList.add('active');
        }, delay);
        delay += 350; // Stagger bubbles by 350ms
        chatObserver.unobserve(element);
      }
    });
  }, {
    root: null,
    rootMargin: chatRootMargin,
    threshold: chatThreshold
  });

  chatMessages.forEach(msg => {
    chatObserver.observe(msg);
  });
}

/**
 * 5. Interactive Background Ambient Glow Parallax (MouseMove interaction)
 * On desktop devices with mouse pointer capability, tracks mouse movement and
 * smoothly translates background glow containers to create a premium floating effect.
 * Uses requestAnimationFrame to interpolate coordinates for optimal performance (60fps+).
 */
function initHeroGlowAnimation() {
  const mover1 = document.getElementById('orb-mover-1');
  const mover2 = document.getElementById('orb-mover-2');

  if (!mover1 || !mover2) return;

  // Only run mousemove interactivity if the device supports hover (mouse pointers)
  const isHoverSupported = window.matchMedia('(hover: hover)').matches;
  if (!isHoverSupported) return;

  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;

  // Easing factor: higher is faster, lower is smoother (inertia)
  const ease = 0.08;

  window.addEventListener('mousemove', (e) => {
    // Calculate normalized coordinates (-0.5 to 0.5) relative to viewport width/height
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  function animate() {
    // Linear interpolation (lerp) for smooth easing/inertia
    currentX += (mouseX - currentX) * ease;
    currentY += (mouseY - currentY) * ease;

    // Orb 1 moves in the direction of the mouse (max 30px offset)
    const moveX1 = currentX * 60;
    const moveY1 = currentY * 60;

    // Orb 2 moves in the opposite direction for parallax depth (max 45px offset)
    const moveX2 = currentX * -90;
    const moveY2 = currentY * -90;

    mover1.style.transform = `translate3d(${moveX1}px, ${moveY1}px, 0)`;
    mover2.style.transform = `translate3d(${moveX2}px, ${moveY2}px, 0)`;

    requestAnimationFrame(animate);
  }

  // Start the animation loop
  requestAnimationFrame(animate);
}

/**
 * 6. Typewriter Effect for Hero Title
 * Progressively types the greeting and title on page load with a custom blinking cursor.
 */
function initTypewriter() {
  const titleEl = document.getElementById('typewriter-title');
  if (!titleEl) return;

  const avatarWrapper = document.querySelector('.avatar-wrapper');
  const scrollIndicator = document.querySelector('.hero-scroll-indicator');
  const heroLinks = document.querySelector('.hero-links');

  const parts = [
    { text: '안녕하세요,\n', type: 'text' },
    { text: '프론트엔드 개발자 ', type: 'text' },
    { text: '정연희', type: 'highlight' },
    { text: '입니다.', type: 'text' }
  ];

  // Clear existing content
  titleEl.innerHTML = '';
  
  // Add cursor element
  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  titleEl.appendChild(cursor);

  let partIndex = 0;
  let charIndex = 0;
  let currentSpan = null;

  function type() {
    if (partIndex >= parts.length) {
      cursor.remove();
      // Wait 0.5 seconds after "입니다." is fully typed, then reveal the elements
      setTimeout(() => {
        if (avatarWrapper) {
          avatarWrapper.classList.remove('avatar-initial-hide');
        }
        if (scrollIndicator) {
          scrollIndicator.classList.remove('indicator-initial-hide');
        }
        if (heroLinks) {
          heroLinks.classList.remove('links-initial-hide');
        }
      }, 500);
      return;
    }

    const currentPart = parts[partIndex];
    
    if (charIndex === 0) {
      if (currentPart.type === 'highlight') {
        currentSpan = document.createElement('span');
        currentSpan.className = 'text-blue';
        titleEl.insertBefore(currentSpan, cursor);
      } else {
        currentSpan = null;
      }
    }

    const char = currentPart.text[charIndex];

    if (char === '\n') {
      const br = document.createElement('br');
      titleEl.insertBefore(br, cursor);
    } else {
      if (currentSpan) {
        currentSpan.textContent += char;
      } else {
        titleEl.insertBefore(document.createTextNode(char), cursor);
      }
    }

    charIndex++;
    if (charIndex >= currentPart.text.length) {
      partIndex++;
      charIndex = 0;
    }

    const speed = char === '\n' ? 300 : (50 + Math.random() * 40); // typing speed
    setTimeout(type, speed);
  }

  // Delay typing startup slightly for user focus
  setTimeout(type, 400);
}

/**
 * 8. Random Profile Image Selector
 * Randomly selects one of the profile images on page load and updates all profile images on the page.
/**
 * 8. Profile Image & Theme Initializer
 * Sets the default profile image and applies the matching blue theme globally.
 */
function initRandomProfileImage() {
  const selectedImage = 'assets/profile-blue.jpg';
  const selectedTheme = 'theme-blue';
  const cursorColor = '%23007aff';

  // Apply theme to body globally for styling dynamic components
  document.body.classList.remove('theme-blue', 'theme-orange');
  document.body.classList.add(selectedTheme);

  // Apply theme to hero section
  const introSection = document.getElementById('intro');
  if (introSection) {
    introSection.classList.remove('theme-blue', 'theme-orange');
    introSection.classList.add(selectedTheme);
  }

  // Update cursor color globally to match theme
  const cursorSvgAuto = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 24 24' fill='${cursorColor}'><path d='M5.5 3.21v15.58l3.89-3.89h6.81z' stroke='white' stroke-width='1.5' stroke-linejoin='round'/></svg>"), auto`;
  const cursorSvgPointer = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 24 24' fill='${cursorColor}'><path d='M5.5 3.21v15.58l3.89-3.89h6.81z' stroke='white' stroke-width='1.5' stroke-linejoin='round'/></svg>"), pointer`;

  document.body.style.cursor = cursorSvgAuto;

  const pointerEls = document.querySelectorAll('a, button, details, summary, .btn, .nav-link, .project-summary, .glossary-term');
  pointerEls.forEach(el => {
    el.style.cursor = cursorSvgPointer;
  });

  // Update hero avatar
  const avatarImg = document.querySelector('.avatar-img');
  if (avatarImg) {
    avatarImg.src = selectedImage;
  }

  // Update chat avatars
  const chatAvatars = document.querySelectorAll('.chat-avatar-img');
  chatAvatars.forEach(img => {
    img.src = selectedImage;
  });
}

/**
 * 7. Universal Smooth Scroll for Anchor Links
 * Intercepts anchor clicks and performs smooth scrolling with dynamic header offsets.
 */
function initSmoothScrolling() {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();

      const header = document.getElementById('main-header');
      const headerHeight = header ? header.offsetHeight : 72;
      const elementTop = targetEl.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = targetId === '#intro' ? 0 : elementTop - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    });
  });
}

const GLOSSARY_DB = {
  'NAT': 'NAT(Network Address Translation, 네트워크 주소 변환)는 공인 IP 주소 하나를 여러 개의 사설 IP 주소로 변환하여 사용하는 네트워크 기술입니다. 공유기 등이 사설 네트워크 내의 여러 기기들에게 사설 IP를 부여하고 외부 인터넷 연결 시 하나의 공인 IP로 변환하여 트래픽을 처리하는 원리입니다.',
  'Firewall': '방화벽(Firewall)은 미리 정의된 보안 규칙에 기초하여 사설망 또는 사설망으로 들어오고 나가는 네트워크 트래픽을 모니터링하고 제어하는 네트워크 보안 시스템입니다. 신뢰성 없는 외부 세력의 침입이나 악성 패킷을 차단하는 역할을 합니다.',
  'Stream': '스트림(Stream)은 실시간 통신 환경에서 시간에 따라 흐르는 연속적인 미디어(비디오, 오디오) 또는 일반 데이터 패킷들의 디지털 흐름입니다. WebRTC에서는 카메라와 마이크 트랙을 묶은 MediaStream을 통해 전송을 제어합니다.',
  'Signaling': '시그널링(Signaling)은 두 브라우저가 직접적인 P2P 연결을 생성하기 전에, 연결에 필요한 서로의 주소 후보군, 통신을 수행할 미디어 해상도 및 코덱 등의 제어 정보(SDP)를 중계 서버를 거쳐 상호 교환하는 사전 협상 과정입니다.',
  'SDP': 'SDP(Session Description Protocol, 세션 기술 프로토콜)는 WebRTC가 연결되기 전에 미디어 포맷, 오디오/비디오 코덱, 해상도, 프로토콜 및 네트워크 연결 정보 등을 정형화된 텍스트 서식으로 기술한 규격입니다. 시그널링 과정을 통해 양 피어가 SDP를 교환합니다.',
  'ICE': 'ICE(Interactive Connectivity Establishment, 대화형 연결 설립)는 사설 IP와 방화벽이 존재하는 환경에서 최적의 P2P 통신 경로를 수집하고 동적으로 선택하여 연결을 맺어주는 표준 네트워크 조율 프레임워크입니다.',
  'STUN': 'STUN(Session Traversal Utilities for NAT)은 사설 IP 환경 뒤의 기기가 자신의 외부 공인 IP 주소와 포트 번호를 파악할 수 있도록 중계해 주는 네트워크 도구이자 경량 프로토콜입니다.',
  'TURN': 'TURN(Traversal Using Relays around NAT)은 방화벽 규칙이 지나치게 엄격하거나 양 기기가 모두 대칭형 NAT 환경 뒤에 위치하여 직접적인 P2P 홀펀칭이 완전히 불가능할 때, 서버가 직접 미디어와 데이터를 릴레이(중계)하는 최후의 통신 우회 수단입니다.'
};

/**
 * 9. Reusable Glossary Popup System (Toss Glassmorphism)
 * Dynamically binds click event handlers to all elements with '.glossary-term' class.
 * Reads term metadata from data-term attribute, retrieves definition from GLOSSARY_DB,
 * and opens the Toss/iOS-style blur modal.
 */
function initGlossaryModal() {
  const modal = document.getElementById('glossary-modal');
  const titleEl = document.getElementById('glossary-title');
  const descEl = document.getElementById('glossary-description');
  const closeBtn = document.getElementById('glossary-modal-close');
  
  if (!modal || !descEl || !titleEl) return;

  const terms = document.querySelectorAll('.glossary-term');
  
  terms.forEach(term => {
    const key = term.getAttribute('data-term');
    if (!key || !GLOSSARY_DB[key]) return;

    term.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Update modal content
      titleEl.textContent = key;
      descEl.textContent = GLOSSARY_DB[key];

      // Show modal with smooth transition
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');

      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    });
  });

  function closeGlossary() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Close on close button click
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeGlossary();
    });
  }

  // Close when clicking overlay (outside the content card)
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('glossary-modal-overlay') || e.target === modal) {
      closeGlossary();
    }
  });

  // Close when pressing Esc key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeGlossary();
    }
  });
}

