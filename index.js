document.addEventListener('DOMContentLoaded', () => {
  initRandomProfileImage();
  initAccordionExclusiveBehavior();
  initScrollSpy();
  initImageViewer();
  initScrollReveal();
  initHeroGlowAnimation();
  initTypewriter();
  initSmoothScrolling();
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

  const pointerEls = document.querySelectorAll('a, button, details, summary, .btn, .nav-link, .project-summary');
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

