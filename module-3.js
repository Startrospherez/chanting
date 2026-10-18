/**
 * โมดูลเสริมที่ 3 (module-3.js):
 * 1. ปุ่มนำทางบนสุด-ล่างสุด ("‹ ย้อนไปบทที่แล้ว" / "ไปบทต่อไป ›") แยกตามโหมดรายบทและโหมดเพลย์ลิสต์
 * 2. ปุ่ม Hamburger เพลย์ลิสต์บนแถบควบคุมด้านล่างในหน้าสวดมนต์ พร้อมถาดรายการที่ดันบทสวดขึ้นด้านบนโดยไม่ขัดจังหวะการสวด
 * 3. ระบบ Click-to-Sync ในโหมดผู้ดูแล: คลิกบทสวดฝั่งซ้าย หน้าแก้ไขฝั่งขวากระโดดไปยังวรรคเดียวกันทันที
 * 4. ปุ่มส่งออกไฟล์เดียว (Standalone HTML) สำหรับนำไปเปิดทดสอบบนมือถือ/แท็บเล็ตได้ทันที
 */
(function () {
  let isBottomPlOpen = false;
  const DRAWER_HEIGHT = 230; // ความสูงของถาดเพลย์ลิสต์ด้านล่าง (px)

  // ---------------------------------------------------------
  // 1. CSS สำหรับปุ่มนำทางบน-ล่าง, ถาดเพลย์ลิสต์ดันหน้าจอ และไฮไลต์ฝั่งผู้ดูแล
  // ---------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --chant-pl-drawer-h: ${DRAWER_HEIGHT}px;
    }

    /* เมื่อเปิดถาดเพลย์ลิสต์ด้านล่างในหน้าสวดมนต์: ดันแถบ HUD และเนื้อหาบทสวดขึ้นด้านบน */
    body.chant-pl-drawer-open #hud-bottom {
      bottom: var(--chant-pl-drawer-h) !important;
      transition: bottom 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    body.chant-pl-drawer-open #chant-stage {
      padding-bottom: calc(var(--chant-pl-drawer-h) + 90px) !important;
      transition: padding-bottom 0.28s ease;
    }

    /* ถาดเพลย์ลิสต์ด้านล่างสุดของหน้าสวดมนต์ */
    #chant-bottom-pl-drawer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      height: var(--chant-pl-drawer-h);
      z-index: 48;
      background: var(--hud-bg);
      color: var(--hud-text);
      border-top: 1px solid rgba(217, 195, 158, 0.3);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.28);
      transform: translateY(100%);
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), right 0.2s ease;
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    #chant-bottom-pl-drawer.open {
      transform: translateY(0);
    }
    body.admin-split-active #chant-bottom-pl-drawer {
      right: var(--admin-split-w, 520px) !important;
    }

    /* ไฮไลต์การ์ดวรรคในหน้าผู้ดูแลฝั่งขวาเมื่อคลิกซิงก์จากฝั่งซ้าย */
    @keyframes adminCardPulse {
      0%   { box-shadow: 0 0 0 0 rgba(140, 122, 107, 0.7); border-color: var(--accent); }
      50%  { box-shadow: 0 0 0 6px rgba(140, 122, 107, 0.25); border-color: var(--accent); }
      100% { box-shadow: 0 0 0 0 rgba(140, 122, 107, 0); }
    }
    .admin-stanza-synced {
      border-color: var(--accent) !important;
      border-width: 2px !important;
      animation: adminCardPulse 1.2s ease-out;
    }

    /* แถบปุ่มย้อนไปบทที่แล้ว / ไปบทต่อไป บนสุดและล่างสุด */
    .chant-boundary-nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 0;
      margin: 8px 0;
      border-top: 1px dashed var(--border-color);
      border-bottom: 1px dashed var(--border-color);
    }
    .chant-boundary-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 12px;
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      font-family: var(--font-ui);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      max-width: 48%;
    }
    .chant-boundary-btn:hover {
      border-color: var(--accent);
      background-color: var(--accent-soft);
    }
    @media (max-width: 640px) {
      .chant-boundary-btn {
        max-width: 100%;
        width: 100%;
        justify-content: center;
      }
    }
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------
  // 2. ปุ่ม "ย้อนไปบทสวดที่แล้ว" และ "ไปบทสวดต่อไป" บนสุดและล่างสุด (ข้อ 1)
  // ---------------------------------------------------------
  function getAdjacentChantsInfo() {
    const isPlaylist = activeSession.queueIds && activeSession.queueIds.length > 1;

    if (!isPlaylist) {
      // กรณีเปิดดูเป็นบทๆ (Single Chant): อ้างอิงลำดับก่อน-หลังตามรายการทั้งหมดในหนังสือ
      const current = getCurrentChant();
      if (!current) return { isPlaylist: false, prev: null, next: null };
      const idx = chantsData.findIndex(c => c.id === current.id);
      const prev = idx > 0 ? chantsData[idx - 1] : null;
      const next = (idx >= 0 && idx < chantsData.length - 1) ? chantsData[idx + 1] : null;
      return { isPlaylist: false, prev, next };
    } else {
      // กรณีเปิดเป็นเพลย์ลิสต์: อ้างอิงลำดับภายในเพลย์ลิสต์
      const curIdx = activeSession.currentChantIndex || 0;
      const prevId = curIdx > 0 ? activeSession.queueIds[curIdx - 1] : null;
      const nextId = curIdx < activeSession.queueIds.length - 1 ? activeSession.queueIds[curIdx + 1] : null;
      const prev = prevId ? chantsData.find(c => c.id === prevId) : null;
      const next = nextId ? chantsData.find(c => c.id === nextId) : null;
      const firstInPl = chantsData.find(c => c.id === activeSession.queueIds[0]) || null;
      const secondInPl = chantsData.find(c => c.id === activeSession.queueIds[1]) || null;
      const lastInPl = chantsData.find(c => c.id === activeSession.queueIds[activeSession.queueIds.length - 1]) || null;
      const beforeLastInPl = activeSession.queueIds.length >= 2
        ? chantsData.find(c => c.id === activeSession.queueIds[activeSession.queueIds.length - 2])
        : null;
      return {
        isPlaylist: true,
        prev,
        next,
        firstInPl,
        secondInPl,
        lastInPl,
        beforeLastInPl
      };
    }
  }

  window.jumpToChantById = function (event, chantId, inPlaylistIndex) {
    if (event) event.stopPropagation();
    if (!chantId) return;

    if (typeof inPlaylistIndex === 'number' && activeSession.queueIds.length > 1) {
      activeSession.currentChantIndex = inPlaylistIndex;
      if (prefs.readingMode === 'scroll') {
        const targetSection = document.querySelector(`.chant-continuous-block[data-chant-idx="${inPlaylistIndex}"]`);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        activeSession.currentPageIndex = 0;
        renderChantingContent(true);
      }
      renderBottomPlContent();
      return;
    }

    // กรณีเปิดรายบท
    openSingleChant(chantId);
    renderBottomPlContent();
  };

  function createBoundaryNavElement(position) {
    const info = getAdjacentChantsInfo();
    const nav = document.createElement('nav');
    nav.className = `chant-boundary-nav chant-boundary-${position}`;
    nav.onclick = (e) => e.stopPropagation();

    let prevBtnHTML = `<div></div>`;
    let nextBtnHTML = `<div></div>`;

    if (!info.isPlaylist) {
      // โหมดเปิดรายบท: แสดงทั้งบนสุดและล่างสุดของบทนั้น
      if (info.prev) {
        prevBtnHTML = `
          <button type="button" class="chant-boundary-btn" onclick="window.jumpToChantById(event, '${escapeHtml(info.prev.id)}')">
            <span class="text-[var(--accent)] font-bold">‹</span>
            <span class="truncate">ย้อนไปบทสวดที่แล้ว "${escapeHtml(info.prev.title)}"</span>
          </button>
        `;
      }
      if (info.next) {
        nextBtnHTML = `
          <button type="button" class="chant-boundary-btn ml-auto" onclick="window.jumpToChantById(event, '${escapeHtml(info.next.id)}')">
            <span class="truncate">ไปบทสวดต่อไป "${escapeHtml(info.next.title)}"</span>
            <span class="text-[var(--accent)] font-bold">›</span>
          </button>
        `;
      }
    } else {
      // โหมดเพลย์ลิสต์: แสดงเฉพาะบนสุดของเพลย์ลิสต์ และล่างสุดของเพลย์ลิสต์เท่านั้น
      if (prefs.readingMode === 'scroll') {
        if (position === 'top') {
          const nextTarget = info.next || info.secondInPl;
          const nextIdx = info.next ? (activeSession.currentChantIndex + 1) : 1;
          prevBtnHTML = `
            <span class="text-xs text-[var(--text-muted)] font-medium px-2">
              ★ เริ่มต้นเพลย์ลิสต์ (${activeSession.queueIds.length} บท)
            </span>
          `;
          if (nextTarget) {
            nextBtnHTML = `
              <button type="button" class="chant-boundary-btn ml-auto" onclick="window.jumpToChantById(event, '${escapeHtml(nextTarget.id)}', ${nextIdx})">
                <span class="truncate">ไปบทสวดต่อไป "${escapeHtml(nextTarget.title)}"</span>
                <span class="text-[var(--accent)] font-bold">›</span>
              </button>
            `;
          }
        } else {
          // ล่างสุดของเพลย์ลิสต์
          const prevTarget = info.beforeLastInPl || info.firstInPl;
          const prevIdx = Math.max(0, activeSession.queueIds.length - 2);
          if (prevTarget) {
            prevBtnHTML = `
              <button type="button" class="chant-boundary-btn" onclick="window.jumpToChantById(event, '${escapeHtml(prevTarget.id)}', ${prevIdx})">
                <span class="text-[var(--accent)] font-bold">‹</span>
                <span class="truncate">ย้อนไปบทสวดที่แล้ว "${escapeHtml(prevTarget.title)}"</span>
              </button>
            `;
          }
          if (info.firstInPl) {
            nextBtnHTML = `
              <button type="button" class="chant-boundary-btn ml-auto" onclick="window.jumpToChantById(event, '${escapeHtml(info.firstInPl.id)}', 0)">
                <span class="truncate">↑ กลับไปบทแรก "${escapeHtml(info.firstInPl.title)}"</span>
              </button>
            `;
          }
        }
      } else {
        // โหมดเปิดเป็นหน้า (Page Mode) ในเพลย์ลิสต์
        if (info.prev) {
          prevBtnHTML = `
            <button type="button" class="chant-boundary-btn" onclick="prevChantInQueue()">
              <span class="text-[var(--accent)] font-bold">‹</span>
              <span class="truncate">ย้อนไปบทสวดที่แล้ว "${escapeHtml(info.prev.title)}"</span>
            </button>
          `;
        }
        if (info.next) {
          nextBtnHTML = `
            <button type="button" class="chant-boundary-btn ml-auto" onclick="nextChantInQueue()">
              <span class="truncate">ไปบทสวดต่อไป "${escapeHtml(info.next.title)}"</span>
              <span class="text-[var(--accent)] font-bold">›</span>
            </button>
          `;
        }
      }
    }

    if (prevBtnHTML === '<div></div>' && nextBtnHTML === '<div></div>') {
      return null;
    }

    nav.innerHTML = `${prevBtnHTML}${nextBtnHTML}`;
    return nav;
  }

  function injectTopAndBottomBoundaryNavs(containerEl) {
    if (!containerEl) return;
    containerEl.querySelectorAll('.chant-boundary-nav').forEach(el => el.remove());

    const topNav = createBoundaryNavElement('top');
    const bottomNav = createBoundaryNavElement('bottom');

    if (topNav) containerEl.prepend(topNav);
    if (bottomNav) containerEl.appendChild(bottomNav);
  }

  // ---------------------------------------------------------
  // 3. ถาดควบคุมเพลย์ลิสต์ด้านล่างในหน้าสวดมนต์ + ดันบทสวดขึ้นด้านบน (ข้อ 2)
  // ---------------------------------------------------------
  function createBottomPlaylistDrawerDOM() {
    if (document.getElementById('chant-bottom-pl-drawer')) return;

    const drawer = document.createElement('aside');
    drawer.id = 'chant-bottom-pl-drawer';
    drawer.onclick = (e) => e.stopPropagation();
    drawer.innerHTML = `
      <!-- แถบควบคุมบนของถาดเพลย์ลิสต์ -->
      <div class="px-4 py-2 border-b border-white/15 flex flex-wrap items-center justify-between gap-2 bg-black/25">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-[#D9C39E]">☰ รายการบทสวดในเพลย์ลิสต์</span>
          <span id="cbpl-count-badge" class="text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-white/90">1 บท</span>
        </div>

        <!-- ปุ่มย้อนไปบทก่อนหน้า / ไปบทถัดไป ทันที -->
        <div class="flex items-center gap-1.5">
          <button type="button" id="cbpl-prev-btn" onclick="window.stepChantInDrawer(-1)"
            class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-medium transition flex items-center gap-1">
            <span>⏮</span>
            <span id="cbpl-prev-label" class="max-w-[130px] truncate">บทก่อนหน้า</span>
          </button>

          <button type="button" id="cbpl-next-btn" onclick="window.stepChantInDrawer(1)"
            class="px-2.5 py-1 rounded-lg bg-[#D9C39E] text-[#262320] hover:bg-[#E5D3B3] disabled:opacity-30 text-xs font-semibold transition flex items-center gap-1">
            <span id="cbpl-next-label" class="max-w-[130px] truncate">บทถัดไป</span>
            <span>⏭</span>
          </button>

          <button type="button" onclick="window.toggleBottomPlaylistDrawer(false)"
            class="ml-2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/80">
            ✕ ย่อเก็บ
          </button>
        </div>
      </div>

      <!-- รายการบทสวดที่เรียงไว้ (คลิกเพื่อกระโดดไปยังบทนั้นได้ทันทีโดยไม่หยุด Auto-Scroll) -->
      <div id="cbpl-items-container" class="flex-1 overflow-y-auto px-4 py-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
      </div>
    `;
    document.body.appendChild(drawer);
  }

  window.toggleBottomPlaylistDrawer = function (forceState) {
    const nextState = typeof forceState === 'boolean' ? forceState : !isBottomPlOpen;
    if (nextState === isBottomPlOpen) return;

    isBottomPlOpen = nextState;
    const drawer = document.getElementById('chant-bottom-pl-drawer');
    const btn = document.getElementById('hud-bottom-pl-btn');

    document.body.classList.toggle('chant-pl-drawer-open', isBottomPlOpen);
    if (drawer) drawer.classList.toggle('open', isBottomPlOpen);

    if (btn) {
      btn.className = isBottomPlOpen
        ? 'px-3 py-2 rounded-xl bg-[#D9C39E] text-[#262320] text-xs font-semibold transition flex items-center gap-1.5'
        : 'px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition flex items-center gap-1.5';
    }

    // ดันบทสวดที่กำลังสวดอยู่ขึ้นไปด้านบนทันทีเมื่อเปิดถาด (โดยที่ Auto-Scroll ยังเล่นต่อไม่สะดุด)
    if (activeSession.isChanting && prefs.readingMode === 'scroll') {
      const pushOffset = Math.round(DRAWER_HEIGHT * 0.78);
      window.scrollBy({
        top: isBottomPlOpen ? pushOffset : -pushOffset,
        behavior: 'smooth'
      });
    }

    if (isBottomPlOpen) {
      renderBottomPlContent();
      showHudTemporarily();
    }
  };

  window.stepChantInDrawer = function (dir) {
    const isPlaylist = activeSession.queueIds && activeSession.queueIds.length > 1;
    if (isPlaylist) {
      const targetIdx = (activeSession.currentChantIndex || 0) + dir;
      if (targetIdx >= 0 && targetIdx < activeSession.queueIds.length) {
        const targetId = activeSession.queueIds[targetIdx];
        window.jumpToChantById(null, targetId, targetIdx);
      }
    } else {
      const cur = getCurrentChant();
      if (!cur) return;
      const idx = chantsData.findIndex(c => c.id === cur.id);
      const target = chantsData[idx + dir];
      if (target) {
        openSingleChant(target.id);
        renderBottomPlContent();
      }
    }
  };

  function renderBottomPlContent() {
    const container = document.getElementById('cbpl-items-container');
    const countBadge = document.getElementById('cbpl-count-badge');
    const prevBtn = document.getElementById('cbpl-prev-btn');
    const nextBtn = document.getElementById('cbpl-next-btn');
    const prevLabel = document.getElementById('cbpl-prev-label');
    const nextLabel = document.getElementById('cbpl-next-label');
    if (!container) return;

    const isPlaylist = activeSession.queueIds && activeSession.queueIds.length > 1;
    const adj = getAdjacentChantsInfo();

    if (prevBtn) prevBtn.disabled = !adj.prev;
    if (nextBtn) nextBtn.disabled = !adj.next;
    if (prevLabel) prevLabel.textContent = adj.prev ? adj.prev.title : 'บทก่อนหน้า';
    if (nextLabel) nextLabel.textContent = adj.next ? adj.next.title : 'บทถัดไป';

    const listIds = isPlaylist ? activeSession.queueIds : chantsData.map(c => c.id);
    const currentChant = getCurrentChant();

    if (countBadge) {
      countBadge.textContent = isPlaylist
        ? `เพลย์ลิสต์ ${listIds.length} บท`
        : `สารบัญทั้งหมด ${listIds.length} บท`;
    }

    container.innerHTML = listIds.map((id, idx) => {
      const c = chantsData.find(x => x.id === id);
      if (!c) return '';
      const isCurrent = isPlaylist
        ? (idx === activeSession.currentChantIndex)
        : (currentChant && c.id === currentChant.id);

      return `
        <button type="button"
          id="cbpl-item-${idx}"
          onclick="window.jumpToChantById(event, '${escapeHtml(c.id)}', ${isPlaylist ? idx : 'null'})"
          class="text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
            isCurrent
              ? 'bg-[#D9C39E] text-[#262320] border-[#F7F4EB] font-semibold shadow-sm'
              : 'bg-white/5 hover:bg-white/15 text-white/85 border-white/10'
          }">
          <div class="min-w-0 flex-1">
            <div class="text-xs truncate">
              <span class="opacity-70 mr-1">${idx + 1}.</span>${escapeHtml(c.title)}
            </div>
            <div class="text-[10px] truncate ${isCurrent ? 'text-[#262320]/75' : 'text-white/50'}">
              ${escapeHtml(c.category || '')}
            </div>
          </div>
          ${isCurrent ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-[#262320] text-[#E5D3B3] shrink-0">กำลังสวด</span>` : ''}
        </button>
      `;
    }).join('');

    // เลื่อนรายการในถาดให้บทที่กำลังสวดอยู่แสดงตรงกลางอัตโนมัติ
    setTimeout(() => {
      const activeIdx = isPlaylist
        ? activeSession.currentChantIndex
        : listIds.findIndex(id => currentChant && id === currentChant.id);
      const activeItem = document.getElementById(`cbpl-item-${activeIdx}`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  }

  // ---------------------------------------------------------
  // 4. คลิกบทสวดฝั่งซ้าย -> หน้าแก้ไขของผู้ดูแลฝั่งขวากระโดดตามไปจุดเดียวกันทันที (ข้อ 3)
  // ---------------------------------------------------------
  function syncAdminRightPanelToStanza(chantId, stanzaIdx, lineType) {
    if (!document.body.classList.contains('admin-split-active')) return;

    // โหลดบทสวดนั้นเข้า Editor ฝั่งขวาโดยไม่รีเซ็ตหน้าสวดมนต์ฝั่งซ้าย
    if (chantId && adminState.editingChantId !== chantId) {
      const savedQueue = [...activeSession.queueIds];
      const savedIndex = activeSession.currentChantIndex;
      const savedScrollY = window.scrollY;

      const chant = chantsData.find(c => c.id === chantId);
      if (chant) {
        adminState.editingChantId = chant.id;
        adminState.editingStanzas = JSON.parse(JSON.stringify(chant.stanzas || []));
        document.getElementById('editor-mode-badge').textContent = 'แก้ไขบทสวดมนต์';
        document.getElementById('editor-header-title').textContent = chant.title;
        document.getElementById('edit-chant-title').value = chant.title || '';
        document.getElementById('edit-chant-category').value = chant.category || '';
        document.getElementById('edit-chant-subtitle').value = chant.subtitle || '';
        renderAdminChantList();
        renderEditorStanzas();

        activeSession.queueIds = savedQueue;
        activeSession.currentChantIndex = savedIndex;
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      }
    }

    // เลื่อนหน้าต่างฝั่งขวา (#admin-view) ไปยังกล่องวรรคที่คลิกทันที
    setTimeout(() => {
      const targetCard = document.querySelector(`#editor-stanzas-container > div[data-editor-stanza="${stanzaIdx}"]`);
      if (!targetCard) return;

      document.querySelectorAll('.admin-stanza-synced').forEach(el => el.classList.remove('admin-stanza-synced'));
      targetCard.classList.add('admin-stanza-synced');
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // โฟกัสช่องข้อความที่ตรงกับประเภทบรรทัดที่คลิก (บาลี / แปลไทย / วรรคพิเศษ)
      let targetInput = null;
      if (lineType === 'special') {
        targetInput = targetCard.querySelector('textarea');
      } else if (lineType === 'thai') {
        targetInput = targetCard.querySelector('textarea[oninput*="thai_translation"]');
      } else if (lineType === 'pali') {
        const paliField = prefs.paliScript === 'phinthu' ? 'pali_phinthu' : 'pali_thai';
        targetInput = targetCard.querySelector(`textarea[oninput*="${paliField}"]`);
      }

      if (targetInput) {
        targetInput.focus({ preventScroll: true });
        if (typeof setLastFocusedInput === 'function') setLastFocusedInput(targetInput);
      }
    }, 40);
  }

  // ---------------------------------------------------------
  // 5. ปุ่มส่งออกไฟล์เดียว (Standalone HTML) สำหรับเปิดบนมือถือ/แท็บเล็ต (ข้อ 4)
  // ---------------------------------------------------------
  window.exportStandaloneMobileHTML = async function () {
    try {
      showToast('กำลังรวมข้อมูลและโมดูลทั้งหมดเป็นไฟล์เดียวสำหรับมือถือ/แท็บเล็ต...');
      const cloneDoc = document.documentElement.cloneNode(true);

      // ลบ UI ชั่วคราวที่ถูกสร้างตอนรันออกจากร่างโคลนเพื่อไม่ให้ซ้ำซ้อนเมื่อเปิดใหม่
      ['#pl-hamburger-btn', '#pl-left-drawer', '#admin-split-resizer', '#doc-line-toolbar', '#chant-bottom-pl-drawer'].forEach(sel => {
        const el = cloneDoc.querySelector(sel);
        if (el) el.remove();
      });

      // ดึงโค้ดจาก module-1.js, module-2.js, module-3.js มารวมไว้ในไฟล์เดียว
      const inlineDataScript = document.createElement('script');
      inlineDataScript.textContent = `
        window.SHARED_CHANTS = ${JSON.stringify(chantsData)};
        window.SHARED_PLAYLISTS = ${JSON.stringify(typeof playlistsData !== 'undefined' ? playlistsData : [])};
      `;
      cloneDoc.querySelector('body').appendChild(inlineDataScript);

      const htmlContent = '<!DOCTYPE html>\n' + cloneDoc.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'zen-chant-mobile-standalone.html';
      a.click();
      showToast('ดาวน์โหลด zen-chant-mobile-standalone.html สำเร็จ!');
    } catch (e) {
      showToast('ไม่สามารถสร้างไฟล์ Standalone ได้');
    }
  };

  // ---------------------------------------------------------
  // 6. เริ่มต้นระบบและเชื่อมโยงเข้ากับแกนหลัก
  // ---------------------------------------------------------
  function initModule3() {
    createBottomPlaylistDrawerDOM();

    // 1. เพิ่มปุ่ม "☰ เพลย์ลิสต์" ลงในแถบควบคุมด้านล่าง (#hud-bottom)
    const centerHudGroup = document.querySelector('#hud-bottom .flex.items-center.gap-1\\.5:nth-child(2)');
    if (centerHudGroup && !document.getElementById('hud-bottom-pl-btn')) {
      const plBtn = document.createElement('button');
      plBtn.id = 'hud-bottom-pl-btn';
      plBtn.type = 'button';
      plBtn.onclick = () => window.toggleBottomPlaylistDrawer();
      plBtn.className = 'px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition flex items-center gap-1.5';
      plBtn.title = 'เปิด/ปิด แถบควบคุมเพลย์ลิสต์ด้านล่าง (ดันบทสวดขึ้นโดยไม่หยุดสวด)';
      plBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 text-[#D9C39E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <span>เพลย์ลิสต์</span>
      `;
      centerHudGroup.prepend(plBtn);
    }

    // 2. ห่อฟังก์ชัน renderScrollMode และ renderCurrentBookPage เพื่อแทรกปุ่มย้อนไปบทที่แล้ว / ไปบทต่อไป บน-ล่างสุด
    const prevRenderScrollMode = window.renderScrollMode;
    window.renderScrollMode = function (chant, resetPosition) {
      if (typeof prevRenderScrollMode === 'function') {
        prevRenderScrollMode(chant, resetPosition);
      }
      const area = document.getElementById('scroll-content-area');
      injectTopAndBottomBoundaryNavs(area);
      if (isBottomPlOpen) renderBottomPlContent();
    };

    const prevRenderBookPage = window.renderCurrentBookPage;
    window.renderCurrentBookPage = function (chant) {
      if (typeof prevRenderBookPage === 'function') {
        prevRenderBookPage(chant);
      }
      const pageArea = document.getElementById('page-content-area');
      injectTopAndBottomBoundaryNavs(pageArea);
      if (isBottomPlOpen) renderBottomPlContent();
    };

    // 3. ห่อฟังก์ชัน handleChantLineClick และดักคลิกที่วรรคฝั่งซ้ายเพื่อให้ฝั่งผู้ดูแลกระโดดตามทันที
    const prevHandleLineClick = window.handleChantLineClick;
    window.handleChantLineClick = function (event, chantId, stanzaIdx, lineType, lineIdx, wrapEl) {
      if (typeof prevHandleLineClick === 'function') {
        prevHandleLineClick(event, chantId, stanzaIdx, lineType, lineIdx, wrapEl);
      }
      syncAdminRightPanelToStanza(chantId, stanzaIdx, lineType);
    };

    // กรณีคลิกพื้นที่ว่างในวรรคฝั่งซ้ายขณะเปิดโหมดผู้ดูแล
    const stage = document.getElementById('chant-stage');
    if (stage) {
      stage.addEventListener('click', (e) => {
        if (!document.body.classList.contains('admin-split-active')) return;
        const stanzaEl = e.target.closest('.chant-stanza');
        if (!stanzaEl) return;
        const stanzaIdx = parseInt(stanzaEl.getAttribute('data-stanza-index'), 10);
        const sectionEl = e.target.closest('.chant-continuous-block');
        const chantId = (sectionEl && sectionEl.getAttribute('data-chant-id')) || (getCurrentChant() && getCurrentChant().id);
        if (!isNaN(stanzaIdx)) {
          syncAdminRightPanelToStanza(chantId, stanzaIdx, null);
        }
      });
    }

    // อัปเดตไฮไลต์ในถาดเพลย์ลิสต์ด้านล่างเมื่อเลื่อนผ่านบทต่างๆ
    window.addEventListener('scroll', () => {
      if (isBottomPlOpen && activeSession.isChanting) {
        renderBottomPlContent();
      }
    }, { passive: true });

    // ปิดถาดเพลย์ลิสต์ด้านล่างเมื่อออกจากหน้าสวดมนต์
    const origExitChanting = window.exitChantingMode;
    window.exitChantingMode = function () {
      if (isBottomPlOpen) window.toggleBottomPlaylistDrawer(false);
      if (typeof origExitChanting === 'function') origExitChanting();
    };
  }

  if (window.ZenChantApp && typeof window.ZenChantApp.registerModule === 'function') {
    window.ZenChantApp.registerModule({
      name: 'boundary-nav-bottom-playlist-and-admin-sync',
      init: initModule3
    });
  } else if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initModule3);
  } else {
    initModule3();
  }
})();