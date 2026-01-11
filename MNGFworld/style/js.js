
// ===== Global site navigation loader (debuggable) =====
(() => {
  const mount = document.querySelector('[data-site-nav]');
  if (!mount) {
    console.warn('[site-nav] mount not found: add <div data-site-nav ...></div>');
    return;
  }

  const base = mount.getAttribute('data-base') || '..';
  const url = `${base}/nav.html`;

  console.log('[site-nav] fetching:', url);

  fetch(url, { cache: 'no-store' })
    .then(res => {
      if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
      return res.text();
    })
    .then(html => {
      mount.innerHTML = html;

      // data-href がある場合だけ変換（nav.htmlが普通のhrefでも動くように）
      mount.querySelectorAll('a[data-href]').forEach(a => {
        a.href = `${base}${a.dataset.href}`;
      });

      // 現在ページのハイライト
      const here = location.pathname.split('/').pop();
      mount.querySelectorAll('a[href]').forEach(a => {
        if (a.getAttribute('href')?.endsWith(here)) {
          a.setAttribute('aria-current', 'page');
        }
      });

      console.log('[site-nav] injected OK');
    })
    .catch(err => {
      console.error('[site-nav] error:', err);
      // 失敗したのが見えるように、画面にも出す
      mount.innerHTML = `<div class="card"><p>メニュー読み込み失敗：${String(err.message)}</p>
      <p style="font-size:12px;opacity:.75;">${url} を開けているか確認してください（file:// 直開きだと失敗しやすい）</p></div>`;
    });
})();

(() => {
  const dock = document.querySelector('.site-nav-dock');
  if (!dock) return;

  let timer = null;
  const HIDE_DELAY = 4000;

  const hide = () => dock.classList.add('is-hidden');
  const show = () => {
    dock.classList.remove('is-hidden');
    clearTimeout(timer);
    timer = setTimeout(hide, HIDE_DELAY);
  };

  show();

  ['mousemove', 'scroll', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, show, { passive: true });
  });
})();
