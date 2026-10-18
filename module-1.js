/**
 * โมดูลเสริมที่ 1: แถบจัดการเพลย์ลิสต์ด้านซ้ายมือ (Left Playlist Drawer)
 * แก้ไข: เปิดหน้าต่างฝั่งซ้ายแบบ Overlay โดยไม่ยืดหรือขยับหน้าสารบัญฝั่งขวา
 */
(function () {
  if (!window.ZenChantApp) return;

  let isDrawerOpen = false;

  const style = document.createElement('style');
  style.textContent = `
    #pl-hamburger-btn {
      position: fixed;
      top: 76px;
      left: 16px;
      z-index: 46;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    #pl-hamburger-btn.drawer-open {
      opacity: 0;
      pointer-events: none;
      transform: translateX(-12px);
    }
    #pl-left-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 340px;
      max-width: 88vw;
      z-index: 45;
      background-color: var(--bg-card);
      border-right: 1px solid var(--border-color);
      box-shadow: 6px 0 28px rgba(0, 0, 0, 0.12);
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
    }
    #pl-left-drawer.open {
      transform: translateX(0);
    }
    /* ซ่อนกล่องคิวแบบเดิมด้านบนสุดเพื่อไม่ให้ซ้ำซ้อน */
    #queue-bar, #saved-playlists-section {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  function createDrawerDOM() {
    if (document.getElementById('pl-left-drawer')) return;

    // ปุ่ม Hamburger ฝั่งซ้ายมือ
    const btn = document.createElement('button');
    btn.id = 'pl-hamburger-btn';
    btn.onclick = () => togglePlaylistDrawer();
    btn.className = 'px-3.5 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] shadow-md flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--text-primary)] transition';
    btn.title = 'เปิด/ปิด แถบจัดเพลย์ลิสต์บทสวดมนต์';
    btn.innerHTML = `
      <svg class="w-4 h-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
      <span>เพลย์ลิสต์</span>
      <span id="pl-btn-badge" class="hidden px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-[#FAF8F2] text-[11px] font-semibold leading-none">0</span>
    `;
    document.body.appendChild(btn);

    // หน้าต่าง Sidebar ฝั่งซ้ายมือ
    const drawer = document.createElement('aside');
    drawer.id = 'pl-left-drawer';
    drawer.innerHTML = `
      <!-- Header -->
      <div class="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]/60">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-[var(--accent)] text-[#FAF8F2] text-xs font-bold flex items-center justify-center" id="pl-drawer-count">0</span>
          <div>
            <h3 class="font-serif-thai font-semibold text-sm text-[var(--text-primary)] leading-tight">จัดลำดับ & เพลย์ลิสต์</h3>
            <p class="text-[11px] text-[var(--text-muted)]">เลื่อนเลือกบทสวดฝั่งขวาได้ทันที</p>
          </div>
        </div>
        <button onclick="window.togglePlaylistDrawer(false)" class="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          ✕ ปิด
        </button>
      </div>

      <!-- ปุ่มเริ่มสวด & บันทึกเพลย์ลิสต์ -->
      <div class="p-3.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 space-y-2">
        <div class="flex items-center gap-1.5">
          <button onclick="startChantingQueue()" id="pl-start-queue-btn"
            class="flex-1 py-2 px-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#FAF8F2] text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40">
            <span>▶ เริ่มสวดตามลำดับนี้</span>
          </button>
          <button onclick="clearQueue()"
            class="py-2 px-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-red-400 text-xs text-[var(--text-secondary)] transition"
            title="ล้างรายการที่เลือก">
            ล้างคิว
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <input type="text" id="pl-quick-name-input" placeholder="ตั้งชื่อเพลย์ลิสต์เพื่อบันทึก..."
            class="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs focus:outline-none focus:border-[var(--accent)]" />
          <button onclick="window.saveDrawerPlaylist()"
            class="px-3 py-1.5 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] text-xs font-semibold whitespace-nowrap transition">
            ★ บันทึก
          </button>
        </div>
      </div>

      <!-- รายการที่กำลังเลือก + เพลย์ลิสต์ที่บันทึกไว้ -->
      <div class="flex-1 overflow-y-auto p-3.5 space-y-5">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-[var(--text-secondary)]">รายการที่เลือกไว้ (<span id="pl-queue-len">0</span> บท)</span>
            <span class="text-[10px] text-[var(--text-muted)]">กด ↑ ↓ เพื่อเรียงลำดับ</span>
          </div>
          <div id="pl-drawer-queue-list" class="space-y-1.5"></div>
        </div>

        <div class="pt-3 border-t border-[var(--border-color)]">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-[var(--accent)]">★ เพลย์ลิสต์ที่บันทึกไว้</span>
          </div>
          <div id="pl-drawer-saved-list" class="space-y-2"></div>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);
  }

  window.togglePlaylistDrawer = function (forceState) {
    isDrawerOpen = typeof forceState === 'boolean' ? forceState : !isDrawerOpen;
    const drawer = document.getElementById('pl-left-drawer');
    const btn = document.getElementById('pl-hamburger-btn');
    if (!drawer || !btn) return;

    drawer.classList.toggle('open', isDrawerOpen);
    btn.classList.toggle('drawer-open', isDrawerOpen);
    renderDrawerContent();
  };

  window.saveDrawerPlaylist = function () {
    if (selectedQueueIds.length === 0) {
      showToast('กรุณาติ๊กเลือกบทสวดอย่างน้อย 1 บทก่อนบันทึก');
      return;
    }
    const input = document.getElementById('pl-quick-name-input');
    let name = (input ? input.value : '').trim();
    if (!name) {
      name = prompt('ตั้งชื่อเพลย์ลิสต์สวดมนต์:') || '';
      name = name.trim();
    }
    if (!name) return;

    const existingIdx = playlistsData.findIndex(p => p.name === name);
    const record = {
      id: existingIdx >= 0 ? playlistsData[existingIdx].id : 'pl-' + Date.now(),
      name,
      chantIds: [...selectedQueueIds]
    };

    if (existingIdx >= 0) {
      playlistsData[existingIdx] = record;
      showToast(`อัปเดตเพลย์ลิสต์ "${name}" แล้ว`);
    } else {
      playlistsData.push(record);
      showToast(`บันทึกเพลย์ลิสต์ "${name}" แล้ว`);
    }
    if (input) input.value = '';
    savePlaylistsToStorage();
    renderDrawerContent();
  };

  function renderDrawerContent() {
    const countEl = document.getElementById('pl-drawer-count');
    const lenEl = document.getElementById('pl-queue-len');
    const badgeEl = document.getElementById('pl-btn-badge');
    const startBtn = document.getElementById('pl-start-queue-btn');
    const queueList = document.getElementById('pl-drawer-queue-list');
    const savedList = document.getElementById('pl-drawer-saved-list');

    if (!queueList || !savedList) return;

    const count = selectedQueueIds.length;
    if (countEl) countEl.textContent = count;
    if (lenEl) lenEl.textContent = count;
    if (startBtn) startBtn.disabled = count === 0;

    if (badgeEl) {
      badgeEl.textContent = count;
      badgeEl.classList.toggle('hidden', count === 0);
    }

    if (count === 0) {
      queueList.innerHTML = `
        <div class="p-4 rounded-xl border border-dashed border-[var(--border-color)] text-center text-xs text-[var(--text-muted)]">
          ยังไม่ได้เลือกบทสวดเข้าลำดับ<br>
          <span class="text-[11px]">ติ๊กเครื่องหมาย ✓ หน้าบทสวดที่ต้องการในรายการฝั่งขวาเพื่อนำมาเรียงต่อกัน</span>
        </div>
      `;
    } else {
      queueList.innerHTML = selectedQueueIds.map((id, idx) => {
        const c = chantsData.find(x => x.id === id);
        if (!c) return '';
        return `
          <div class="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between gap-1.5 text-xs">
            <div class="min-w-0 flex-1">
              <div class="font-medium text-[var(--text-primary)] truncate">
                <strong class="text-[var(--accent)]">${idx + 1}.</strong> ${escapeHtml(c.title)}
              </div>
              <div class="text-[10px] text-[var(--text-muted)] truncate">${escapeHtml(c.category || '')}</div>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <button onclick="moveQueueItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="px-1.5 py-0.5 rounded hover:bg-black/5 disabled:opacity-25">↑</button>
              <button onclick="moveQueueItem(${idx}, 1)" ${idx === count - 1 ? 'disabled' : ''} class="px-1.5 py-0.5 rounded hover:bg-black/5 disabled:opacity-25">↓</button>
              <button onclick="removeQueueItem(${idx})" class="px-1.5 py-0.5 rounded text-red-600 hover:bg-red-500/10">✕</button>
            </div>
          </div>
        `;
      }).join('');
    }

    if (!playlistsData || playlistsData.length === 0) {
      savedList.innerHTML = `<div class="text-xs text-[var(--text-muted)] text-center py-3">ยังไม่มีเพลย์ลิสต์ที่บันทึกไว้</div>`;
    } else {
      savedList.innerHTML = playlistsData.map(pl => {
        const validChants = (pl.chantIds || []).map(id => chantsData.find(c => c.id === id)).filter(Boolean);
        return `
          <div class="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-serif-thai font-semibold text-xs text-[var(--text-primary)] truncate">${escapeHtml(pl.name)}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-medium shrink-0">${validChants.length} บท</span>
            </div>
            <div class="text-[10px] text-[var(--text-muted)] line-clamp-2">${escapeHtml(validChants.map(c => c.title).join(' → '))}</div>
            <div class="flex items-center justify-end gap-1 pt-1 border-t border-[var(--border-color)]/60">
              <button onclick="loadPlaylistIntoQueue('${pl.id}')" class="px-2 py-1 rounded text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">ดึงมาแก้</button>
              <button onclick="deleteSavedPlaylist('${pl.id}')" class="px-2 py-1 rounded text-[11px] text-red-600 hover:bg-red-500/10">ลบ</button>
              <button onclick="playSavedPlaylist('${pl.id}')" class="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[#FAF8F2] text-[11px] font-medium hover:opacity-90">▶ เปิดสวด</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function updateVisibilityByView() {
    const isHome = !document.getElementById('home-view').classList.contains('hidden');
    const btn = document.getElementById('pl-hamburger-btn');
    const drawer = document.getElementById('pl-left-drawer');
    if (btn) btn.style.display = isHome ? 'flex' : 'none';
    if (drawer) drawer.style.display = isHome ? 'flex' : 'none';
  }

  window.ZenChantApp.registerModule({
    name: 'playlist-left-drawer',
    init: () => {
      createDrawerDOM();
      renderDrawerContent();

      const origUpdateQueue = window.updateQueueBarUI;
      window.updateQueueBarUI = function () {
        if (typeof origUpdateQueue === 'function') origUpdateQueue();
        renderDrawerContent();
      };

      const origRenderPlaylists = window.renderPlaylistsSection;
      window.renderPlaylistsSection = function () {
        if (typeof origRenderPlaylists === 'function') origRenderPlaylists();
        renderDrawerContent();
      };

      const origToggleQueue = window.toggleChantInQueue;
      window.toggleChantInQueue = function (chantId) {
        const wasEmpty = selectedQueueIds.length === 0;
        if (typeof origToggleQueue === 'function') origToggleQueue(chantId);
        if (wasEmpty && selectedQueueIds.length === 1 && !isDrawerOpen) {
          window.togglePlaylistDrawer(true);
        }
        renderDrawerContent();
      };

      const observer = new MutationObserver(updateVisibilityByView);
      const homeView = document.getElementById('home-view');
      if (homeView) observer.observe(homeView, { attributes: true, attributeFilter: ['class'] });
    },
    onEnterChanting: () => updateVisibilityByView(),
    onExitChanting: () => {
      updateVisibilityByView();
      renderDrawerContent();
    }
  });
})();