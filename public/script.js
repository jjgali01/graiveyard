// ===================== STARS =====================
function createStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  for (let i = 0; i < 80; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() < 0.6 ? 2 : 4;
    star.style.cssText = `
      width: ${size}px; height: ${size}px;
      top: ${Math.random() * 60}%;
      left: ${Math.random() * 100}%;
      --dur: ${2 + Math.random() * 4}s;
      --delay: ${Math.random() * 4}s;
    `;
    container.appendChild(star);
  }
}

// ===================== MEMORIALS =====================
let memorials = [];
let activeMemorial = null;

async function loadMemorials() {
  try {
    const res = await fetch(`/api/memorials?t=${Date.now()}`);
    const data = await res.json();
    memorials = [...data].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    renderMemorials();
    const g = document.getElementById('graveyard');
    if (g) g.scrollLeft = 0;
  } catch (err) {
    console.error('Failed to load memorials:', err);
  }
}

function getSizeClass(text) {
  if (text.length > 120) return 'large';
  if (text.length < 40) return 'small';
  return '';
}

function renderMemorials() {
  const container = document.getElementById('memorials-container');
  if (!container) return;
  container.innerHTML = '';

  if (memorials.length === 0) {
    container.classList.add('empty');
    const empty = document.createElement('div');
    empty.id = 'empty-state';
    empty.innerHTML = `
      <p>No memorials yet.<br>Be the first to lay something to rest.</p>
      <a href="submit.html" class="pixel-btn">LAY SOMETHING TO REST</a>
    `;
    container.appendChild(empty);
    return;
  }
  container.classList.remove('empty');

  memorials.forEach(m => {
    const wrap = document.createElement('div');
    wrap.className = 'gravestone-wrap';
    wrap.dataset.id = m.id;
    if (m.createdAt) wrap.dataset.createdAt = m.createdAt;

    // Gravestone base in lower-mid grass (8–14vh from bottom)
    const hash = m.id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000, 0);
    const marginBottom = 8 + (hash % 60) / 10;
    wrap.style.marginBottom = `${marginBottom}vh`;

    const sizeClass = getSizeClass(m.text);
    const imgHtml = m.image
      ? `<img class="grave-img" src="${m.image}" alt="memorial image" loading="lazy">`
      : '';
    const flowerEmojis = m.flowers > 0
      ? '🌸'.repeat(Math.min(m.flowers, 5))
      : '';

    const isFresh = m.createdAt && (Date.now() - new Date(m.createdAt).getTime() < 5 * 60 * 1000);
    if (isFresh) wrap.classList.add('fresh-dirt');

    wrap.innerHTML = `
      <div class="grave-dirt"></div>
      <div class="gravestone ${sizeClass}">
        <div class="grave-rip">R.I.P.</div>
        ${imgHtml}
        <div class="grave-epitaph">${escapeHtml(m.text)}</div>
      </div>
      <div class="grave-shadow"></div>
      <div class="grave-flowers">${flowerEmojis}</div>
    `;

    wrap.addEventListener('click', () => openModal(m));
    container.appendChild(wrap);

    if (isFresh && m.createdAt) {
      const elapsed = Date.now() - new Date(m.createdAt).getTime();
      const remaining = 5 * 60 * 1000 - elapsed;
      if (remaining > 0) {
        setTimeout(() => {
          wrap.classList.remove('fresh-dirt');
        }, remaining);
      }
    }
  });
  if (typeof updateScrollButtons === 'function') updateScrollButtons();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===================== MODAL =====================
function openModal(memorial) {
  activeMemorial = memorial;
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const flowerCount = document.getElementById('flower-count');

  const imgHtml = memorial.image
    ? `<img src="${memorial.image}" alt="memorial image">`
    : '';

  content.innerHTML = `
    <p style="font-size:9px; color: #a09888; margin-bottom:16px;">R.I.P.</p>
    ${imgHtml}
    <p>${escapeHtml(memorial.text)}</p>
  `;

  updateFlowerCount(memorial.flowers, flowerCount);
  overlay.classList.remove('hidden');
}

