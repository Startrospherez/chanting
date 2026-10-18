/**
 * โมดูลเสริมที่ 2 (module-2.js) — รุ่นอัปเกรด:
 * 1. เลือกปรับฟอนต์รายบรรทัดได้หลายบรรทัดพร้อมกัน + ปุ่มเลือกบาลีทั้งหมด / แปลไทยทั้งหมด / วรรคพิเศษทั้งหมด
 * 2. ปุ่ม "+ แทรกวรรคต่อจากนี้" และ "+ แทรกวรรคพิเศษต่อจากนี้" ท้ายทุกวรรค ไม่ต้องเลื่อนไปบนสุดหรือล่างสุด
 * 3. ระบบ "วรรคพิเศษ" (ฟอนต์กลางๆ สำหรับใส่ กราบ ๓ ครั้ง, หยุด, คำอธิบายบท, สวดย่อ/สวดเต็ม ข้ามหน้า ฯลฯ ปรับแต่งได้อิสระ)
 * 4. นำช่อง "คำกำกับวรรค" แบบเดิมออกทั้งหมดเพื่อไม่ให้ซ้ำซ้อนกับวรรคพิเศษ
 */
(function () {
  let isSplitAdminOpen = false;
  let isDocLineEditMode = false;
  let adminSplitWidth = 520;
  let multiSelectMode = true; // เปิดโหมดคลิกเลือกหลายบรรทัดเป็นค่าเริ่มต้น
  let selectedLines = []; // เก็บรายการบรรทัดที่ถูกเลือก: [{ keyId, chantId, stanzaIdx, lineType, lineIdx }]

  // ---------------------------------------------------------
  // 1. CSS สำหรับโหมดแบ่งครึ่งจอ, วรรคพิเศษ และระบบเลือกหลายบรรทัด
  // ---------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --admin-split-w: 520px;
    }

    /* โหมดแบ่งครึ่งจอ (Split-Screen Live Admin) */
    body.admin-split-active #home-view,
    body.admin-split-active #chanting-view {
      width: calc(100vw - var(--admin-split-w)) !important;
      max-width: calc(100vw - var(--admin-split-w)) !important;
      margin-right: var(--admin-split-w) !important;
      margin-left: 0 !important;
      transition: width 0.2s ease;
    }

    body.admin-split-active #hud-top,
    body.admin-split-active #hud-bottom {
      right: var(--admin-split-w) !important;
    }
    body.admin-split-active #focus-guide-line {
      left: calc((100vw - var(--admin-split-w)) / 2) !important;
      width: min(80%, calc(100vw - var(--admin-split-w) - 40px)) !important;
    }

    body.admin-split-active #admin-view {
      display: flex !important;
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: var(--admin-split-w) !important;
      max-width: 92vw !important;
      z-index: 55 !important;
      overflow-y: auto !important;
      border-left: 2px solid var(--accent) !important;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18) !important;
    }

    body.admin-split-active #admin-view main {
      display: flex !important;
      flex-direction: column !important;
      padding: 16px !important;
      gap: 16px !important;
    }

    /* แถบลากแบ่งครึ่งจอ */
    #admin-split-resizer {
      display: none;
      position: fixed;
      top: 0;
      bottom: 0;
      right: calc(var(--admin-split-w) - 5px);
      width: 10px;
      cursor: col-resize;
      z-index: 60;
      background: transparent;
    }
    #admin-split-resizer:hover,
    #admin-split-resizer.dragging {
      background: rgba(140, 122, 107, 0.35);
    }
    body.admin-split-active #admin-split-resizer {
      display: block;
    }

    /* บรรทัดบทสวดมนต์แบบคลิกเลือกได้ */
    .chant-doc-line-wrap {
      position: relative;
      display: flex;
      width: 100%;
      overflow: hidden;
      border-radius: 6px;
      transition: background-color 0.15s ease, outline 0.15s ease;
    }

    body.admin-split-active .chant-doc-line-wrap:hover,
    body.doc-line-edit-active .chant-doc-line-wrap:hover {
      background-color: rgba(140, 122, 107, 0.10);
      outline: 1px dashed var(--accent);
      cursor: pointer;
    }

    .chant-doc-line-wrap.line-selected {
      background-color: rgba(140, 122, 107, 0.20) !important;
      outline: 2px solid var(--accent) !important;
    }

    /* ป้ายบอกขนาด px มุมขวาของบรรทัด */
    .line-size-badge {
      display: none;
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      font-family: var(--font-ui);
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--accent);
      color: #FAF8F2;
      opacity: 0.85;
      pointer-events: none;
      z-index: 5;
    }
    body.admin-split-active .chant-doc-line-wrap:hover .line-size-badge,
    body.doc-line-edit-active .chant-doc-line-wrap:hover .line-size-badge,
    .chant-doc-line-wrap.has-custom-size .line-size-badge,
    .chant-doc-line-wrap.line-selected .line-size-badge {
      display: inline-block;
    }
    body:not(.admin-split-active):not(.doc-line-edit-active) .line-size-badge {
      display: none !important;
    }

    /* สไตล์ของ "วรรคพิเศษ" (Special Stanza) */
    .special-stanza-box {
      font-family: var(--font-ui);
      color: var(--text-secondary);
      transition: all 0.2s ease;
    }
    .special-stanza-box.style-badge .chant-doc-line-inner {
      display: inline-block;
      width: auto !important;
      padding: 4px 14px;
      border-radius: 999px;
      background-color: var(--accent-soft);
      color: var(--accent);
      border: 1px solid var(--border-color);
      font-weight: 500;
    }
    .special-stanza-box.style-box {
      padding: 10px 16px;
      border-radius: 12px;
      background-color: var(--bg-secondary);
      border: 1px dashed var(--border-color);
    }
    .special-stanza-box.style-accent .chant-doc-line-inner {
      color: var(--accent);
      font-weight: 500;
    }

    /* Floating Toolbar สไตล์ MS Word / Google Docs */
    #doc-line-toolbar {
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 80;
      background: rgba(34, 31, 28, 0.96);
      color: #F7F4EB;
      border: 1px solid rgba(217, 195, 158, 0.4);
      border-radius: 16px;
      padding: 10px 14px;
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      display: none;
      flex-direction: column;
      gap: 8px;
      width: min(95vw, 560px);
    }
    body.admin-split-active #doc-line-toolbar {
      left: calc((100vw - var(--admin-split-w)) / 2);
      width: min(calc(100vw - var(--admin-split-w) - 24px), 560px);
    }
    #doc-line-toolbar.show {
      display: flex;
    }
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------
  // 2. สร้าง DOM สำหรับ Splitter และ Floating Toolbar แบบเลือกหลายบรรทัด
  // ---------------------------------------------------------
  function createSplitAndToolbarDOM() {
    if (!document.getElementById('admin-split-resizer')) {
      const resizer = document.createElement('div');
      resizer.id = 'admin-split-resizer';
      resizer.title = 'ลากเพื่อปรับสัดส่วนหน้าจอซ้าย-ขวา';
      document.body.appendChild(resizer);

      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        resizer.classList.add('dragging');
        const moveHandler = (ev) => {
          const newW = Math.max(360, Math.min(window.innerWidth * 0.72, window.innerWidth - ev.clientX));
          adminSplitWidth = Math.round(newW);
          document.documentElement.style.setProperty('--admin-split-w', `${adminSplitWidth}px`);
        };
        const upHandler = () => {
          resizer.classList.remove('dragging');
          window.removeEventListener('mousemove', moveHandler);
          window.removeEventListener('mouseup', upHandler);
        };
        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
      });
    }

    if (!document.getElementById('doc-line-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'doc-line-toolbar';
      toolbar.onclick = (e) => e.stopPropagation();
      toolbar.innerHTML = `
        <!-- แถวที่ 1: ปุ่มเลือกกลุ่มบรรทัด (เลือกบาลีทั้งหมด / แปลไทยทั้งหมด / วรรคพิเศษ / หลายบรรทัด) -->
        <div class="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/15 pb-2">
          <div class="flex flex-wrap items-center gap-1">
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#D9C39E] text-[#262320]" id="dtb-line-label">เลือก 0 บรรทัด</span>
            <button onclick="window.selectLinesByGroup('pali')" class="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#D9C39E] hover:text-[#262320] text-[11px] font-medium transition">
              เลือกบาลีทั้งหมด
            </button>
            <button onclick="window.selectLinesByGroup('thai')" class="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#D9C39E] hover:text-[#262320] text-[11px] font-medium transition">
              เลือกไทยทั้งหมด
            </button>
            <button onclick="window.selectLinesByGroup('special')" class="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#D9C39E] hover:text-[#262320] text-[11px] font-medium transition">
              เลือกวรรคพิเศษ
            </button>
            <button onclick="window.selectLinesByGroup('all')" class="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-white/80 transition">
              ทั้งหมด
            </button>
            <button onclick="window.clearLineSelection()" class="px-2 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] transition">
              ล้างที่เลือก
            </button>
          </div>
          <button onclick="window.closeDocLineToolbar()" class="px-1.5 py-0.5 text-white/60 hover:text-white text-xs" title="ซ่อนแถบเครื่องมือ">✕</button>
        </div>

        <!-- แถวที่ 2: โหมดคลิกเลือกหลายบรรทัด + ปุ่มจัดพอดี 1 บรรทัด + รีเซ็ต -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <label class="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-[#E5D3B3]">
            <input type="checkbox" id="dtb-multiselect-chk" checked onchange="window.toggleMultiSelectLineMode(this.checked)" class="accent-[#D9C39E] rounded" />
            <span>คลิกเลือกหลายบรรทัดพร้อมกัน</span>
          </label>
          <div class="flex items-center gap-1.5">
            <button onclick="window.autoFitSelectedLines()" class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-[#E5D3B3] text-[11px] font-medium transition">
              ⚡ จัดที่เลือกให้พอดี 1 บรรทัด
            </button>
            <button onclick="window.resetSelectedLinesStyle()" class="px-2 py-1 rounded-lg bg-white/10 hover:bg-red-500/20 text-red-300 text-[11px] transition">
              ↺ รีเซ็ตขนาดที่เลือก
            </button>
          </div>
        </div>

        <!-- แถวที่ 3: ปรับขนาดฟอนต์ (px) และความกว้างคำ (%) พร้อมกันทุกบรรทัดที่เลือก -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
          <div class="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-xl">
            <span class="text-[11px] text-white/70 pl-1">ขนาดฟอนต์:</span>
            <button onclick="window.adjustSelectedLinesFontSize(-2)" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold">A-</button>
            <input type="number" id="dtb-fontsize-input" min="12" max="130" step="1"
              oninput="window.setSelectedLinesFontSize(this.value)"
              class="w-14 text-center bg-transparent border border-white/20 rounded-lg py-0.5 text-xs font-semibold text-[#E5D3B3] focus:outline-none focus:border-[#D9C39E]" />
            <span class="text-[11px] text-white/60">px</span>
            <button onclick="window.adjustSelectedLinesFontSize(2)" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold">A+</button>
          </div>

          <div class="flex items-center gap-2 bg-black/30 p-1.5 rounded-xl">
            <span class="text-[11px] text-white/70 whitespace-nowrap pl-1">บีบ/ยืดคำ:</span>
            <input type="range" id="dtb-scalex-slider" min="55" max="115" step="1"
              oninput="window.setSelectedLinesScaleX(this.value)"
              class="zen-slider flex-1" />
            <span id="dtb-scalex-val" class="text-[11px] font-semibold text-[#E5D3B3] min-w-[36px] text-right">92%</span>
          </div>
        </div>

        <!-- แถวที่ 4: ช่องแก้ไขข้อความ (เมื่อเลือก 1 บรรทัด) -->
        <div id="dtb-single-text-wrap" class="flex items-center gap-1.5">
          <input type="text" id="dtb-line-text-input"
            oninput="window.updateSelectedLineText(this.value)"
            placeholder="คลิกเลือกบรรทัดเพื่อแก้ไขข้อความ หรือปรับขนาดฟอนต์..."
            class="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/20 text-sm font-serif-thai text-[#F7F4EB] focus:outline-none focus:border-[#D9C39E]" />
        </div>
      `;
      document.body.appendChild(toolbar);
    }
  }

  // ---------------------------------------------------------
  // 3. ระบบเรนเดอร์บทสวด (ตัดคำกำกับวรรคออก + รองรับ "วรรคพิเศษ" + เลือกหลายบรรทัด)
  // ---------------------------------------------------------
  function getLineStyleKey(lineType, lineIdx) {
    if (lineType === 'thai') return `thai_${lineIdx}`;
    if (lineType === 'special') return `special_${lineIdx}`;
    return `pali_${prefs.paliScript}_${lineIdx}`;
  }

  function makeSelectionKey(chantId, stanzaIdx, lineType, lineIdx) {
    return `${chantId}__${stanzaIdx}__${lineType}__${lineIdx}`;
  }

  window.buildStanzaHTML = function (stanza, index, explicitChantId) {
    const currentChantObj = getActiveEditingChant();
    const chantId = explicitChantId || (currentChantObj ? currentChantObj.id : 'default');

    const defaultPaliSize = prefs.fontSize || 28;
    const defaultThaiSize = Math.max(16, Math.round(defaultPaliSize * 0.72));
    const defaultSpecialSize = Math.max(16, Math.round(defaultPaliSize * 0.68));
    const defaultScaleX = prefs.fontScaleX || 92;
    const lh = prefs.lineHeight || 1.45;
    const lineStyles = stanza.lineStyles || {};

    const renderLinesBlock = (rawText, lineType, baseFontSize, textColorClass, fontClass, lineLh, alignOverride) => {
      const effectiveAlign = alignOverride || prefs.textAlign || 'center';
      const isCenter = effectiveAlign === 'center';
      const isRight = effectiveAlign === 'right';
      const flexJustify = isCenter ? 'center' : (isRight ? 'flex-end' : 'flex-start');
      const transformOrigin = isCenter ? 'center top' : (isRight ? 'right top' : 'left top');

      const lines = String(rawText).split('\n');
      return lines.map((lineStr, lineIdx) => {
        const key = getLineStyleKey(lineType, lineIdx);
        const fallbackKey = `${lineType}_${lineIdx}`;
        const custom = lineStyles[key] || lineStyles[fallbackKey] || {};

        const finalSizePx = custom.fontSize ? Number(custom.fontSize) : baseFontSize;
        const finalScaleX = custom.scaleX ? Number(custom.scaleX) : defaultScaleX;
        const scaleRatio = finalScaleX / 100;
        const inverseWidthPct = (100 / scaleRatio).toFixed(2);
        const hasCustom = Boolean(custom.fontSize || custom.scaleX);

        const selKey = makeSelectionKey(chantId, index, lineType, lineIdx);
        const isSelected = selectedLines.some(item => item.keyId === selKey);

        return `
          <div class="chant-doc-line-wrap ${hasCustom ? 'has-custom-size' : ''} ${isSelected ? 'line-selected' : ''}"
            style="justify-content:${flexJustify};"
            data-chant-id="${escapeHtml(chantId)}"
            data-stanza-idx="${index}"
            data-line-type="${lineType}"
            data-line-idx="${lineIdx}"
            onclick="window.handleChantLineClick(event, '${escapeHtml(chantId)}', ${index}, '${lineType}', ${lineIdx}, this)">
            <div class="chant-doc-line-inner ${fontClass} ${textColorClass}"
              style="font-size:${finalSizePx}px; line-height:${lineLh}; width:${inverseWidthPct}%; flex-shrink:0; transform:scaleX(${scaleRatio}); transform-origin:${transformOrigin};">
              ${escapeHtml(lineStr)}
            </div>
            <span class="line-size-badge">${finalSizePx}px${custom.scaleX ? ` • ${finalScaleX}%` : ''}</span>
          </div>
        `;
      }).join('');
    };

    // กรณีเป็น "วรรคพิเศษ" (Special Stanza) — แสดงผลเสมอด้วยฟอนต์กลางๆ ที่ปรับแต่งได้
    if (stanza.isSpecial) {
      const spText = stanza.special_text || '';
      if (!spText.trim()) return '';
      const spStyle = stanza.special_style || 'neutral'; // 'neutral' | 'accent' | 'badge' | 'box'
      const spAlign = stanza.special_align || prefs.textAlign || 'center';
      const alignClass = spAlign === 'center' ? 'text-center' : (spAlign === 'right' ? 'text-right' : 'text-left');

      return `
        <article class="chant-stanza special-stanza-box style-${escapeHtml(spStyle)} ${alignClass} my-2 py-1 overflow-x-hidden" data-stanza-index="${index}">
          <div class="space-y-1">
            ${renderLinesBlock(spText, 'special', defaultSpecialSize, 'text-[var(--text-secondary)]', 'font-sans-thai', Math.max(1.35, lh - 0.05), spAlign)}
          </div>
        </article>
      `;
    }

    // กรณีเป็น "วรรคบทสวดปกติ" (ตัดคำกำกับวรรค stanza.note ออกทั้งหมดตามข้อ 4)
    const paliText = prefs.paliScript === 'phinthu'
      ? (stanza.pali_phinthu || stanza.pali_thai || '')
      : (stanza.pali_thai || stanza.pali_phinthu || '');
    const thaiText = stanza.thai_translation || '';

    const showPali = prefs.languageMode === 'both' || prefs.languageMode === 'pali';
    const showThai = prefs.languageMode === 'both' || prefs.languageMode === 'thai';
    const alignClass = prefs.textAlign === 'center' ? 'text-center' : 'text-left';

    return `
      <article class="chant-stanza ${alignClass} space-y-1.5 py-1 overflow-x-hidden" data-stanza-index="${index}">
        ${showPali && paliText ? `
          <div class="space-y-0.5">
            ${renderLinesBlock(paliText, 'pali', defaultPaliSize, 'font-medium text-[var(--text-primary)]', 'chant-typography', lh)}
          </div>
        ` : ''}

        ${showThai && thaiText ? `
          <div class="space-y-0.5 pt-1">
            ${renderLinesBlock(thaiText, 'thai', defaultThaiSize, 'text-[var(--translation-text)]', 'font-sans-thai', Math.max(1.3, lh - 0.05))}
          </div>
        ` : ''}
      </article>
    `;
  };

  // อัปเดต renderScrollMode ให้ส่ง chant.id เข้าไปใน buildStanzaHTML ด้วย
  window.renderScrollMode = function (chant, resetPosition) {
    const area = document.getElementById('scroll-content-area');
    const scrollContainer = document.getElementById('scroll-mode-container');
    if (scrollContainer) scrollContainer.className = 'w-full pt-16 pb-20';
    area.className = 'space-y-4';

    const alignClass = prefs.textAlign === 'center' ? 'text-center' : 'text-left';
    const queueChants = activeSession.queueIds
      .map(id => chantsData.find(c => c.id === id))
      .filter(Boolean);

    if (queueChants.length === 0 && chant) queueChants.push(chant);

    area.innerHTML = queueChants.map((c, cIdx) => {
      const stanzasHtml = (c.stanzas || []).map((st, idx) => window.buildStanzaHTML(st, idx, c.id)).join('');
      return `
        <section class="chant-continuous-block ${cIdx > 0 ? 'pt-5 border-t border-[var(--border-color)]/60' : ''}" data-chant-idx="${cIdx}" data-chant-id="${escapeHtml(c.id)}">
          <header class="${alignClass} mb-2">
            <h2 class="chant-typography font-semibold text-[var(--accent)]"
              style="font-size: ${Math.round(prefs.fontSize * 0.85)}px;">
              ${escapeHtml(c.title)}
            </h2>
          </header>
          <div class="space-y-3">
            ${stanzasHtml}
          </div>
        </section>
      `;
    }).join('');

    if (resetPosition) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // ---------------------------------------------------------
  // 4. ระบบเลือกหลายบรรทัด + ปุ่มเลือกบาลีทั้งหมด / ไทยทั้งหมด / วรรคพิเศษ
  // ---------------------------------------------------------
  function getActiveEditingChant() {
    if (isSplitAdminOpen && adminState.editingChantId) {
      return chantsData.find(c => c.id === adminState.editingChantId) || getCurrentChant();
    }
    return getCurrentChant();
  }

  window.toggleMultiSelectLineMode = function (checked) {
    multiSelectMode = Boolean(checked);
  };

  window.handleChantLineClick = function (event, chantId, stanzaIdx, lineType, lineIdx, wrapEl) {
    if (!isSplitAdminOpen && !isDocLineEditMode) return;
    event.stopPropagation();

    const chant = chantsData.find(c => c.id === chantId) || getActiveEditingChant();
    if (!chant || !chant.stanzas || !chant.stanzas[stanzaIdx]) return;

    if (isSplitAdminOpen && adminState.editingChantId !== chant.id) {
      loadChantIntoEditor(chant.id);
    }

    const keyId = makeSelectionKey(chant.id, stanzaIdx, lineType, lineIdx);
    const existingIndex = selectedLines.findIndex(item => item.keyId === keyId);

    if (multiSelectMode || event.ctrlKey || event.metaKey || event.shiftKey) {
      if (existingIndex >= 0) {
        selectedLines.splice(existingIndex, 1);
        wrapEl.classList.remove('line-selected');
      } else {
        selectedLines.push({ keyId, chantId: chant.id, stanzaIdx, lineType, lineIdx });
        wrapEl.classList.add('line-selected');
      }
    } else {
      // โหมดเลือกทีละบรรทัด
      selectedLines = [{ keyId, chantId: chant.id, stanzaIdx, lineType, lineIdx }];
      document.querySelectorAll('.chant-doc-line-wrap.line-selected').forEach(el => el.classList.remove('line-selected'));
      wrapEl.classList.add('line-selected');
    }

    const toolbar = document.getElementById('doc-line-toolbar');
    if (toolbar) toolbar.classList.add('show');
    refreshToolbarFromSelection();
  };

  // เลือกกลุ่มบรรทัดทั้งหมดในคลิกเดียว (บาลีทั้งหมด / ไทยทั้งหมด / วรรคพิเศษ / ทั้งหมด)
  window.selectLinesByGroup = function (groupType) {
    const allWraps = document.querySelectorAll('#chant-stage .chant-doc-line-wrap');
    selectedLines = [];

    allWraps.forEach(wrapEl => {
      const lType = wrapEl.getAttribute('data-line-type');
      if (groupType === 'all' || lType === groupType) {
        const chantId = wrapEl.getAttribute('data-chant-id') || (getActiveEditingChant() && getActiveEditingChant().id);
        const stanzaIdx = parseInt(wrapEl.getAttribute('data-stanza-idx'), 10);
        const lineIdx = parseInt(wrapEl.getAttribute('data-line-idx'), 10);
        const keyId = makeSelectionKey(chantId, stanzaIdx, lType, lineIdx);
        selectedLines.push({ keyId, chantId, stanzaIdx, lineType: lType, lineIdx });
        wrapEl.classList.add('line-selected');
      } else {
        wrapEl.classList.remove('line-selected');
      }
    });

    const toolbar = document.getElementById('doc-line-toolbar');
    if (toolbar) toolbar.classList.add('show');
    refreshToolbarFromSelection();

    const groupNames = { pali: 'ภาษาบาลีทั้งหมด', thai: 'คำแปลไทยทั้งหมด', special: 'วรรคพิเศษทั้งหมด', all: 'ทุกบรรทัด' };
    showToast(`เลือก${groupNames[groupType] || ''} (${selectedLines.length} บรรทัด) แล้ว ปรับขนาดพร้อมกันได้ทันที`);
  };

  window.clearLineSelection = function () {
    selectedLines = [];
    document.querySelectorAll('.chant-doc-line-wrap.line-selected').forEach(el => el.classList.remove('line-selected'));
    refreshToolbarFromSelection();
  };

  window.closeDocLineToolbar = function () {
    window.clearLineSelection();
    const toolbar = document.getElementById('doc-line-toolbar');
    if (toolbar) toolbar.classList.remove('show');
  };

  function refreshToolbarFromSelection() {
    const labelEl = document.getElementById('dtb-line-label');
    const sizeInput = document.getElementById('dtb-fontsize-input');
    const scaleSlider = document.getElementById('dtb-scalex-slider');
    const scaleVal = document.getElementById('dtb-scalex-val');
    const textInput = document.getElementById('dtb-line-text-input');

    if (!labelEl) return;

    if (selectedLines.length === 0) {
      labelEl.textContent = 'ยังไม่ได้เลือกบรรทัด';
      if (textInput) {
        textInput.value = '';
        textInput.disabled = true;
        textInput.placeholder = 'คลิกที่บรรทัดบทสวด หรือกดปุ่ม "เลือกบาลีทั้งหมด / ไทยทั้งหมด" ด้านบน...';
      }
      return;
    }

    const first = selectedLines[0];
    const chant = chantsData.find(c => c.id === first.chantId) || getActiveEditingChant();
    const stanza = chant && chant.stanzas ? chant.stanzas[first.stanzaIdx] : null;
    const key = getLineStyleKey(first.lineType, first.lineIdx);
    const custom = (stanza && stanza.lineStyles && (stanza.lineStyles[key] || stanza.lineStyles[`${first.lineType}_${first.lineIdx}`])) || {};

    const defaultSize = first.lineType === 'pali'
      ? (prefs.fontSize || 28)
      : (first.lineType === 'special' ? Math.max(16, Math.round((prefs.fontSize || 28) * 0.68)) : Math.max(16, Math.round((prefs.fontSize || 28) * 0.72)));

    const curSize = custom.fontSize || defaultSize;
    const curScale = custom.scaleX || (prefs.fontScaleX || 92);

    if (sizeInput) sizeInput.value = curSize;
    if (scaleSlider) scaleSlider.value = curScale;
    if (scaleVal) scaleVal.textContent = `${curScale}%`;

    if (selectedLines.length === 1) {
      const typeName = first.lineType === 'pali' ? 'บาลี' : (first.lineType === 'special' ? 'วรรคพิเศษ' : 'แปลไทย');
      labelEl.textContent = `วรรค ${first.stanzaIdx + 1} • ${typeName} บรรทัด ${first.lineIdx + 1}`;
      if (textInput && stanza) {
        const fieldName = first.lineType === 'thai'
          ? 'thai_translation'
          : (first.lineType === 'special' ? 'special_text' : (prefs.paliScript === 'phinthu' ? 'pali_phinthu' : 'pali_thai'));
        const lines = String(stanza[fieldName] || '').split('\n');
        textInput.disabled = false;
        textInput.value = lines[first.lineIdx] || '';
        textInput.placeholder = 'แก้ไขข้อความในบรรทัดนี้ได้โดยตรง...';
      }
    } else {
      labelEl.textContent = `เลือกอยู่ ${selectedLines.length} บรรทัด`;
      if (textInput) {
        textInput.value = '';
        textInput.disabled = true;
        textInput.placeholder = `กำลังเลือก ${selectedLines.length} บรรทัด — กด A- / A+ หรือเลื่อนแถบบีบคำเพื่อปรับพร้อมกัน`;
      }
    }
  }

  // ฟังก์ชันอัปเดตสไตล์ให้กับทุกบรรทัดที่เลือกพร้อมกัน
  function applyBulkLineStyleUpdate(updaterFn) {
    if (selectedLines.length === 0) {
      showToast('กรุณาคลิกเลือกบรรทัด หรือกดปุ่มเลือกบาลี/ไทยทั้งหมดก่อนครับ');
      return;
    }

    selectedLines.forEach(item => {
      const chant = chantsData.find(c => c.id === item.chantId);
      if (!chant || !chant.stanzas || !chant.stanzas[item.stanzaIdx]) return;

      const stanza = chant.stanzas[item.stanzaIdx];
      if (!stanza.lineStyles) stanza.lineStyles = {};
      const key = getLineStyleKey(item.lineType, item.lineIdx);
      if (!stanza.lineStyles[key]) stanza.lineStyles[key] = {};

      updaterFn(stanza.lineStyles[key], stanza.lineStyles, key, item);

      if (adminState.editingChantId === chant.id && adminState.editingStanzas[item.stanzaIdx]) {
        adminState.editingStanzas[item.stanzaIdx].lineStyles = JSON.parse(JSON.stringify(stanza.lineStyles));
      }
    });

    saveChantsToStorage();
    const scrollY = window.scrollY;
    renderChantingContent(false);
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    refreshToolbarFromSelection();
  }

  window.setSelectedLinesFontSize = function (val) {
    const size = Math.max(12, Math.min(130, parseInt(val, 10) || 28));
    applyBulkLineStyleUpdate((styleObj) => {
      styleObj.fontSize = size;
    });
  };

  window.adjustSelectedLinesFontSize = function (delta) {
    applyBulkLineStyleUpdate((styleObj, allStyles, key, item) => {
      const baseDefault = item.lineType === 'pali'
        ? (prefs.fontSize || 28)
        : (item.lineType === 'special' ? Math.max(16, Math.round((prefs.fontSize || 28) * 0.68)) : Math.max(16, Math.round((prefs.fontSize || 28) * 0.72)));
      const current = styleObj.fontSize ? Number(styleObj.fontSize) : baseDefault;
      styleObj.fontSize = Math.max(12, Math.min(130, current + delta));
    });
  };

  window.setSelectedLinesScaleX = function (val) {
    const sc = Math.max(55, Math.min(115, parseInt(val, 10) || 92));
    const scaleVal = document.getElementById('dtb-scalex-val');
    if (scaleVal) scaleVal.textContent = `${sc}%`;
    applyBulkLineStyleUpdate((styleObj) => {
      styleObj.scaleX = sc;
    });
  };

  window.resetSelectedLinesStyle = function () {
    applyBulkLineStyleUpdate((styleObj, allStyles, key, item) => {
      delete allStyles[key];
      delete allStyles[`${item.lineType}_${item.lineIdx}`];
    });
    showToast(`รีเซ็ตขนาดของ ${selectedLines.length} บรรทัดที่เลือกแล้ว`);
  };

  window.autoFitSelectedLines = function () {
    if (selectedLines.length === 0) {
      showToast('กรุณาคลิกเลือกบรรทัดที่ต้องการจัดก่อนครับ');
      return;
    }

    selectedLines.forEach(item => {
      const selector = `.chant-doc-line-wrap[data-chant-id="${item.chantId}"][data-stanza-idx="${item.stanzaIdx}"][data-line-type="${item.lineType}"][data-line-idx="${item.lineIdx}"]`;
      const wrapEl = document.querySelector(selector);
      if (wrapEl) {
        fitSingleLineElement(wrapEl, item.chantId, item.stanzaIdx, item.lineType, item.lineIdx);
      }
    });

    saveChantsToStorage();
    const scrollY = window.scrollY;
    renderChantingContent(false);
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    refreshToolbarFromSelection();
    showToast(`คำนวณขนาดพอดี 1 บรรทัดให้ทั้ง ${selectedLines.length} บรรทัดเรียบร้อยแล้ว`);
  };

  function fitSingleLineElement(wrapEl, chantId, stanzaIdx, lineType, lineIdx) {
    const innerEl = wrapEl.querySelector('.chant-doc-line-inner');
    if (!innerEl) return;
    const text = innerEl.textContent.trim();
    if (!text) return;

    const availableWidth = wrapEl.clientWidth - 16;
    const chant = chantsData.find(c => c.id === chantId) || getActiveEditingChant();
    if (!chant || !chant.stanzas[stanzaIdx]) return;
    const stanza = chant.stanzas[stanzaIdx];
    const key = getLineStyleKey(lineType, lineIdx);
    const existingScaleX = (stanza.lineStyles && stanza.lineStyles[key] && stanza.lineStyles[key].scaleX) || prefs.fontScaleX || 92;
    const scaleX = existingScaleX / 100;

    const probe = document.createElement('span');
    probe.className = innerEl.className;
    probe.style.cssText = 'position:fixed; visibility:hidden; white-space:nowrap; top:-9999px; left:-9999px;';
    probe.textContent = text;
    document.body.appendChild(probe);

    let bestSize = lineType === 'pali' ? (prefs.fontSize || 28) : Math.max(16, Math.round((prefs.fontSize || 28) * 0.72));
    for (let testPx = Math.min(96, bestSize + 20); testPx >= 14; testPx--) {
      probe.style.fontSize = `${testPx}px`;
      const measuredW = probe.getBoundingClientRect().width * scaleX;
      if (measuredW <= availableWidth) {
        bestSize = testPx;
        break;
      }
    }
    document.body.removeChild(probe);

    if (!stanza.lineStyles) stanza.lineStyles = {};
    stanza.lineStyles[key] = { ...(stanza.lineStyles[key] || {}), fontSize: bestSize };

    if (adminState.editingChantId === chant.id && adminState.editingStanzas[stanzaIdx]) {
      adminState.editingStanzas[stanzaIdx].lineStyles = JSON.parse(JSON.stringify(stanza.lineStyles));
    }
  }

  window.updateSelectedLineText = function (newLineText) {
    if (selectedLines.length !== 1) return;
    const target = selectedLines[0];
    const chant = chantsData.find(c => c.id === target.chantId);
    if (!chant || !chant.stanzas[target.stanzaIdx]) return;

    const stanza = chant.stanzas[target.stanzaIdx];
    const fieldName = target.lineType === 'thai'
      ? 'thai_translation'
      : (target.lineType === 'special' ? 'special_text' : (prefs.paliScript === 'phinthu' ? 'pali_phinthu' : 'pali_thai'));

    const lines = String(stanza[fieldName] || '').split('\n');
    lines[target.lineIdx] = newLineText;
    const joined = lines.join('\n');

    stanza[fieldName] = joined;
    if (adminState.editingChantId === chant.id && adminState.editingStanzas[target.stanzaIdx]) {
      adminState.editingStanzas[target.stanzaIdx][fieldName] = joined;
      renderEditorStanzas();
    }

    saveChantsToStorage();
    const scrollY = window.scrollY;
    renderChantingContent(false);
    window.scrollTo({ top: scrollY, behavior: 'instant' });
  };

  // ---------------------------------------------------------
  // 5. ระบบ Editor ใหม่: แทรกวรรคต่อจากวรรคปัจจุบัน + เพิ่มวรรคพิเศษ + ตัดคำกำกับวรรคออก
  // ---------------------------------------------------------
  window.insertStanzaAt = function (afterIndex, isSpecial = false) {
    const newStanza = isSpecial
      ? {
          isSpecial: true,
          special_text: '',
          special_style: 'neutral',
          special_align: 'center'
        }
      : {
          isSpecial: false,
          pali_phinthu: '',
          pali_thai: '',
          thai_translation: ''
        };

    const insertPos = (typeof afterIndex === 'number' && afterIndex >= -1)
      ? afterIndex + 1
      : adminState.editingStanzas.length;

    adminState.editingStanzas.splice(insertPos, 0, newStanza);
    renderEditorStanzas();
    syncEditorToLivePreview();

    // เลื่อนโฟกัสไปยังวรรคที่เพิ่งแทรกใหม่ทันที
    setTimeout(() => {
      const cards = document.querySelectorAll('#editor-stanzas-container > div[data-editor-stanza]');
      const targetCard = cards[insertPos];
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstTextarea = targetCard.querySelector('textarea');
        if (firstTextarea) firstTextarea.focus();
      }
    }, 60);
  };

  window.addStanzaInEditor = function () {
    window.insertStanzaAt(adminState.editingStanzas.length - 1, false);
  };

  window.addSpecialStanzaInEditor = function () {
    window.insertStanzaAt(adminState.editingStanzas.length - 1, true);
  };

  window.applySpecialPreset = function (stanzaIdx, presetText) {
    if (!adminState.editingStanzas[stanzaIdx]) return;
    const current = adminState.editingStanzas[stanzaIdx].special_text || '';
    adminState.editingStanzas[stanzaIdx].special_text = current
      ? `${current}\n${presetText}`
      : presetText;
    renderEditorStanzas();
    syncEditorToLivePreview();
  };

  // เขียนทับ renderEditorStanzas เพื่อนำ "คำกำกับวรรค" ออก และเพิ่ม "วรรคพิเศษ" + ปุ่มแทรกต่อจากวรรคปัจจุบัน
  window.renderEditorStanzas = function () {
    const container = document.getElementById('editor-stanzas-container');
    if (!container) return;

    const total = adminState.editingStanzas.length;

    container.innerHTML = adminState.editingStanzas.map((stanza, idx) => {
      // แถบปุ่มแทรกต่อจากวรรคนี้ (อยู่ท้ายทุกวรรคตามข้อ 2)
      const insertAfterBar = `
        <div class="pt-2.5 mt-2 border-t border-dashed border-[var(--border-color)] flex flex-wrap items-center justify-end gap-2">
          <span class="text-[11px] text-[var(--text-muted)] mr-auto">แทรกต่อจากวรรคที่ ${idx + 1}:</span>
          <button type="button" onclick="window.insertStanzaAt(${idx}, false)"
            class="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[11px] font-medium text-[var(--text-primary)] transition">
            + แทรกวรรคบทสวดต่อจากนี้
          </button>
          <button type="button" onclick="window.insertStanzaAt(${idx}, true)"
            class="px-2.5 py-1 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)]/40 hover:border-[var(--accent)] text-[11px] font-semibold text-[var(--accent)] transition">
            ✨ + แทรกวรรคพิเศษต่อจากนี้
          </button>
        </div>
      `;

      // กรณีเป็น "วรรคพิเศษ" (ข้อ 3)
      if (stanza.isSpecial) {
        const spStyle = stanza.special_style || 'neutral';
        const spAlign = stanza.special_align || 'center';
        return `
          <div data-editor-stanza="${idx}" class="p-4 rounded-xl bg-[var(--accent-soft)]/45 border-2 border-dashed border-[var(--accent)]/60 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-[#FAF8F2] text-[11px] font-semibold">
                  ✨ วรรคพิเศษ (วรรคที่ ${idx + 1})
                </span>
                <span class="text-[11px] text-[var(--text-secondary)]">สำหรับใส่ กราบ ๓ ครั้ง / หยุด / คำอธิบาย / ข้ามหน้า</span>
              </div>
              <div class="flex items-center gap-1">
                <button type="button" onclick="moveStanzaInEditor(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}
                  class="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] disabled:opacity-30 text-xs">↑</button>
                <button type="button" onclick="moveStanzaInEditor(${idx}, 1)" ${idx === total - 1 ? 'disabled' : ''}
                  class="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] disabled:opacity-30 text-xs">↓</button>
                <button type="button" onclick="removeStanzaInEditor(${idx})"
                  class="px-2 py-0.5 rounded text-red-700 hover:bg-red-500/10 text-xs">ลบวรรคนี้</button>
              </div>
            </div>

            <!-- ปุ่มข้อความสำเร็จรูปยอดนิยม (คลิกเพื่อใส่หรือพิมพ์เองได้เต็มที่) -->
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] text-[var(--text-muted)]">แทรกคำด่วน:</span>
              <button type="button" onclick="window.applySpecialPreset(${idx}, '(กราบ ๓ ครั้ง)')" class="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[11px]">(กราบ ๓ ครั้ง)</button>
              <button type="button" onclick="window.applySpecialPreset(${idx}, '(กราบ ๑ ครั้ง)')" class="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[11px]">(กราบ ๑ ครั้ง)</button>
              <button type="button" onclick="window.applySpecialPreset(${idx}, '(หยุด)')" class="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[11px]">(หยุด)</button>
              <button type="button" onclick="window.applySpecialPreset(${idx}, '(กล่าว ๓ ครั้ง)')" class="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[11px]">(กล่าว ๓ ครั้ง)</button>
              <button type="button" onclick="window.applySpecialPreset(${idx}, '[สวดย่อ ให้ข้ามไปที่หน้า ...]')" class="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[11px]">[สวดย่อ ข้ามไป...]</button>
              <button type="button" onclick="window.applySpecialPreset(${idx}, 'บทนี้คือ...')" class="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-[11px]">อธิบายบท...</button>
            </div>

            <!-- ช่องพิมพ์ข้อความวรรคพิเศษ -->
            <div>
              <textarea rows="2"
                oninput="updateStanzaField(${idx}, 'special_text', this.value)"
                onfocus="setLastFocusedInput(this)"
                placeholder="พิมพ์ข้อความพิเศษตามต้องการ เช่น กราบ ๓ ครั้ง, หยุด, สวดย่อเปิดไปหน้าที่... หรือคำอธิบายบท"
                class="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-sans-thai text-sm focus:outline-none focus:border-[var(--accent)]">${escapeHtml(stanza.special_text || '')}</textarea>
            </div>

            <!-- ตัวเลือกรูปแบบการแสดงผลของวรรคพิเศษ -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div class="flex items-center gap-2">
                <label class="text-[11px] text-[var(--text-secondary)] whitespace-nowrap">สไตล์กรอบ/สี:</label>
                <select onchange="updateStanzaField(${idx}, 'special_style', this.value); renderEditorStanzas();"
                  class="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs focus:outline-none focus:border-[var(--accent)]">
                  <option value="neutral" ${spStyle === 'neutral' ? 'selected' : ''}>ฟอนต์กลางๆ เรียบง่าย (ค่าเริ่มต้น)</option>
                  <option value="accent" ${spStyle === 'accent' ? 'selected' : ''}>ฟอนต์เน้นสีน้ำตาลทอง</option>
                  <option value="badge" ${spStyle === 'badge' ? 'selected' : ''}>ป้ายแคปซูล (Badge)</option>
                  <option value="box" ${spStyle === 'box' ? 'selected' : ''}>กล่องคำอธิบายมีเส้นประ</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-[11px] text-[var(--text-secondary)] whitespace-nowrap">จัดวาง:</label>
                <select onchange="updateStanzaField(${idx}, 'special_align', this.value); renderEditorStanzas();"
                  class="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs focus:outline-none focus:border-[var(--accent)]">
                  <option value="center" ${spAlign === 'center' ? 'selected' : ''}>กึ่งกลางหน้ากระดาษ</option>
                  <option value="left" ${spAlign === 'left' ? 'selected' : ''}>ชิดซ้าย</option>
                  <option value="right" ${spAlign === 'right' ? 'selected' : ''}>ชิดขวา</option>
                </select>
              </div>
            </div>

            ${insertAfterBar}
          </div>
        `;
      }

      // กรณีเป็น "วรรคบทสวดปกติ" (ไม่มีช่องคำกำกับวรรคตามข้อ 4)
      return `
        <div data-editor-stanza="${idx}" class="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-[var(--accent)]">วรรคที่ ${idx + 1}</span>
            <div class="flex items-center gap-1">
              <button type="button" onclick="moveStanzaInEditor(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}
                class="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] disabled:opacity-30 text-xs">↑</button>
              <button type="button" onclick="moveStanzaInEditor(${idx}, 1)" ${idx === total - 1 ? 'disabled' : ''}
                class="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] disabled:opacity-30 text-xs">↓</button>
              <button type="button" onclick="removeStanzaInEditor(${idx})"
                class="px-2 py-0.5 rounded text-red-700 hover:bg-red-500/10 text-xs">ลบวรรคนี้</button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] text-[var(--text-secondary)] mb-1">
                บาลีสะกดแบบไทย (สระอะ / ยามักการ ๎)
              </label>
              <textarea rows="3"
                oninput="updateStanzaField(${idx}, 'pali_thai', this.value)"
                onfocus="setLastFocusedInput(this)"
                placeholder="เช่น อะระหัง สัมมาสัมพุทโธ... ส๎วากขาโต..."
                class="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-serif-thai text-sm focus:outline-none focus:border-[var(--accent)]">${escapeHtml(stanza.pali_thai || '')}</textarea>
            </div>

            <div>
              <label class="block text-[11px] text-[var(--text-secondary)] mb-1">
                บาลีอักษรไทย (พินทุ ฺ / นิคหิต ํ)
              </label>
              <textarea rows="3"
                oninput="updateStanzaField(${idx}, 'pali_phinthu', this.value)"
                onfocus="setLastFocusedInput(this)"
                placeholder="เช่น อรหํ สมฺมาสมฺพุทฺโธ... สฺวากฺขาโต..."
                class="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] font-serif-thai text-sm focus:outline-none focus:border-[var(--accent)]">${escapeHtml(stanza.pali_phinthu || '')}</textarea>
            </div>
          </div>

          <div>
            <label class="block text-[11px] text-[var(--text-secondary)] mb-1">คำแปลภาษาไทย</label>
            <textarea rows="2"
              oninput="updateStanzaField(${idx}, 'thai_translation', this.value)"
              onfocus="setLastFocusedInput(this)"
              placeholder="คำแปลภาษาไทยสำหรับวรรคนี้..."
              class="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)]">${escapeHtml(stanza.thai_translation || '')}</textarea>
          </div>

          ${insertAfterBar}
        </div>
      `;
    }).join('');
  };

  // ---------------------------------------------------------
  // 6. ซิงก์หน้าจอ Split-Screen Live Admin และปุ่มบน-ล่างใน Editor
  // ---------------------------------------------------------
  function syncEditorToLivePreview() {
    if (!isSplitAdminOpen || !adminState.editingChantId) return;

    const titleEl = document.getElementById('edit-chant-title');
    const catEl = document.getElementById('edit-chant-category');
    const subEl = document.getElementById('edit-chant-subtitle');

    const title = titleEl ? titleEl.value.trim() || 'บทสวดใหม่ (กำลังแก้ไข)' : 'บทสวดใหม่';
    const category = catEl ? catEl.value.trim() || 'บทสวดพื้นฐาน' : 'บทสวดพื้นฐาน';
    const subtitle = subEl ? subEl.value.trim() : '';

    let existingIdx = chantsData.findIndex(c => c.id === adminState.editingChantId);
    const updatedChant = {
      id: adminState.editingChantId,
      title,
      category,
      subtitle,
      stanzas: JSON.parse(JSON.stringify(adminState.editingStanzas))
    };

    if (existingIdx >= 0) {
      chantsData[existingIdx] = updatedChant;
    } else {
      chantsData.push(updatedChant);
      existingIdx = chantsData.length - 1;
    }

    saveChantsToStorage();

    const scrollY = window.scrollY;
    renderCategories();
    renderHomeChantList();

    if (activeSession.isChanting) {
      if (!activeSession.queueIds.includes(adminState.editingChantId)) {
        activeSession.queueIds = [adminState.editingChantId];
        activeSession.currentChantIndex = 0;
      }
      renderChantingContent(false);
    }
    window.scrollTo({ top: scrollY, behavior: 'instant' });
  }

  window.switchLeftPreviewMode = function (mode) {
    const homeView = document.getElementById('home-view');
    const chantView = document.getElementById('chanting-view');
    const btnChant = document.getElementById('split-preview-chant-btn');
    const btnHome = document.getElementById('split-preview-home-btn');

    if (mode === 'chanting') {
      const targetId = adminState.editingChantId || (chantsData[0] && chantsData[0].id);
      if (targetId) {
        activeSession.isChanting = true;
        activeSession.queueIds = [targetId];
        activeSession.currentChantIndex = 0;
        homeView.classList.add('hidden');
        chantView.classList.remove('hidden');
        renderChantingContent(false);
      }
    } else {
      activeSession.isChanting = false;
      chantView.classList.add('hidden');
      homeView.classList.remove('hidden');
      renderHomeChantList();
    }

    if (btnChant && btnHome) {
      btnChant.className = mode === 'chanting'
        ? 'px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[#FAF8F2] text-xs font-semibold transition'
        : 'px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)] transition';
      btnHome.className = mode === 'home'
        ? 'px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[#FAF8F2] text-xs font-semibold transition'
        : 'px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)] transition';
    }
  };

  window.toggleDocLineEditMode = function () {
    isDocLineEditMode = !isDocLineEditMode;
    document.body.classList.toggle('doc-line-edit-active', isDocLineEditMode);
    const toolbar = document.getElementById('doc-line-toolbar');

    if (isDocLineEditMode) {
      if (toolbar) toolbar.classList.add('show');
      refreshToolbarFromSelection();
    } else {
      window.closeDocLineToolbar();
    }

    const btn = document.getElementById('hud-doc-line-btn');
    if (btn) {
      btn.className = isDocLineEditMode
        ? 'px-3 py-2 rounded-xl bg-[#D9C39E] text-[#262320] text-xs font-semibold transition flex items-center gap-1.5'
        : 'px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition flex items-center gap-1.5';
    }
  };

  function enhanceEditorTopAndBottomButtons() {
    // เพิ่มปุ่ม "✨ + เพิ่มวรรคพิเศษ" คู่กับปุ่ม "+ เพิ่มท่อน/วรรคใหม่" ด้านบนและด้านล่างสุดของ Editor
    const topAddBtn = document.querySelector('#admin-editor-panel button[onclick="addStanzaInEditor()"]');
    if (topAddBtn && !document.getElementById('top-add-special-stanza-btn')) {
      const parent = topAddBtn.parentElement;
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-wrap items-center gap-1.5';
      topAddBtn.replaceWith(wrapper);
      wrapper.appendChild(topAddBtn);

      const spBtnTop = document.createElement('button');
      spBtnTop.type = 'button';
      spBtnTop.id = 'top-add-special-stanza-btn';
      spBtnTop.onclick = () => window.insertStanzaAt(-1, true);
      spBtnTop.className = 'px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#FAF8F2] text-xs font-semibold transition';
      spBtnTop.innerHTML = '✨ + เพิ่มวรรคพิเศษ';
      wrapper.appendChild(spBtnTop);
    }

    const allBottomAddBtns = document.querySelectorAll('#admin-editor-panel button[onclick="addStanzaInEditor()"]');
    if (allBottomAddBtns.length > 1 && !document.getElementById('bottom-add-special-stanza-btn')) {
      const botBtn = allBottomAddBtns[allBottomAddBtns.length - 1];
      const botWrap = document.createElement('div');
      botWrap.className = 'flex flex-wrap items-center gap-2';
      botBtn.replaceWith(botWrap);
      botWrap.appendChild(botBtn);

      const spBtnBot = document.createElement('button');
      spBtnBot.type = 'button';
      spBtnBot.id = 'bottom-add-special-stanza-btn';
      spBtnBot.onclick = () => window.addSpecialStanzaInEditor();
      spBtnBot.className = 'px-3.5 py-2 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#FAF8F2] text-xs font-semibold transition';
      spBtnBot.innerHTML = '✨ + เพิ่มวรรคพิเศษต่อท้าย';
      botWrap.appendChild(spBtnBot);
    }
  }

  function setupSplitAdminOverrides() {
    createSplitAndToolbarDOM();
    enhanceEditorTopAndBottomButtons();

    const adminHeaderLeft = document.querySelector('#admin-view header .flex.items-center.gap-3');
    if (adminHeaderLeft && !document.getElementById('split-preview-switcher')) {
      const switcher = document.createElement('div');
      switcher.id = 'split-preview-switcher';
      switcher.className = 'flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)]';
      switcher.innerHTML = `
        <button type="button" id="split-preview-chant-btn" onclick="window.switchLeftPreviewMode('chanting')"
          class="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[#FAF8F2] text-xs font-semibold transition">
          👁️ ดูหน้าสวดมนต์ฝั่งซ้าย
        </button>
        <button type="button" id="split-preview-home-btn" onclick="window.switchLeftPreviewMode('home')"
          class="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs transition">
          📑 ดูหน้าสารบัญ
        </button>
      `;
      adminHeaderLeft.appendChild(switcher);
    }

    const rightHudGroup = document.querySelector('#hud-bottom .flex.items-center.gap-1\\.5:last-child');
    if (rightHudGroup && !document.getElementById('hud-doc-line-btn')) {
      const lineEditBtn = document.createElement('button');
      lineEditBtn.id = 'hud-doc-line-btn';
      lineEditBtn.onclick = () => window.toggleDocLineEditMode();
      lineEditBtn.className = 'px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition flex items-center gap-1.5';
      lineEditBtn.title = 'ปรับขนาดฟอนต์รายบรรทัด หรือเลือกบาลี/ไทยทั้งหมดเพื่อปรับพร้อมกัน';
      lineEditBtn.innerHTML = `<span>📏 รายบรรทัด</span>`;
      rightHudGroup.prepend(lineEditBtn);
    }

    window.openAdminDashboard = function () {
      isSplitAdminOpen = true;
      document.documentElement.style.setProperty('--admin-split-w', `${adminSplitWidth}px`);
      document.body.classList.add('admin-split-active');
      document.getElementById('admin-view').classList.remove('hidden');

      enhanceEditorTopAndBottomButtons();
      renderAdminChantList();

      const targetChantId = activeSession.isChanting
        ? (activeSession.queueIds[activeSession.currentChantIndex] || (chantsData[0] && chantsData[0].id))
        : (adminState.editingChantId || (chantsData[0] && chantsData[0].id));

      if (targetChantId) {
        loadChantIntoEditor(targetChantId);
      } else {
        createNewChantInEditor();
      }

      window.switchLeftPreviewMode('chanting');
    };

    window.closeAdminView = function () {
      isSplitAdminOpen = false;
      document.body.classList.remove('admin-split-active');
      document.getElementById('admin-view').classList.add('hidden');
      window.closeDocLineToolbar();
      renderCategories();
      renderHomeChantList();
      if (activeSession.isChanting) {
        renderChantingContent(false);
      }
    };

    const origLoadChantIntoEditor = window.loadChantIntoEditor;
    window.loadChantIntoEditor = function (chantId) {
      if (typeof origLoadChantIntoEditor === 'function') {
        origLoadChantIntoEditor(chantId);
      }
      if (isSplitAdminOpen && activeSession.isChanting) {
        activeSession.queueIds = [chantId];
        activeSession.currentChantIndex = 0;
        renderChantingContent(true);
      }
    };

    const origUpdateStanzaField = window.updateStanzaField;
    window.updateStanzaField = function (idx, field, value) {
      if (typeof origUpdateStanzaField === 'function') {
        origUpdateStanzaField(idx, field, value);
      }
      syncEditorToLivePreview();
    };

    const origRemoveStanza = window.removeStanzaInEditor;
    window.removeStanzaInEditor = function (idx) {
      if (typeof origRemoveStanza === 'function') origRemoveStanza(idx);
      syncEditorToLivePreview();
    };

    const origMoveStanza = window.moveStanzaInEditor;
    window.moveStanzaInEditor = function (idx, direction) {
      if (typeof origMoveStanza === 'function') origMoveStanza(idx, direction);
      syncEditorToLivePreview();
    };

    ['edit-chant-title', 'edit-chant-category', 'edit-chant-subtitle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => syncEditorToLivePreview());
      }
    });
  }

  if (window.ZenChantApp && typeof window.ZenChantApp.registerModule === 'function') {
    window.ZenChantApp.registerModule({
      name: 'live-split-admin-and-line-sizer',
      init: setupSplitAdminOverrides
    });
  } else if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupSplitAdminOverrides);
  } else {
    setupSplitAdminOverrides();
  }
})();