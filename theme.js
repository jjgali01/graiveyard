(function() {
  const STORAGE_KEY = 'graiveyard-theme';

  function getTheme() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'day' ? 'day' : 'night';
    } catch {
      return 'night';
    }
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {}
    document.body.classList.toggle('day-mode', theme === 'day');
    if (theme === 'day') {
      createClouds();
    }
  }

  function createClouds() {
    const container = document.getElementById('clouds');
    if (!container || container.querySelector('.cloud')) return;

    const shapes = ['shape-1', 'shape-2', 'shape-3', 'shape-4', 'shape-5'];
    for (let i = 0; i < 6; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'cloud ' + shapes[i % shapes.length];
      cloud.style.cssText = `
        top: ${10 + Math.random() * 35}%;
        left: ${Math.random() * 100}%;
        opacity: ${0.7 + Math.random() * 0.3};
      `;
      container.appendChild(cloud);
    }
  }

  function init() {
    const theme = getTheme();
    document.body.classList.toggle('day-mode', theme === 'day');
    if (theme === 'day') createClouds();

    document.querySelectorAll('#theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = document.body.classList.contains('day-mode') ? 'night' : 'day';
        setTheme(next);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