function updateFlowerCount(count, el) {
  if (!el) el = document.getElementById('flower-count');
  if (count === 0) {
    el.textContent = 'No flowers yet. Be the first to lay one.';
  } else {
    const emojis = '🌸'.repeat(Math.min(count, 8));
    el.textContent = `${emojis} ${count} flower${count === 1 ? '' : 's'} left here`;
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  activeMemorial = null;
}

async function layFlowers() {
  if (!activeMemorial) return;

  const btn = document.getElementById('lay-flowers-btn');
  btn.disabled = true;
  btn.textContent = '🌸 LAYING...';

  try {
    const res = await fetch(`/api/memorials/${activeMemorial.id}/flowers`, {
      method: 'POST'
    });
    const data = await res.json();

    activeMemorial.flowers = data.flowers;
    updateFlowerCount(data.flowers);

    // Update the gravestone on the page
    const wrap = document.querySelector(`.gravestone-wrap[data-id="${activeMemorial.id}"]`);
    if (wrap) {
      const flowerEl = wrap.querySelector('.grave-flowers');
      if (flowerEl) {
        flowerEl.textContent = '🌸'.repeat(Math.min(data.flowers, 5));
      }
    }

    // Update in our local array
    const idx = memorials.findIndex(m => m.id === activeMemorial.id);
    if (idx !== -1) memorials[idx].flowers = data.flowers;

    spawnFallingFlowers();
  } catch (err) {
    console.error('Failed to lay flowers:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = '🌸 LAY FLOWERS';
  }
}

// ===================== FLOWER ANIMATION =====================
function spawnFallingFlowers() {
  const container = document.getElementById('flower-animation');
  const flowers = ['🌸', '🌺', '🌼', '🌹', '💐'];
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'falling-flower';
      el.textContent = flowers[Math.floor(Math.random() * flowers.length)];
      el.style.left = `${Math.random() * 100}%`;
      el.style.animationDuration = `${1.2 + Math.random() * 1.5}s`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }, i * 80);
  }
}

// ===================== GROUNDSKEEPER =====================
function startGroundskeeperWalk() {
  const gk = document.getElementById('groundskeeper');
  if (!gk) return;

  const direction = gk.dataset.lastDirection === 'rtl' ? 'ltr' : 'rtl';
  gk.dataset.lastDirection = direction;

  gk.classList.remove('walking-ltr', 'walking-rtl');
  gk.offsetHeight;
  gk.classList.add('walking', `walking-${direction}`);

  gk.addEventListener('animationend', function onEnd() {
    gk.removeEventListener('animationend', onEnd);
    gk.classList.remove('walking', 'walking-ltr', 'walking-rtl');
    gk.style.transform = '';
    gk.style.left = '';
    gk.style.right = '';
    scheduleNextWalk();
  }, { once: true });
}

function scheduleNextWalk() {
  setTimeout(startGroundskeeperWalk, 45000 + Math.random() * 30000);
}

function toggleGroundskeeperSpeech() {
  const gk = document.getElementById('groundskeeper');
  const speech = document.getElementById('groundskeeper-speech');
  if (!gk?.classList.contains('walking') || !speech) return;

  if (gk.classList.contains('stopped')) {
    gk.classList.remove('stopped');
    speech.classList.add('hidden');
    return;
  }

  gk.classList.add('stopped');
  speech.textContent = 'Just the groundskeeper here. Sorry about your loss. I\'ve seen a lot of great things come and go.';
  speech.classList.remove('hidden');
}

// ===================== SCROLL BUTTONS =====================
function updateScrollButtons() {
  const graveyard = document.getElementById('graveyard');
  const scrollLeft = document.getElementById('scroll-left');
  const scrollRight = document.getElementById('scroll-right');
  if (!graveyard || !scrollLeft || !scrollRight) return;
  const { scrollLeft: scrollPos, scrollWidth, clientWidth } = graveyard;
  const canScroll = scrollWidth > clientWidth;
  scrollLeft.style.visibility = canScroll ? 'visible' : 'hidden';
  scrollRight.style.visibility = canScroll ? 'visible' : 'hidden';
  scrollLeft.disabled = scrollPos <= 0;
  scrollRight.disabled = scrollPos >= scrollWidth - clientWidth - 1;
}

function initScrollButtons() {
  const graveyard = document.getElementById('graveyard');
  const scrollLeft = document.getElementById('scroll-left');
  const scrollRight = document.getElementById('scroll-right');

  scrollLeft?.addEventListener('click', () => {
    graveyard?.scrollBy({ left: -400, behavior: 'smooth' });
  });
  scrollRight?.addEventListener('click', () => {
    graveyard?.scrollBy({ left: 400, behavior: 'smooth' });
  });

  graveyard?.addEventListener('scroll', updateScrollButtons);
  window.addEventListener('resize', updateScrollButtons);
  updateScrollButtons();
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  createStars();
  loadMemorials();
  initScrollButtons();

  setTimeout(startGroundskeeperWalk, 15000);

  document.getElementById('groundskeeper')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleGroundskeeperSpeech();
  });

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('lay-flowers-btn')?.addEventListener('click', layFlowers);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
});
