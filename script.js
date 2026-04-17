(function () {
  'use strict';

  const html = document.documentElement;

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const saved = localStorage.getItem('ha-theme') || 'dark';
    html.setAttribute('data-theme', saved);
    themeToggle.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('ha-theme', next);
    });
  }

  const canvas = document.getElementById('fieldCanvas');
  let fieldRaf = null;
  let W = 0, H = 0;
  let nodes = [];
  let mx = -9999, my = -9999;
  const MAX_DIST = 128;
  const PULSE_RADIUS = 110;

  function buildNodes(w, h) {
    const count = Math.max(36, Math.min(90, Math.floor((w * h) / 20000)));
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.1 + 0.28,
        baseAlpha: Math.random() * 0.42 + 0.14,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.007 + Math.random() * 0.011,
      });
    }
    return arr;
  }

  function resizeCanvas() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    nodes = buildNodes(W, H);
  }

  function drawField() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const isDark = html.getAttribute('data-theme') !== 'light';
    const cr = isDark ? '74,124,200' : '46,104,176';

    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -8) p.x = W + 8;
      else if (p.x > W + 8) p.x = -8;
      if (p.y < -8) p.y = H + 8;
      else if (p.y > H + 8) p.y = -8;

      p.phase += p.phaseSpeed;
      const pulse = 0.72 + 0.28 * Math.sin(p.phase);

      const dm = Math.hypot(p.x - mx, p.y - my);
      if (dm < PULSE_RADIUS && dm > 0) {
        const f = (1 - dm / PULSE_RADIUS) * 0.014;
        p.vx += ((p.x - mx) / dm) * f;
        p.vy += ((p.y - my) / dm) * f;
      }

      const spd = p.vx * p.vx + p.vy * p.vy;
      if (spd > 0.25) { const s = 0.96; p.vx *= s; p.vy *= s; }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fillStyle = `rgba(${cr},${(p.baseAlpha * pulse).toFixed(3)})`;
      ctx.fill();

      for (let j = i + 1; j < nodes.length; j++) {
        const q = nodes[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < MAX_DIST * MAX_DIST) {
          const dist = Math.sqrt(d2);
          const la = ((1 - dist / MAX_DIST) * 0.12 * pulse).toFixed(3);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(${cr},${la})`;
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }
      }
    }

    fieldRaf = requestAnimationFrame(drawField);
  }

  if (canvas) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq.matches && window.innerWidth > 480) {
      resizeCanvas();
      drawField();

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          cancelAnimationFrame(fieldRaf);
          resizeCanvas();
          drawField();
        }, 160);
      });
    } else {
      canvas.style.display = 'none';
    }
  }

  const cursorEl = document.getElementById('cursorField');
  if (cursorEl && window.innerWidth > 480) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let cRaf;
    let cursorActive = false;

    function tickCursor() {
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      cursorEl.style.left = cx + 'px';
      cursorEl.style.top = cy + 'px';
      cRaf = requestAnimationFrame(tickCursor);
    }

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      mx = e.clientX;
      my = e.clientY;
      const speed = Math.hypot(e.movementX, e.movementY);
      if (!cursorActive) { cursorActive = true; tickCursor(); }
      cursorEl.style.transform = `translate(-50%, -50%) scale(${1 + speed * 0.02})`;
    }, { passive: true });

    window.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });
  } else if (cursorEl) {
    cursorEl.style.display = 'none';
  }

  const nav = document.getElementById('nav');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  let lastScroll = window.scrollY;

  function updateNav() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 55);
    let cur = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 130) cur = s.getAttribute('id');
    });
    navLinks.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + cur);
    });
  }

  const sceneLight = document.getElementById('sceneLight');
  const sceneSections = document.querySelectorAll('[data-scene]');

  const sceneObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const scene = entry.target.getAttribute('data-scene');
      if (scene) document.body.dataset.scene = scene;
    });
  }, {
    threshold: 0.35,
    rootMargin: '-10% 0px -55% 0px'
  });
  sceneSections.forEach(section => sceneObserver.observe(section));

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  const progressBar = document.querySelector('#pageProgress span');

  function updateProgress() {
    if (!progressBar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = `${pct}%`;
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden', String(!open));
    });
    mobileMenu.querySelectorAll('.mobile-link').forEach(l => {
      l.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navH = nav ? nav.offsetHeight : 68;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH - 8, behavior: 'smooth' });
      }
    });
  });

  const heroRevealEls = document.querySelectorAll('.hero-content .scan-reveal');
  heroRevealEls.forEach((el, i) => {
    setTimeout(() => { el.classList.add('revealed'); }, 180 + i * 120);
  });

  const scanEls = document.querySelectorAll('.scan-reveal');
  const alreadyRevealed = new Set();
  heroRevealEls.forEach(el => alreadyRevealed.add(el));

  const scanObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (alreadyRevealed.has(el)) { scanObserver.unobserve(el); return; }

      const parent = el.closest('.container, .hero-content, .timeline, .edu-certs-grid, .achievements-grid, .testimonials-grid, .projects-grid, .skills-grid') || el.parentElement;
      const group = Array.from(parent.querySelectorAll('.scan-reveal:not(.revealed)'));
      const idx = group.indexOf(el);
      const delay = Math.max(0, idx) * 65;

      setTimeout(() => {
        el.classList.add('revealed');
        alreadyRevealed.add(el);
      }, delay);

      scanObserver.unobserve(el);
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -28px 0px' });

  scanEls.forEach(el => {
    if (!alreadyRevealed.has(el)) scanObserver.observe(el);
  });

  const statNums = document.querySelectorAll('.stat-num[data-target]');
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-target'), 10);
      if (isNaN(target)) return;
      const t0 = performance.now();
      const dur = 1500;
      function tick(now) {
        const frac = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - frac, 3);
        el.textContent = Math.floor(eased * target);
        if (frac < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      }
      requestAnimationFrame(tick);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.4 });
  statNums.forEach(el => counterObs.observe(el));

  const barObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const bar = entry.target;
      const w = bar.getAttribute('data-width');
      if (w) setTimeout(() => { bar.style.width = w + '%'; }, 150);
      barObs.unobserve(bar);
    });
  }, { threshold: 0, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.skill-bar-fill[data-width]').forEach(b => barObs.observe(b));

  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      projectCards.forEach((card, i) => {
        const cats = card.getAttribute('data-category') || '';
        const show = filter === 'all' || cats.includes(filter);
        card.classList.toggle('hidden', !show);
        if (show && !card.classList.contains('revealed')) {
          setTimeout(() => card.classList.add('revealed'), i * 55);
        }
      });
    });
  });

  const modal = document.getElementById('projectModal');
  const modalContent = document.getElementById('modalContent');
  const modalClose = document.getElementById('modalClose');
  const modalBackdrop = modal ? modal.querySelector('.modal-backdrop') : null;

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (modal && modalContent && modalClose && modalBackdrop) {
    projectCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;

        const title = card.querySelector('.project-title')?.innerText || '';
        const desc = card.querySelector('.project-desc')?.innerText || '';
        const domain = card.querySelector('.project-domain')?.innerText || '';
        const impact = card.querySelector('.project-impact')?.innerText || '';
        const stack = Array.from(card.querySelectorAll('.project-stack span'))
          .map(s => s.innerText)
          .join(' · ');

        modalContent.innerHTML = `
          <div class="modal-kicker">${domain}</div>
          <h3>${title}</h3>
          <div class="modal-tabs">
            <button class="modal-tab active" data-tab="overview">Overview</button>
            <button class="modal-tab" data-tab="stack">Tech Stack</button>
            <button class="modal-tab" data-tab="result">Result</button>
          </div>
          <div class="modal-panel active" data-panel="overview">
            <p>${desc}</p>
          </div>
          <div class="modal-panel" data-panel="stack">
            <p>${stack}</p>
          </div>
          <div class="modal-panel" data-panel="result">
            <p>${impact}</p>
          </div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        modalContent.querySelectorAll('.modal-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            modalContent.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            modalContent.querySelectorAll('.modal-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = modalContent.querySelector(`[data-panel="${target}"]`);
            if (panel) panel.classList.add('active');
          });
        });
      });
    });

    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  const heroNameEl = document.getElementById('heroName');

  if (heroNameEl) {
    setInterval(() => {
      heroNameEl.style.letterSpacing = `${-0.045 + (Math.random() * 0.02)}em`;
    }, 1200);
  }

  if (heroNameEl && window.innerWidth > 768) {
    const inner = heroNameEl;
    let baseCenter = { x: 0, y: 0 };

    function captureCenter() {
      const r = heroNameEl.getBoundingClientRect();
      baseCenter.x = r.left + r.width / 2;
      baseCenter.y = r.top + r.height / 2 + window.scrollY;
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(captureCenter);
    } else {
      setTimeout(captureCenter, 600);
    }

    let magRaf = null;
    let magTx = 0, magTy = 0, magCx = 0, magCy = 0;

    function tickMag() {
      magCx += (magTx - magCx) * 0.08;
      magCy += (magTy - magCy) * 0.08;
      inner.style.transform = `translate(${magCx.toFixed(2)}px, ${magCy.toFixed(2)}px)`;
      magRaf = requestAnimationFrame(tickMag);
    }

    document.addEventListener('mousemove', (e) => {
      const cx = baseCenter.x;
      const cy = baseCenter.y - window.scrollY;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      magTx = dx * 4;
      magTy = dy * 2.5;
      if (!magRaf) tickMag();
    }, { passive: true });

    window.addEventListener('scroll', captureCenter, { passive: true });
  }

  window.addEventListener('scroll', () => {
    if (!nodes.length) return;
    const scrollVelocity = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    nodes.forEach(p => {
      p.vx += (Math.random() - 0.5) * scrollVelocity * 0.002;
      p.vy += (Math.random() - 0.5) * scrollVelocity * 0.002;
    });
  }, { passive: true });

  navLinks.forEach(link => {
    link.addEventListener('mouseenter', function () {
      this.style.letterSpacing = '.05em';
    });
    link.addEventListener('mouseleave', function () {
      this.style.letterSpacing = '';
    });
  });

  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(.97)';
    });
    ['mouseup', 'mouseleave'].forEach(ev => {
      btn.addEventListener(ev, () => {
        btn.style.transform = '';
      });
    });
  });

  document.querySelectorAll('.contact-link:not(.no-hover)').forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.style.paddingLeft = 'calc(var(--s4) + 4px)';
    });
    link.addEventListener('mouseleave', () => {
      link.style.paddingLeft = '';
    });
  });

  document.querySelectorAll('.energy-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${y * -6}deg) rotateY(${x * 8}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    });
  });

  window.addEventListener('click', (e) => {
    if (!nodes.length) return;
    nodes.forEach(p => {
      const dx = p.x - e.clientX;
      const dy = p.y - e.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = 4 / dist;
      p.vx += dx * force;
      p.vy += dy * force;
    });
  });

}());