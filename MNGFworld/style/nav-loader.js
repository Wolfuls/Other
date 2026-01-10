
(() => {
  const mount = document.querySelector('[data-site-nav]');
  if (!mount) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div style="position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;
        background:#fff3;border:1px solid #fff6;padding:10px;border-radius:12px;">
        [site-nav] mountが見つかりません。<br>
        &lt;div data-site-nav ...&gt; をページ内に置いてください。
      </div>`
    );
    console.warn('[site-nav] mount not found');
    return;
  }

  const base = mount.getAttribute('data-base') || '..';
  const url = `${base}/nav.html`;

  console.log('[site-nav] fetching:', url);

  fetch(url, { cache: 'no-store' })
    .then(res => {
      console.log('[site-nav] status:', res.status);
      if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
      return res.text();
    })
    .then(html => {
      mount.innerHTML = html;

      // data-href があれば base 付きでhref化（なくてもOK）
      mount.querySelectorAll('a[data-href]').forEach(a => {
        a.href = `${base}${a.dataset.href}`;
      });

      // 現在ページをハイライト
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
      mount.innerHTML =
        `<div class="card">
          <p>メニュー読み込み失敗：${err.message}</p>
          <p style="font-size:12px;opacity:.75;">URL: ${url}</p>
        </div>`;
    });
})();


// ===== Auto hide site-nav dock (stable) =====
(() => {
  const dock = document.querySelector('.site-nav-dock');
  if (!dock) return;

  const HIDE_DELAY = 4000; // 4秒
  let timer = null;
  let armed = false;

  const hide = () => {
    dock.classList.add('is-hidden');
  };

  const showAndArm = () => {
    armed = true;
    dock.classList.remove('is-hidden');
    clearTimeout(timer);
    timer = setTimeout(hide, HIDE_DELAY);
  };

  // 初期状態：表示（まだ消えない）
  dock.classList.remove('is-hidden');

  // ユーザーの「明確な操作」だけ拾う
  ['scroll', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, showAndArm, { passive: true });
  });
})();


// ===== Page transition (fade in/out) =====
(() => {
  const enable = () => {
    // フェードイン
    requestAnimationFrame(() => document.body.classList.add('is-ready'));
  };

  // bfcache対策（戻る/進むで復帰した時も表示に戻す）
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('is-leaving');
    enable();
  });

  // 初回
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enable);
  } else {
    enable();
  }

  // フェードアウトしてから遷移（イベント委譲なのでnav-loaderで後から入るリンクもOK）
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;

    // 新規タブ系は邪魔しない
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;

    const href = a.getAttribute('href');
    if (!href) return;

    // 同一ページ内アンカー（#topなど）は遷移じゃないので除外
    if (href.startsWith('#')) return;

    // mailto/tel/js は除外
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

    // 外部サイトは除外（必要ならここ外してもOK）
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;

    // ここまで来たらフェードアウト遷移
    e.preventDefault();
    document.body.classList.add('is-leaving');

    setTimeout(() => {
      location.href = url.href;
    }, 220); // CSSより少し短めでもOK
  }, true);
})();
