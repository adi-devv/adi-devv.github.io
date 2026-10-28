(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Name: split into letters so they can rise in one after another.
  const name = document.querySelector('.name');
  name.innerHTML = [...name.textContent]
    .map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c}</span>`)
    .join('');

  // Rotating phrase in the hero.
  const rot = document.querySelector('.rotator');
  if (rot && !reduce) {
    const words = rot.dataset.words.split('|');
    let i = 0;
    setInterval(() => {
      rot.classList.add('out');
      setTimeout(() => {
        i = (i + 1) % words.length;
        rot.textContent = words[i];
        rot.classList.replace('out', 'in');
        void rot.offsetWidth;
        rot.classList.remove('in');
      }, 350);
    }, 2600);
  }

  // Marquee: duplicate each track so the loop is seamless.
  if (!reduce) document.querySelectorAll('.track').forEach(t => { t.innerHTML += t.innerHTML; });

  // Reveal on scroll, staggered within each group, with count-up numbers.
  const countUp = el => el.querySelectorAll('[data-count]').forEach(n => {
    const end = +n.dataset.count;
    const fmt = v => (n.dataset.format === 'comma' ? v.toLocaleString('en-US') : String(v));
    const t0 = performance.now();
    const tick = now => {
      const k = Math.min(1, (now - t0) / 1600);
      n.textContent = fmt(Math.round(end * (1 - Math.pow(1 - k, 4))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('seen');
    if (!reduce) countUp(e.target);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    const group = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', `${Math.min(group.indexOf(el), 4) * 0.1}s`);
    io.observe(el);
  });

  // Scroll-linked: progress bar, solid top bar, timeline fill, quieter background.
  const bar = document.querySelector('.bar');
  const tl = document.querySelector('.timeline');
  const flow = document.getElementById('flow');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    bar.classList.toggle('solid', y > 40);
    if (!reduce) {
      const r = tl.getBoundingClientRect();
      tl.style.setProperty('--tl', Math.max(0, Math.min(1, (innerHeight * 0.65 - r.top) / r.height)).toFixed(3));
    }
    flow.style.opacity = (0.5 - Math.min(y / innerHeight, 1) * 0.3).toFixed(3);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Background: a slow flow field of fine lines that bends around the pointer.
  const ctx = flow.getContext('2d');
  let w = 0, h = 0, ps = [], t = Math.random() * 100, col;
  const mouse = { x: -1e4, y: -1e4 };
  const setCol = () => { col = getComputedStyle(root).getPropertyValue('--flow').trim(); };
  setCol();

  const spawn = () => ({ x: Math.random() * w, y: Math.random() * h, tr: [], age: 0, life: 180 + Math.random() * 320 });
  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    const widthChanged = innerWidth !== w;
    w = innerWidth; h = innerHeight;
    flow.width = w * d; flow.height = h * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    if (widthChanged) ps = Array.from({ length: Math.round(Math.min(320, (w * h) / 3800)) }, spawn);
  };
  const field = (x, y) => {
    const s = 0.0018;
    return Math.sin(x * s + t * 0.13) * 1.4 + Math.cos(y * s * 1.4 - t * 0.1) * 1.4 + Math.sin((x - y) * s * 0.6 + t * 0.07) * 1.2;
  };
  const step = () => {
    t += 0.016;
    for (const p of ps) {
      let a = field(p.x, p.y);
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 32400) a += (1 - d2 / 32400) * 2.2;
      p.x += Math.cos(a) * 1.1;
      p.y += Math.sin(a) * 1.1;
      p.tr.push(p.x, p.y);
      if (p.tr.length > 110) p.tr.splice(0, 2);
      if (++p.age > p.life || p.x < -30 || p.x > w + 30 || p.y < -30 || p.y > h + 30) Object.assign(p, spawn());
    }
  };
  const B = 4;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    const paths = Array.from({ length: B }, () => new Path2D());
    for (const p of ps) {
      if (p.tr.length < 4) continue;
      const f = Math.min(p.age / 60, (p.life - p.age) / 60, 1);
      const path = paths[Math.min(B - 1, Math.floor(f * B))];
      path.moveTo(p.tr[0], p.tr[1]);
      for (let i = 2; i < p.tr.length; i += 2) path.lineTo(p.tr[i], p.tr[i + 1]);
    }
    paths.forEach((path, i) => { ctx.globalAlpha = ((i + 1) / B) * 0.55; ctx.stroke(path); });
    ctx.globalAlpha = 1;
  };
  const still = () => { for (let i = 0; i < 90; i++) step(); draw(); };

  size();
  addEventListener('resize', () => { size(); if (reduce) still(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { setCol(); if (reduce) draw(); });

  if (reduce) {
    still();
  } else {
    addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
    for (let i = 0; i < 90; i++) step();
    const loop = () => { step(); draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
})();
