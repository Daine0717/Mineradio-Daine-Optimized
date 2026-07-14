function setRange(id, value) {
  var el = document.getElementById(id);
  if (!el) return;
  if (id === 'fx-lyricglow') value = Math.min(0.85, Math.max(0, value));
  if (id === 'fx-coverres') value = normalizeCoverResolution(value);
  if (id === 'fx-glassaberration') value = normalizeControlGlassChromaticOffset(value);
  el.value = value;
  var out = el.parentElement.querySelector('output');
  if (out) out.textContent = id === 'fx-coverres'
    ? coverParticleCountLabel(value)
    : (id === 'fx-lyricweight' || id === 'fx-glassaberration' || id === 'fx-lyrictiltx' || id === 'fx-lyrictilty' || id === 'fx-shelfangle' ? String(Math.round(Number(value) || 0)) : Number(value).toFixed(id === 'fx-lyricspacing' ? 3 : 2));
}
function updateDevelopmentFxControls() {
  [
    ['desktopLyrics', 't-desktopLyrics', '全屏幕置顶歌词'],
    ['desktopLyricsClickThrough', 't-desktopLyricsClickThrough', '锁定后防误触；鼠标移到桌面歌词上按中键可锁定/解锁'],
    ['desktopLyricsCinema', 't-desktopLyricsCinema', '桌面歌词绑定鼓点电影震动，基础漂浮始终保留'],
    ['desktopLyricsHighlight', 't-desktopLyricsHighlight', '桌面歌词按播放进度高亮'],
    ['wallpaperMode', 't-wallpaperMode', '开发中，暂不可用']
  ].forEach(function(item){
    var locked = isDevelopmentLockedFx(item[0]);
    var el = document.getElementById(item[1]);
    if (!el) return;
    el.classList.toggle('dev-locked', locked);
    if (locked) {
      el.classList.remove('on');
      el.setAttribute('aria-disabled', 'true');
      el.title = '开发中，暂不可用';
    } else {
      el.removeAttribute('aria-disabled');
      el.title = item[2];
    }
  });
  [
    ['desktopLyrics', 'fx-desktoplyricssize'],
    ['desktopLyrics', 'fx-desktoplyricsopacity'],
    ['desktopLyrics', 'fx-desktoplyricsy'],
    ['wallpaperMode', 'fx-wallpaperopacity']
  ].forEach(function(item){
    var locked = isDevelopmentLockedFx(item[0]);
    var input = document.getElementById(item[1]);
    if (!input) return;
    input.disabled = locked;
    var row = input.closest && input.closest('.fx-slider');
    if (row) row.classList.toggle('dev-locked', locked);
  });
}
function updateDesktopLyricsFpsControls() {
  var fps = normalizeDesktopLyricsFps(fx.desktopLyricsFps);
  document.querySelectorAll('#desktop-lyrics-fps-seg [data-desktop-lyrics-fps]').forEach(function(btn){
    btn.classList.toggle('active', normalizeDesktopLyricsFps(btn.getAttribute('data-desktop-lyrics-fps')) === fps);
  });
}
function updatePerformanceControls() {
  fx.performanceBackground = normalizePerformanceBackgroundMode(fx.performanceBackground, fx.liveBackgroundKeep === true);
  fx.liveBackgroundKeep = fx.performanceBackground === 'keep';
  fx.performanceQuality = normalizePerformanceQuality(fx.performanceQuality);
  document.querySelectorAll('#performance-background-seg [data-performance-background]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-performance-background') === fx.performanceBackground);
  });
  document.querySelectorAll('#performance-quality-seg [data-performance-quality]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-performance-quality') === fx.performanceQuality);
  });
  var liveBackgroundKeepToggle = document.getElementById('t-liveBackgroundKeep');
  if (liveBackgroundKeepToggle) liveBackgroundKeepToggle.classList.toggle('on', fx.liveBackgroundKeep === true);
}
function setPerformanceBackgroundMode(mode, silent) {
  var next = normalizePerformanceBackgroundMode(mode, false);
  fx.performanceBackground = next;
  fx.liveBackgroundKeep = next === 'keep';
  updatePerformanceControls();
  saveLyricLayout();
  updateRenderPowerClasses();
  applyRendererPowerMode();
  if (next === 'keep') recoverVisualsAfterBackground('performance-background-keep');
  else if (next === 'release' && isDeepBackgroundMode()) trimRuntimeCaches('performance-release', true);
  if (!silent) {
    showToast(next === 'keep' ? '后台策略: 保持运行' : (next === 'release' ? '后台策略: 停止并释放' : '后台策略: 自动优化'));
  }
}
function setPerformanceQualityMode(mode, silent) {
  var next = normalizePerformanceQuality(mode);
  fx.performanceQuality = next;
  updatePerformanceControls();
  applyRendererPowerMode();
  saveLyricLayout();
  if (!silent) {
    var label = next === 'eco' ? '低' : (next === 'balanced' ? '中' : (next === 'ultra' ? '超高' : '高'));
    showToast('画质档位: ' + label);
  }
}
function updateFxInputs() {
  normalizeDevelopmentLockedFxState();
  applyShelfCameraDefaultAngle(false);
  setRange('fx-intensity', fx.intensity);
  setRange('fx-cineshake', fx.cinemaShake);
  setRange('fx-depth', fx.depth);
  setRange('fx-coverres', fx.coverResolution);
  setRange('fx-lyricglow', fx.lyricGlowStrength);
  setRange('fx-bgopacity', fx.backgroundOpacity == null ? 1 : fx.backgroundOpacity);
  setRange('fx-glassaberration', fx.controlGlassChromaticOffset);
  setRange('fx-desktoplyricssize', fx.desktopLyricsSize);
  setRange('fx-desktoplyricsopacity', fx.desktopLyricsOpacity);
  setRange('fx-desktoplyricsy', fx.desktopLyricsY);
  setRange('fx-wallpaperopacity', fx.wallpaperOpacity);
  setRange('fx-shelfsize', fx.shelfSize);
  setRange('fx-shelfx', fx.shelfOffsetX);
  setRange('fx-shelfy', fx.shelfOffsetY);
  setRange('fx-shelfz', fx.shelfOffsetZ);
  setRange('fx-shelfangle', fx.shelfAngleY);
  setRange('fx-shelfopacity', fx.shelfOpacity);
  setRange('fx-shelfbgalpha', fx.shelfBgOpacity);
  setRange('fx-lyricspacing', fx.lyricLetterSpacing);
  setRange('fx-lyriclineheight', fx.lyricLineHeight);
  setRange('fx-lyricweight', fx.lyricWeight);
  setRange('fx-lyricscale', fx.lyricScale);
  setRange('fx-lyricx', fx.lyricOffsetX);
  setRange('fx-lyricy', fx.lyricOffsetY);
  setRange('fx-lyricz', fx.lyricOffsetZ);
  setRange('fx-lyrictiltx', fx.lyricTiltX);
  setRange('fx-lyrictilty', fx.lyricTiltY);
  setRange('fx-point', fx.point);
  setRange('fx-speed', fx.speed);
  setRange('fx-twist', fx.twist);
  setRange('fx-color', fx.color);
  setRange('fx-bloom', fx.bloomStrength);
  setRange('fx-scatter', fx.scatter);
  setRange('fx-bgfade', fx.bgFade);
  updateLyricGlowControls();
  // 同步开关
  document.getElementById('t-float').classList.toggle('on', fx.floatLayer);
  var floatToggle = document.getElementById('t-float');
  if (floatToggle) floatToggle.classList.toggle('on', fx.floatLayer);
  document.getElementById('t-cinema').classList.toggle('on', fx.cinema);
  var lyricGlowToggle = document.getElementById('t-lyricGlow');
  if (lyricGlowToggle) lyricGlowToggle.classList.toggle('on', fx.lyricGlow);
  var lyricGlowBeatToggle = document.getElementById('t-lyricGlowBeat');
  if (lyricGlowBeatToggle) lyricGlowBeatToggle.classList.toggle('on', fx.lyricGlowBeat);
  var lyricGlowParticlesToggle = document.getElementById('t-lyricGlowParticles');
  if (lyricGlowParticlesToggle) lyricGlowParticlesToggle.classList.toggle('on', fx.lyricGlowParticles);
  var lyricCameraLockToggle = document.getElementById('t-lyricCameraLock');
  if (lyricCameraLockToggle) lyricCameraLockToggle.classList.toggle('on', fx.lyricCameraLock);
  document.getElementById('t-bloom').classList.toggle('on', fx.bloom);
  document.getElementById('t-edge').classList.toggle('on', fx.edge);
  var desktopLyricsToggle = document.getElementById('t-desktopLyrics');
  if (desktopLyricsToggle) desktopLyricsToggle.classList.toggle('on', fx.desktopLyrics);
  var desktopLyricsClickToggle = document.getElementById('t-desktopLyricsClickThrough');
  if (desktopLyricsClickToggle) desktopLyricsClickToggle.classList.toggle('on', fx.desktopLyricsClickThrough !== false);
  var desktopLyricsCinemaToggle = document.getElementById('t-desktopLyricsCinema');
  if (desktopLyricsCinemaToggle) desktopLyricsCinemaToggle.classList.toggle('on', fx.desktopLyricsCinema !== false);
  var desktopLyricsHighlightToggle = document.getElementById('t-desktopLyricsHighlight');
  if (desktopLyricsHighlightToggle) desktopLyricsHighlightToggle.classList.toggle('on', fx.desktopLyricsHighlight === true);
  updateDesktopLyricsFpsControls();
  var wallpaperModeToggle = document.getElementById('t-wallpaperMode');
  if (wallpaperModeToggle) wallpaperModeToggle.classList.toggle('on', fx.wallpaperMode);
  var shelfPodcastsToggle = document.getElementById('t-shelfShowPodcasts');
  if (shelfPodcastsToggle) shelfPodcastsToggle.classList.toggle('on', fx.shelfShowPodcasts !== false);
  var shelfMergeToggle = document.getElementById('t-shelfMergeCollections');
  if (shelfMergeToggle) shelfMergeToggle.classList.toggle('on', fx.shelfMergeCollections === true);
  var liveBackgroundKeepToggle = document.getElementById('t-liveBackgroundKeep');
  if (liveBackgroundKeepToggle) liveBackgroundKeepToggle.classList.toggle('on', fx.liveBackgroundKeep === true);
  updatePerformanceControls();
  updateDevelopmentFxControls();
  var aiDepthToggle = document.getElementById('t-aidepth');
  if (aiDepthToggle) aiDepthToggle.classList.toggle('on', fx.aiDepth);
  // 三态
  document.querySelectorAll('#shelf-seg button').forEach(function(b){ b.classList.toggle('active', b.dataset.shelf === fx.shelf); });
  updateShelfControlUi();
  document.querySelectorAll('#cam-seg button').forEach(function(b){ b.classList.toggle('active', b.dataset.cam === fx.cam); });
  refreshPresetGrid();
  updateLyricColorControls();
  updateLyricHighlightControls();
  updateLyricGlowControls();
  updateLyricFontControls();
  updateUiAccentControls();
  updateHomeAccentControls();
  updateIconAccentControls();
  updateCustomBackgroundControls();
  updateVisualTintControls();
  applyControlGlassChromaticOffset();
  syncFxUniforms();
}
function animateFxResetButton(btn) {
  if (!btn || !window.gsap) return;
  window.gsap.fromTo(btn, { rotate: -120, scale: 0.88 }, { rotate: 0, scale: 1, duration: 0.48, ease: 'expo.out', overwrite: true });
  window.gsap.fromTo(btn, { boxShadow: '0 0 0 0 rgba(244,210,138,.38)' }, { boxShadow: '0 0 0 8px rgba(244,210,138,0)', duration: 0.55, ease: 'sine.out', overwrite: true });
}
function resetFxSliderValue(id, key, btn) {
  if (!Object.prototype.hasOwnProperty.call(fxDefaults, key)) return;
  if (key === 'shelfAngleY') {
    fx.shelfAngleYManual = false;
    fx.shelfAngleY = shelfDefaultAngleForCameraMode(fx.shelfCameraMode);
  } else {
    fx[key] = fxDefaults[key];
  }
  setRange(id, fx[key]);
  if (key === 'coverResolution') applyCoverParticleResolution(fx[key], { reload: true });
  if (key === 'controlGlassChromaticOffset') applyControlGlassChromaticOffset();
  syncFxUniforms();
  if (key === 'lyricLetterSpacing' || key === 'lyricLineHeight' || key === 'lyricWeight') refreshCurrentLyricStyle();
  saveLyricLayout();
  animateFxResetButton(btn);
  showToast('已恢复默认数值');
}
function ensureFxSliderResetButton(id, key) {
  var el = document.getElementById(id);
  if (!el || !el.parentElement || el.parentElement.querySelector('.fx-reset-one')) return;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fx-reset-one';
  btn.title = '恢复当前滑条默认值';
  btn.setAttribute('aria-label', '恢复当前滑条默认值');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
  btn.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    resetFxSliderValue(id, key, btn);
  });
  el.parentElement.appendChild(btn);
}
var fxPanelTab = 'presets';
function setFxPanelTab(tab) {
  var allowed = { presets:1, appearance:1, lyrics:1, motion:1, advanced:1 };
  fxPanelTab = allowed[tab] ? tab : 'presets';
  var panel = document.getElementById('fx-panel');
  if (panel) panel.setAttribute('data-active-tab', fxPanelTab);
  document.querySelectorAll('#fx-panel-tabs [data-fx-tab]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-fx-tab') === fxPanelTab);
  });
  document.querySelectorAll('#fx-panel .fx-tab-page').forEach(function(page){
    page.classList.toggle('active', page.getAttribute('data-fx-page') === fxPanelTab);
  });
  repositionFxFloatingPanels();
}
function fxPanelInputId(node) {
  var input = node && node.querySelector ? node.querySelector('input[id]') : null;
  return input ? input.id : '';
}
function fxPanelTargetForNode(node, current) {
  if (!node) return current || 'presets';
  var id = node.id || '';
  var inputId = fxPanelInputId(node);
  if (id === 'preset-grid' || id === 'user-archive-grid') return 'presets';
  if (id === 'fx-lyric-fold') return 'lyrics';
  if (id === 'fx-overlay-fold' || id === 'fx-stage-fold') return 'motion';
  if (id === 'fx-advanced' || node.classList.contains('fx-actions')) return 'advanced';
  if (node.classList.contains('lyric-color-row') || node.classList.contains('cover-color-pop') || node.classList.contains('color-lab-pop') || node.classList.contains('cover-color-loupe')) return 'appearance';
  if (inputId === 'fx-bgopacity' || inputId === 'fx-glassaberration') return 'appearance';
  if (inputId === 'fx-lyricglow') return 'lyrics';
  if (/^fx-(intensity|depth|coverres|cineshake)$/.test(inputId)) return 'motion';
  return current || 'presets';
}
function organizeFxPanel() {
  var panel = document.getElementById('fx-panel');
  if (!panel) return;
  if (panel._fxPanelOrganized) {
    setFxPanelTab(fxPanelTab);
    return;
  }
  var head = panel.querySelector('.fx-head');
  var tabMeta = [
    ['presets', '\u9884\u8bbe'],
    ['appearance', '\u5916\u89c2'],
    ['lyrics', '\u6b4c\u8bcd'],
    ['motion', '\u52a8\u6001'],
    ['advanced', '\u9ad8\u7ea7']
  ];
  var tabs = document.createElement('div');
  tabs.className = 'fx-panel-tabs';
  tabs.id = 'fx-panel-tabs';
  tabMeta.forEach(function(meta){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-fx-tab', meta[0]);
    btn.textContent = meta[1];
    tabs.appendChild(btn);
  });
  if (head && head.nextSibling) panel.insertBefore(tabs, head.nextSibling);
  else panel.insertBefore(tabs, panel.firstChild);
  var pages = {};
  var insertAfter = tabs;
  tabMeta.forEach(function(meta){
    var page = document.createElement('div');
    page.className = 'fx-tab-page';
    page.setAttribute('data-fx-page', meta[0]);
    insertAfter.parentNode.insertBefore(page, insertAfter.nextSibling);
    insertAfter = page;
    pages[meta[0]] = page;
  });
  var original = Array.prototype.slice.call(panel.children).filter(function(child){
    return child !== head && child !== tabs && !child.classList.contains('fx-tab-page');
  });
  var current = 'presets';
  original.forEach(function(node, idx){
    var target;
    if (node.classList.contains('fx-section-label')) {
      target = fxPanelTargetForNode(original[idx + 1], current);
      current = target;
    } else {
      target = fxPanelTargetForNode(node, current);
      current = target;
    }
    (pages[target] || pages.presets).appendChild(node);
  });
  ['fx-lyric-fold','fx-overlay-fold','fx-stage-fold','fx-advanced'].forEach(function(id){
    var fold = document.getElementById(id);
    if (fold) fold.classList.add('open');
  });
  tabs.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('[data-fx-tab]') : null;
    if (!btn) return;
    setFxPanelTab(btn.getAttribute('data-fx-tab'));
  });
  panel._fxPanelOrganized = true;
  setFxPanelTab(fxPanelTab);
}

function fxControlBlock(id) {
  var el = document.getElementById(id);
  if (!el) return null;
  return el.closest('.fx-slider,.lyric-color-row,.lyric-color-grid,.fx-seg,.preset-grid,.user-archive-grid,.fx-font-grid') || el;
}
function setFxSectionBefore(id, text) {
  var block = fxControlBlock(id);
  if (!block || !block.parentNode) return;
  var prev = block.previousElementSibling;
  if (!prev || !prev.classList || !prev.classList.contains('fx-section-label')) {
    prev = document.createElement('div');
    prev.className = 'fx-section-label';
    block.parentNode.insertBefore(prev, block);
  }
  prev.textContent = text;
}
function setFxSliderLabel(id, text) {
  var block = fxControlBlock(id);
  var label = block && block.querySelector ? block.querySelector('label') : null;
  if (label) label.textContent = text;
}
function setFxSectionBeforeNode(node, text) {
  if (!node || !node.parentNode) return;
  var prev = node.previousElementSibling;
  if (!prev || !prev.classList || !prev.classList.contains('fx-section-label')) {
    prev = document.createElement('div');
    prev.className = 'fx-section-label';
    node.parentNode.insertBefore(prev, node);
  }
  prev.textContent = text;
}
function moveToggleToGrid(toggleId, grid) {
  var node = document.getElementById(toggleId);
  if (!node || !grid || node.parentNode === grid) return;
  grid.appendChild(node);
}
function ensureLyricPrimaryControls() {
  var body = document.querySelector('#fx-lyric-fold .fx-fold-body');
  if (!body) return;
  var grid = document.getElementById('fx-lyric-primary-controls');
  if (!grid) {
    var label = document.createElement('div');
    label.className = 'fx-section-label';
    label.id = 'fx-lyric-primary-label';
    label.textContent = '歌词开关';
    grid = document.createElement('div');
    grid.className = 'fx-toggle-grid lyric-primary-toggle-grid';
    grid.id = 'fx-lyric-primary-controls';
    body.insertBefore(grid, body.firstChild);
    body.insertBefore(label, grid);
  }
  [
    't-desktopLyrics',
    't-desktopLyricsClickThrough',
    't-desktopLyricsCinema',
    't-desktopLyricsHighlight',
    't-lyricCameraLock',
    't-lyricGlow',
    't-lyricGlowBeat',
    't-lyricGlowParticles'
  ].forEach(function(id){ moveToggleToGrid(id, grid); });
}
function applyBackgroundMediaHint() {
  var value = document.getElementById('bg-image-value');
  if (value && !value.dataset.mediaHint) {
    value.dataset.mediaHint = '1';
    value.title = '支持图片 JPG / PNG / WebP 与视频 MP4 / WebM / MOV 上传';
  }
  var label = value && value.closest ? value.closest('.fx-color-row-label') : null;
  if (label && !document.getElementById('bg-media-hint')) {
    var hint = document.createElement('small');
    hint.id = 'bg-media-hint';
    hint.textContent = '支持图片 / 视频上传';
    label.appendChild(hint);
  }
}
function relabelFxPanelControls() {
  var title = document.querySelector('#fx-panel .fx-title');
  if (title) title.textContent = '视觉控制台';
  ensureLyricPrimaryControls();
  applyBackgroundMediaHint();
  var overlayGrid = document.getElementById('t-cinema');
  overlayGrid = overlayGrid && overlayGrid.closest('.fx-toggle-grid');
  setFxSectionBeforeNode(overlayGrid, '镜头与叠加');
  setFxSectionBefore('preset-grid', '预设与存档');
  setFxSectionBefore('user-archive-grid', '用户存档');
  setFxSectionBefore('ui-accent-picker', '界面与背景');
  setFxSectionBefore('fx-intensity', '画面基础');
  setFxSectionBefore('fx-lyricglow', '歌词溢光强度');
  setFxSectionBefore('lyric-color-grid', '文字颜色');
  setFxSectionBefore('lyric-highlight-picker', '跟唱高亮');
  setFxSectionBefore('lyric-glow-row', '歌词溢光颜色');
  setFxSectionBefore('lyric-source-seg', '歌词来源');
  setFxSectionBefore('lyric-font-grid', '字体与字距');
  setFxSectionBefore('fx-lyricscale', '位置与角度');
  setFxSectionBefore('fx-desktoplyricssize', '桌面歌词');
  setFxSectionBefore('desktop-lyrics-fps-seg', '桌面歌词帧率');
  setFxSectionBefore('shelf-seg', '3D 歌单架');
  setFxSectionBefore('shelf-camera-seg', '歌单架镜头');
  setFxSectionBefore('shelf-presence-seg', '歌单架显示');
  setFxSectionBefore('shelf-accent-picker', '歌单架外观');
  setFxSectionBefore('fx-shelfsize', '歌单架参数');
  setFxSectionBefore('cam-seg', '摄像头交互');
  setFxSectionBefore('fx-point', '粒子高级参数');
  setFxSliderLabel('fx-intensity', '律动强度');
  setFxSliderLabel('fx-depth', '画面景深');
  setFxSliderLabel('fx-coverres', '封面清晰度');
  setFxSliderLabel('fx-cineshake', '电影镜头');
  setFxSliderLabel('fx-lyricglow', '溢光强度');
  setFxSliderLabel('fx-bgopacity', '背景透明度');
  setFxSliderLabel('fx-glassaberration', '玻璃色差');
  setFxSliderLabel('fx-lyricspacing', '字间距');
  setFxSliderLabel('fx-lyriclineheight', '行距');
  setFxSliderLabel('fx-lyricweight', '字重');
  setFxSliderLabel('fx-lyricscale', '歌词大小');
  setFxSliderLabel('fx-lyricx', '左右位置');
  setFxSliderLabel('fx-lyricy', '上下位置');
  setFxSliderLabel('fx-lyricz', '前后景深');
  setFxSliderLabel('fx-lyrictiltx', '上下旋转');
  setFxSliderLabel('fx-lyrictilty', '左右旋转');
  setFxSliderLabel('fx-desktoplyricssize', '桌面歌词大小');
  setFxSliderLabel('fx-desktoplyricsopacity', '桌面歌词透明度');
  setFxSliderLabel('fx-desktoplyricsy', '桌面歌词高度');
  setFxSliderLabel('fx-wallpaperopacity', '壁纸透明度');
  setFxSliderLabel('fx-shelfsize', '歌单架大小');
  setFxSliderLabel('fx-shelfx', '左右位置');
  setFxSliderLabel('fx-shelfy', '上下位置');
  setFxSliderLabel('fx-shelfz', '前后景深');
  setFxSliderLabel('fx-shelfangle', '侧向角度');
  setFxSliderLabel('fx-shelfopacity', '整体透明度');
  setFxSliderLabel('fx-shelfbgalpha', '背景透明度');
  setFxSliderLabel('fx-point', '粒子尺寸');
  setFxSliderLabel('fx-speed', '运动速度');
  setFxSliderLabel('fx-twist', '粒子扭曲');
  setFxSliderLabel('fx-color', '色彩张力');
  setFxSliderLabel('fx-bloom', '光晕强度');
  setFxSliderLabel('fx-scatter', '离散感');
  setFxSliderLabel('fx-bgfade', '背景压暗');
}

function getHotkeyDefaults() {
  var defaults = { local: {}, global: {} };
  HOTKEY_ACTIONS.forEach(function(action){
    defaults.local[action.key] = action.local || '';
    defaults.global[action.key] = action.global || '';
  });
  return defaults;
}
function readHotkeySettings() {
  var defaults = getHotkeyDefaults();
  try {
    var raw = JSON.parse(localStorage.getItem(HOTKEY_SETTINGS_STORE_KEY) || '{}') || {};
    return {
      local: Object.assign({}, defaults.local, raw.local || {}),
      global: Object.assign({}, defaults.global, raw.global || {})
    };
  } catch (e) {
    return defaults;
  }
}
function saveHotkeySettings() {
  try { localStorage.setItem(HOTKEY_SETTINGS_STORE_KEY, JSON.stringify(hotkeySettings || getHotkeyDefaults())); } catch (e) {}
}
function hotkeyActionMeta(actionKey) {
  for (var i = 0; i < HOTKEY_ACTIONS.length; i++) {
    if (HOTKEY_ACTIONS[i].key === actionKey) return HOTKEY_ACTIONS[i];
  }
  return null;
}
function isModifierKeyCode(code) {
  return /^(ControlLeft|ControlRight|ShiftLeft|ShiftRight|AltLeft|AltRight|MetaLeft|MetaRight)$/i.test(String(code || ''));
}
function normalizeHotkeyEvent(e) {
  if (!e || isModifierKeyCode(e.code)) return '';
  var mods = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Meta');
  var code = e.code || '';
  if (!code && e.key) code = String(e.key).length === 1 ? 'Key' + String(e.key).toUpperCase() : String(e.key);
  if (!code) return '';
  return mods.concat([code]).join('+');
}
function hotkeyDisplayPart(part) {
  if (part === 'Ctrl') return 'Ctrl';
  if (part === 'Alt') return 'Alt';
  if (part === 'Shift') return 'Shift';
  if (part === 'Meta') return 'Win';
  if (part === 'Space') return 'Space';
  if (part === 'ArrowLeft') return 'Left';
  if (part === 'ArrowRight') return 'Right';
  if (part === 'ArrowUp') return 'Up';
  if (part === 'ArrowDown') return 'Down';
  if (/^Key[A-Z]$/.test(part)) return part.slice(3);
  if (/^Digit[0-9]$/.test(part)) return part.slice(5);
  if (/^Numpad[0-9]$/.test(part)) return 'Num' + part.slice(6);
  return part.replace(/^Equal$/, '=').replace(/^Minus$/, '-');
}
function formatHotkey(hotkey) {
  hotkey = String(hotkey || '').trim();
  if (!hotkey) return '未设置';
  return hotkey.split('+').map(hotkeyDisplayPart).join(' + ');
}
function hotkeyToAccelerator(hotkey) {
  var parts = String(hotkey || '').split('+').filter(Boolean);
  if (!parts.length) return '';
  return parts.map(function(part){
    if (part === 'Ctrl') return 'Control';
    if (part === 'Alt') return 'Alt';
    if (part === 'Shift') return 'Shift';
    if (part === 'Meta') return 'Super';
    if (part === 'Space') return 'Space';
    if (part === 'ArrowLeft') return 'Left';
    if (part === 'ArrowRight') return 'Right';
    if (part === 'ArrowUp') return 'Up';
    if (part === 'ArrowDown') return 'Down';
    if (/^Key[A-Z]$/.test(part)) return part.slice(3);
    if (/^Digit[0-9]$/.test(part)) return part.slice(5);
    return part;
  }).join('+');
}
function hotkeyDuplicateMap(scope) {
  var map = {};
  var source = (hotkeySettings && hotkeySettings[scope]) || {};
  Object.keys(source).forEach(function(action){
    var key = String(source[action] || '').trim();
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}
function executeHotkeyAction(actionKey, source) {
  if (actionKey === 'togglePlay') return togglePlay();
  if (actionKey === 'prevTrack') return prevTrack();
  if (actionKey === 'nextTrack') return nextTrack();
  if (actionKey === 'volumeUp') return adjustVolumeByKeyboard(0.05);
  if (actionKey === 'volumeDown') return adjustVolumeByKeyboard(-0.05);
  if (actionKey === 'toggleFullscreen') return toggleFullscreen();
  if (actionKey === 'toggleDesktopLyrics') return toggleFx('desktopLyrics');
}
function handleConfiguredLocalHotkey(e) {
  if (!hotkeySettings || !hotkeySettings.local || isTypingTarget(e.target)) return false;
  if (hotkeyCaptureState || document.getElementById('hotkey-modal') && document.getElementById('hotkey-modal').classList.contains('show')) return false;
  if (freeCamera && freeCamera.active && /^(KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/.test(e.code)) return false;
  var combo = normalizeHotkeyEvent(e);
  if (!combo) return false;
  var duplicate = hotkeyDuplicateMap('local');
  for (var i = 0; i < HOTKEY_ACTIONS.length; i++) {
    var action = HOTKEY_ACTIONS[i];
    if (hotkeySettings.local[action.key] !== combo) continue;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat && !/^volume/.test(action.key)) return true;
    if (duplicate[combo] > 1) return true;
    executeHotkeyAction(action.key, 'local');
    return true;
  }
  return false;
}
function shouldSuppressDefaultConfiguredHotkey(e) {
  if (!hotkeySettings || !hotkeySettings.local) return false;
  var combo = normalizeHotkeyEvent(e);
  if (!combo) return false;
  for (var i = 0; i < HOTKEY_ACTIONS.length; i++) {
    var action = HOTKEY_ACTIONS[i];
    if (action.local === combo && hotkeySettings.local[action.key] !== combo) return true;
  }
  return false;
}
function ensureHotkeySettingsButton() {
  var panel = document.getElementById('fx-panel');
  var head = panel && panel.querySelector('.fx-head');
  if (!head || document.getElementById('hotkey-settings-btn')) return;
  if (head.firstElementChild) head.firstElementChild.classList.add('fx-head-main');
  var actions = document.createElement('div');
  actions.className = 'fx-head-actions';
  var btn = document.createElement('button');
  btn.id = 'hotkey-settings-btn';
  btn.type = 'button';
  btn.className = 'fx-mini-btn ghost';
  btn.textContent = '热键';
  btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); openHotkeySettings(); });
  actions.appendChild(btn);
  head.appendChild(actions);
}
function ensureHotkeyModal() {
  var modal = document.getElementById('hotkey-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'hotkey-modal';
  modal.className = 'hotkey-modal';
  modal.innerHTML =
    '<div class="hotkey-dialog" role="dialog" aria-modal="true" aria-label="热键设置">' +
      '<div class="hotkey-head">' +
        '<div><div class="hotkey-title">热键设置</div><div class="hotkey-sub">局内热键只在 Mineradio 窗口内生效；全局热键会向系统注册，并检测是否被占用。</div></div>' +
        '<button class="hotkey-close" type="button" data-hotkey-close aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="hotkey-toolbar">' +
        '<div class="hotkey-tabs"><button type="button" data-hotkey-scope="local" class="active">局内热键</button><button type="button" data-hotkey-scope="global">全局热键</button></div>' +
        '<div class="hotkey-note">按 Backspace / Delete 可清空当前功能热键</div>' +
      '</div>' +
      '<div id="hotkey-local-section" class="hotkey-section active"></div>' +
      '<div id="hotkey-global-section" class="hotkey-section"></div>' +
      '<div class="hotkey-capture-tip" id="hotkey-capture-tip">正在录入组合键，按 Esc 取消。</div>' +
    '</div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e){
    if (e.target === modal || e.target.closest('[data-hotkey-close]')) closeHotkeySettings();
    var scopeBtn = e.target.closest('[data-hotkey-scope]');
    if (scopeBtn) setHotkeyModalScope(scopeBtn.getAttribute('data-hotkey-scope'));
    var bindBtn = e.target.closest('[data-hotkey-bind]');
    if (bindBtn) startHotkeyCapture(bindBtn.getAttribute('data-hotkey-action'), bindBtn.getAttribute('data-hotkey-bind'));
    var resetBtn = e.target.closest('[data-hotkey-reset]');
    if (resetBtn) resetHotkeyBinding(resetBtn.getAttribute('data-hotkey-action'), resetBtn.getAttribute('data-hotkey-reset'));
  });
  return modal;
}
function hotkeyStatusMarkup(scope, actionKey, binding, duplicate) {
  if (!binding) return '<span class="hotkey-status">未设置</span>';
  if (duplicate && duplicate[binding] > 1) return '<span class="hotkey-status conflict"><span class="source-icon">!</span>Mineradio 内部重复</span>';
  if (scope === 'local') return '<span class="hotkey-status ok">可用</span>';
  var status = hotkeyGlobalStatus[actionKey];
  if (!status) return '<span class="hotkey-status">待检测</span>';
  if (status.ok) return '<span class="hotkey-status ok">可用</span>';
  var source = status.conflict && status.conflict.sourceName || '系统 / 其他软件';
  return '<span class="hotkey-status conflict"><span class="source-icon">!</span>' + escHtml(source) + '</span>';
}
function renderHotkeyScope(scope) {
  var wrap = document.getElementById(scope === 'global' ? 'hotkey-global-section' : 'hotkey-local-section');
  if (!wrap) return;
  var duplicate = hotkeyDuplicateMap(scope);
  var html = '';
  var groups = {};
  HOTKEY_ACTIONS.forEach(function(action){
    (groups[action.category] = groups[action.category] || []).push(action);
  });
  Object.keys(groups).forEach(function(category){
    html += '<div class="hotkey-group"><div class="hotkey-group-title">' + escHtml(category) + '</div>';
    groups[category].forEach(function(action){
      var binding = (hotkeySettings[scope] && hotkeySettings[scope][action.key]) || '';
      html += '<div class="hotkey-row">' +
        '<div class="hotkey-name">' + escHtml(action.label) + '</div>' +
        '<button class="hotkey-key' + (hotkeyCaptureState && hotkeyCaptureState.scope === scope && hotkeyCaptureState.action === action.key ? ' capturing' : '') + '" type="button" data-hotkey-bind="' + scope + '" data-hotkey-action="' + action.key + '">' + escHtml(hotkeyCaptureState && hotkeyCaptureState.scope === scope && hotkeyCaptureState.action === action.key ? '按下组合键...' : formatHotkey(binding)) + '</button>' +
        '<button class="hotkey-reset" type="button" data-hotkey-reset="' + scope + '" data-hotkey-action="' + action.key + '">默认</button>' +
        hotkeyStatusMarkup(scope, action.key, binding, duplicate) +
      '</div>';
    });
    html += '</div>';
  });
  wrap.innerHTML = html;
}
function renderHotkeySettings() {
  var modal = ensureHotkeyModal();
  var active = modal.getAttribute('data-scope') || 'local';
  modal.classList.toggle('capturing', !!hotkeyCaptureState);
  modal.querySelectorAll('[data-hotkey-scope]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-hotkey-scope') === active);
  });
  var local = document.getElementById('hotkey-local-section');
  var global = document.getElementById('hotkey-global-section');
  if (local) local.classList.toggle('active', active === 'local');
  if (global) global.classList.toggle('active', active === 'global');
  renderHotkeyScope('local');
  renderHotkeyScope('global');
}
function setHotkeyModalScope(scope) {
  var modal = ensureHotkeyModal();
  modal.setAttribute('data-scope', scope === 'global' ? 'global' : 'local');
  renderHotkeySettings();
}
function openHotkeySettings() {
  var modal = ensureHotkeyModal();
  modal.classList.add('show');
  modal.setAttribute('data-scope', modal.getAttribute('data-scope') || 'local');
  renderHotkeySettings();
  registerGlobalHotkeys();
}
function closeHotkeySettings() {
  hotkeyCaptureState = null;
  var modal = document.getElementById('hotkey-modal');
  if (modal) modal.classList.remove('show', 'capturing');
}
function startHotkeyCapture(action, scope) {
  hotkeyCaptureState = { action: action, scope: scope === 'global' ? 'global' : 'local' };
  var modal = ensureHotkeyModal();
  modal.setAttribute('data-scope', hotkeyCaptureState.scope);
  renderHotkeySettings();
}
function setHotkeyBinding(action, scope, value) {
  if (!hotkeySettings) hotkeySettings = getHotkeyDefaults();
  if (!hotkeySettings[scope]) hotkeySettings[scope] = {};
  hotkeySettings[scope][action] = value || '';
  saveHotkeySettings();
  renderHotkeySettings();
  if (scope === 'global') registerGlobalHotkeys();
}
function resetHotkeyBinding(action, scope) {
  var meta = hotkeyActionMeta(action);
  if (!meta) return;
  setHotkeyBinding(action, scope, scope === 'global' ? meta.global : meta.local);
}
function registerGlobalHotkeys() {
  var api = getDesktopWindowApi && getDesktopWindowApi();
  if (!api || typeof api.configureGlobalHotkeys !== 'function') {
    hotkeyGlobalStatus = {};
    renderHotkeySettings();
    return Promise.resolve();
  }
  var duplicate = hotkeyDuplicateMap('global');
  var bindings = [];
  HOTKEY_ACTIONS.forEach(function(action){
    var key = hotkeySettings.global && hotkeySettings.global[action.key];
    if (!key || duplicate[key] > 1) return;
    var accelerator = hotkeyToAccelerator(key);
    if (accelerator) bindings.push({ action: action.key, accelerator: accelerator });
  });
  return api.configureGlobalHotkeys(bindings).then(function(res){
    var next = {};
    (res && res.results || []).forEach(function(item){
      next[item.action] = item;
    });
    hotkeyGlobalStatus = next;
    renderHotkeySettings();
  }).catch(function(){
    hotkeyGlobalStatus = {};
    renderHotkeySettings();
  });
}
var globalHotkeyListenerBound = false;
function bindHotkeySettings() {
  ensureHotkeySettingsButton();
  ensureHotkeyModal();
  if (!globalHotkeyListenerBound) {
    var api = getDesktopWindowApi && getDesktopWindowApi();
    if (api && typeof api.onGlobalHotkey === 'function') {
      globalHotkeyListenerBound = true;
      api.onGlobalHotkey(function(payload){
        if (!payload || !payload.action) return;
        executeHotkeyAction(payload.action, 'global');
      });
    }
  }
  registerGlobalHotkeys();
}
document.addEventListener('keydown', function(e){
  var hotkeyModal = document.getElementById('hotkey-modal');
  if (!hotkeyCaptureState) {
    if (hotkeyModal && hotkeyModal.classList.contains('show') && e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeHotkeySettings();
    }
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  if (e.code === 'Escape') {
    hotkeyCaptureState = null;
    renderHotkeySettings();
    return;
  }
  if (e.code === 'Backspace' || e.code === 'Delete') {
    var clearTarget = hotkeyCaptureState;
    hotkeyCaptureState = null;
    setHotkeyBinding(clearTarget.action, clearTarget.scope, '');
    return;
  }
  var combo = normalizeHotkeyEvent(e);
  if (!combo) return;
  var target = hotkeyCaptureState;
  hotkeyCaptureState = null;
  setHotkeyBinding(target.action, target.scope, combo);
}, true);
function bindFxPanel() {
  liftFxFloatingPopups();
  organizeFxPanel();
  relabelFxPanelControls();
  bindHotkeySettings();
  buildPresetGrid();
  renderUserFxArchives();
  buildLyricColorControls();
  var ids = [
    ['fx-intensity','intensity'],['fx-depth','depth'],['fx-coverres','coverResolution'],['fx-cineshake','cinemaShake'],['fx-lyricglow','lyricGlowStrength'],['fx-bgopacity','backgroundOpacity'],['fx-glassaberration','controlGlassChromaticOffset'],
    ['fx-desktoplyricssize','desktopLyricsSize'],['fx-desktoplyricsopacity','desktopLyricsOpacity'],['fx-desktoplyricsy','desktopLyricsY'],['fx-wallpaperopacity','wallpaperOpacity'],
    ['fx-shelfsize','shelfSize'],['fx-shelfx','shelfOffsetX'],['fx-shelfy','shelfOffsetY'],['fx-shelfz','shelfOffsetZ'],['fx-shelfangle','shelfAngleY'],['fx-shelfopacity','shelfOpacity'],['fx-shelfbgalpha','shelfBgOpacity'],
    ['fx-lyricspacing','lyricLetterSpacing'],['fx-lyriclineheight','lyricLineHeight'],['fx-lyricweight','lyricWeight'],
    ['fx-lyricscale','lyricScale'],['fx-lyricx','lyricOffsetX'],['fx-lyricy','lyricOffsetY'],['fx-lyricz','lyricOffsetZ'],['fx-lyrictiltx','lyricTiltX'],['fx-lyrictilty','lyricTiltY'],
    ['fx-point','point'],['fx-speed','speed'],['fx-twist','twist'],
    ['fx-color','color'],['fx-bloom','bloomStrength'],['fx-scatter','scatter'],['fx-bgfade','bgFade'],
  ];
  ids.forEach(function(pair){
    var el = document.getElementById(pair[0]);
    if (!el) return;
    ensureFxSliderResetButton(pair[0], pair[1]);
    el.addEventListener('input', function(){
      fx[pair[1]] = parseFloat(el.value);
      var out = el.parentElement.querySelector('output');
      if (pair[1] === 'coverResolution') {
        fx.coverResolution = normalizeCoverResolution(fx.coverResolution);
        applyCoverParticleResolution(fx.coverResolution, { reload: true });
      }
      if (pair[1] === 'lyricWeight') fx.lyricWeight = Math.round(clampRange(fx.lyricWeight, 500, 900) / 50) * 50;
      if (pair[1] === 'backgroundOpacity') {
        fx.backgroundOpacity = clampRange(fx.backgroundOpacity, 0, 1);
        fx.backgroundColorMode = 'custom';
        fx.backgroundColorCustom = true;
        updateCustomBackgroundControls();
      }
      if (pair[1] === 'controlGlassChromaticOffset') {
        fx.controlGlassChromaticOffset = normalizeControlGlassChromaticOffset(fx.controlGlassChromaticOffset);
        applyControlGlassChromaticOffset();
      }
      if (pair[1] === 'desktopLyricsSize') fx.desktopLyricsSize = clampRange(fx.desktopLyricsSize, 0.72, 1.55);
      if (pair[1] === 'desktopLyricsOpacity') fx.desktopLyricsOpacity = clampRange(fx.desktopLyricsOpacity, 0.28, 1);
      if (pair[1] === 'desktopLyricsY') fx.desktopLyricsY = clampRange(fx.desktopLyricsY, 0.08, 0.92);
      if (pair[1] === 'wallpaperOpacity') fx.wallpaperOpacity = clampRange(fx.wallpaperOpacity, 0.35, 1);
      if (pair[1] === 'shelfSize') fx.shelfSize = clampRange(fx.shelfSize, 0.65, 1.45);
      if (pair[1] === 'shelfOffsetX') fx.shelfOffsetX = clampRange(fx.shelfOffsetX, -1.2, 1.2);
      if (pair[1] === 'shelfOffsetY') fx.shelfOffsetY = clampRange(fx.shelfOffsetY, -0.9, 0.9);
      if (pair[1] === 'shelfOffsetZ') fx.shelfOffsetZ = clampRange(fx.shelfOffsetZ, -0.9, 0.9);
      if (pair[1] === 'shelfAngleY') {
        fx.shelfAngleYManual = true;
        fx.shelfAngleY = Math.round(clampRange(fx.shelfAngleY, -30, 30));
      }
      if (pair[1] === 'shelfOpacity') fx.shelfOpacity = clampRange(fx.shelfOpacity, 0.25, 1);
      if (pair[1] === 'shelfBgOpacity') fx.shelfBgOpacity = clampRange(fx.shelfBgOpacity, 0.25, 0.98);
      if (pair[1] === 'lyricTiltX' || pair[1] === 'lyricTiltY') fx[pair[1]] = Math.round(clampRange(fx[pair[1]], -42, 42));
      if (out) out.textContent = pair[1] === 'coverResolution'
        ? coverParticleCountLabel(fx.coverResolution)
        : (pair[1] === 'lyricWeight' || pair[1] === 'controlGlassChromaticOffset' || pair[1] === 'lyricTiltX' || pair[1] === 'lyricTiltY' || pair[1] === 'shelfAngleY' ? String(Math.round(fx[pair[1]])) : Number(el.value).toFixed(pair[1] === 'lyricLetterSpacing' ? 3 : 2));
      syncFxUniforms();
      if (/^shelf(Size|OffsetX|OffsetY|OffsetZ|AngleY|Opacity|BgOpacity)$/.test(pair[1]) && shelfManager && shelfManager.refreshTheme) shelfManager.refreshTheme();
      if (pair[1] === 'lyricLetterSpacing' || pair[1] === 'lyricLineHeight' || pair[1] === 'lyricWeight') refreshCurrentLyricStyle();
      if (pair[1] === 'lyricLetterSpacing' || pair[1] === 'lyricLineHeight' || pair[1] === 'lyricWeight' || pair[1] === 'lyricScale' || pair[1] === 'lyricGlowStrength') pushDesktopLyricsState(true);
      if (/^(desktopLyricsSize|desktopLyricsOpacity|desktopLyricsY)$/.test(pair[1])) pushDesktopLyricsState(true);
      if (pair[1] === 'wallpaperOpacity') pushWallpaperState(true);
      saveLyricLayout();
    });
  });
  var lyricPicker = document.getElementById('lyric-color-picker');
  if (lyricPicker) {
    lyricPicker.addEventListener('input', function(){ setLyricColorCustom(lyricPicker.value, true); });
    lyricPicker.addEventListener('change', function(){ showToast('歌词颜色: ' + normalizeHexColor(lyricPicker.value).toUpperCase()); });
  }
  var lyricHighlightPicker = document.getElementById('lyric-highlight-picker');
  if (lyricHighlightPicker) {
    lyricHighlightPicker.addEventListener('input', function(){ setLyricHighlightCustom(lyricHighlightPicker.value, true); });
    lyricHighlightPicker.addEventListener('change', function(){ showToast('高亮颜色: ' + normalizeHexColor(lyricHighlightPicker.value).toUpperCase()); });
  }
  var lyricGlowPicker = document.getElementById('lyric-glow-picker');
  if (lyricGlowPicker) {
    lyricGlowPicker.addEventListener('input', function(){ setLyricGlowCustom(lyricGlowPicker.value, true); });
    lyricGlowPicker.addEventListener('change', function(){ showToast('溢光颜色: ' + normalizeHexColor(lyricGlowPicker.value).toUpperCase()); });
  }
  var uiAccentPicker = document.getElementById('ui-accent-picker');
  if (uiAccentPicker) {
    uiAccentPicker.addEventListener('input', function(){ setUiAccentColor(uiAccentPicker.value, true); });
    uiAccentPicker.addEventListener('change', function(){ showToast('界面高亮: ' + normalizeHexColor(uiAccentPicker.value, '#00f5d4').toUpperCase()); });
  }
  var visualTintPicker = document.getElementById('visual-tint-picker');
  if (visualTintPicker) {
    visualTintPicker.addEventListener('input', function(){ setVisualTintCustom(visualTintPicker.value, true); });
    visualTintPicker.addEventListener('change', function(){ showToast('视觉主色: ' + normalizeHexColor(visualTintPicker.value).toUpperCase()); });
  }
  var homeAccentPicker = document.getElementById('home-accent-picker');
  if (homeAccentPicker) {
    homeAccentPicker.addEventListener('input', function(){ setHomeAccentColor(homeAccentPicker.value, true); });
    homeAccentPicker.addEventListener('change', function(){ showToast('Home 填充: ' + normalizeHexColor(homeAccentPicker.value).toUpperCase()); });
  }
  var homeIconPicker = document.getElementById('home-icon-picker');
  if (homeIconPicker) {
    homeIconPicker.addEventListener('input', function(){ setHomeIconColor(homeIconPicker.value, true); });
    homeIconPicker.addEventListener('change', function(){ showToast('主页图标: ' + normalizeHexColor(homeIconPicker.value, '#f4d28a').toUpperCase()); });
  }
  var visualIconPicker = document.getElementById('visual-icon-picker');
  if (visualIconPicker) {
    visualIconPicker.addEventListener('input', function(){ setVisualIconColor(visualIconPicker.value, true); });
    visualIconPicker.addEventListener('change', function(){ showToast('视觉图标: ' + normalizeHexColor(visualIconPicker.value, '#7fd8ff').toUpperCase()); });
  }
  var bgColorPicker = document.getElementById('bg-color-picker');
  if (bgColorPicker) {
    bgColorPicker.addEventListener('input', function(){ setCustomBackgroundColor(bgColorPicker.value, true); });
    bgColorPicker.addEventListener('change', function(){ showToast('背景颜色: ' + normalizeHexColor(bgColorPicker.value, '#000000').toUpperCase()); });
  }
  var shelfAccentPicker = document.getElementById('shelf-accent-picker');
  if (shelfAccentPicker) {
    shelfAccentPicker.addEventListener('input', function(){ setShelfAccentColor(shelfAccentPicker.value, true); });
    shelfAccentPicker.addEventListener('change', function(){ showToast('歌单架颜色: ' + shelfAccentHex().toUpperCase()); });
  }
  var bgImageInput = document.getElementById('background-image-input');
  if (bgImageInput) {
    bgImageInput.addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      if (file) readBackgroundMediaFile(file);
      e.target.value = '';
    });
  }
  ['ui-accent-picker','visual-tint-picker','home-accent-picker','home-icon-picker','visual-icon-picker','bg-color-picker','shelf-accent-picker','lyric-color-picker','lyric-highlight-picker','lyric-glow-picker'].forEach(function(id){
    bindColorLabPicker(document.getElementById(id));
  });
  bindColorLabRows();
  var sv = document.getElementById('color-lab-sv');
  if (sv && !sv._bound) {
    sv._bound = true;
    sv.addEventListener('pointerdown', function(e){
      e.preventDefault();
      colorLabState.dragging = true;
      sv.setPointerCapture && sv.setPointerCapture(e.pointerId);
      updateColorLabFromSv(e);
    });
    sv.addEventListener('pointermove', function(e){ if (colorLabState.dragging) updateColorLabFromSv(e); });
    sv.addEventListener('pointerup', function(){ colorLabState.dragging = false; });
    sv.addEventListener('pointercancel', function(){ colorLabState.dragging = false; });
  }
  var hue = document.getElementById('color-lab-hue');
  if (hue && !hue._bound) {
    hue._bound = true;
    hue.addEventListener('input', function(){
      colorLabState.h = clampRange(Number(hue.value) || 0, 0, 360) / 360;
      var hex = hsvToHex(colorLabState.h, colorLabState.s, colorLabState.v);
      syncColorLabUi(hex);
      applyColorLabValue(hex, true);
    });
  }
  var hexInput = document.getElementById('color-lab-hex');
  if (hexInput && !hexInput._bound) {
    hexInput._bound = true;
    hexInput.addEventListener('change', function(){
      var hex = normalizeHexColor(hexInput.value || '#000000', '#000000');
      syncColorLabUi(hex);
      applyColorLabValue(hex);
    });
  }
  var presets = document.getElementById('color-lab-presets');
  if (presets && !presets._bound) {
    presets._bound = true;
    presets.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('[data-color]') : null;
      if (!btn) return;
      var hex = normalizeHexColor(btn.getAttribute('data-color') || '#000000', '#000000');
      syncColorLabUi(hex);
      applyColorLabValue(hex);
    });
  }
  if (!document._colorLabOutsideBound) {
    document._colorLabOutsideBound = true;
    document.addEventListener('mousedown', function(e){
      var pop = document.getElementById('color-lab-pop');
      if (!pop || !pop.classList.contains('show')) return;
      if (e.target && (e.target.closest('#color-lab-pop') || e.target.closest('.lyric-color-picker') || e.target.closest('.lyric-color-row'))) return;
      closeColorLab();
    }, true);
    document.addEventListener('mousedown', function(e){
      var pop = document.getElementById('cover-color-pop');
      if (!pop || !pop.classList.contains('show')) return;
      if (e.target && (e.target.closest('#cover-color-pop') || e.target.closest('#visual-tint-auto-btn'))) return;
      closeCoverColorPicker();
    }, true);
  }
  // 三态
  document.querySelectorAll('#shelf-seg button').forEach(function(b){
    b.addEventListener('click', function(){ setShelfMode(b.dataset.shelf); });
  });
  document.querySelectorAll('#shelf-camera-seg [data-shelf-camera]').forEach(function(b){
    b.addEventListener('click', function(){ setShelfCameraMode(b.getAttribute('data-shelf-camera')); });
  });
  document.querySelectorAll('#shelf-presence-seg [data-shelf-presence]').forEach(function(b){
    b.addEventListener('click', function(){ setShelfPresence(b.getAttribute('data-shelf-presence')); });
  });
  document.querySelectorAll('#cam-seg button').forEach(function(b){
    b.addEventListener('click', function(){ setCamMode(b.dataset.cam); });
  });
  document.querySelectorAll('#desktop-lyrics-fps-seg [data-desktop-lyrics-fps]').forEach(function(btn){
    btn.addEventListener('click', function(){
      fx.desktopLyricsFps = normalizeDesktopLyricsFps(btn.getAttribute('data-desktop-lyrics-fps'));
      updateDesktopLyricsFpsControls();
      saveLyricLayout();
      pushDesktopLyricsState(true);
      showToast(fx.desktopLyricsFps ? ('桌面歌词帧数 ' + fx.desktopLyricsFps) : '桌面歌词帧数无上限');
    });
  });
  document.querySelectorAll('#performance-background-seg [data-performance-background]').forEach(function(btn){
    btn.addEventListener('click', function(){
      setPerformanceBackgroundMode(btn.getAttribute('data-performance-background'));
    });
  });
  document.querySelectorAll('#performance-quality-seg [data-performance-quality]').forEach(function(btn){
    btn.addEventListener('click', function(){
      setPerformanceQualityMode(btn.getAttribute('data-performance-quality'));
    });
  });
  updateFxInputs();
}
function toggleFx(key) {
  if (isDevelopmentLockedFx(key)) {
    normalizeDevelopmentLockedFxState();
    saveLyricLayout();
    updateFxInputs();
    applyDesktopLyricsState(true);
    applyWallpaperModeState(true);
    showToast('开发中，暂不可用');
    return;
  }
  fx[key] = !fx[key];
  var toggleId = 't-' + (key === 'floatLayer' ? 'float' : key === 'aiDepth' ? 'aidepth' : key);
  var toggle = document.getElementById(toggleId);
  if (toggle) toggle.classList.toggle('on', fx[key]);
  syncFxUniforms();
  if (key === 'lyricCameraLock' || key === 'lyricGlow' || key === 'lyricGlowBeat' || key === 'lyricGlowParticles' || key === 'bloom' || key === 'edge' || key === 'cinema' || key === 'desktopLyrics' || key === 'desktopLyricsClickThrough' || key === 'desktopLyricsCinema' || key === 'desktopLyricsHighlight' || key === 'wallpaperMode' || key === 'shelfShowPodcasts' || key === 'shelfMergeCollections' || key === 'liveBackgroundKeep') saveLyricLayout();
  if (key === 'floatLayer') { if (fx.floatLayer) createFloatLayer(); else destroyFloatLayer(); }
  if (key === 'desktopLyrics') applyDesktopLyricsState(true);
  if (key === 'desktopLyricsClickThrough' || key === 'desktopLyricsCinema' || key === 'desktopLyricsHighlight') pushDesktopLyricsState(true);
  if (key === 'lyricGlow' || key === 'lyricGlowBeat' || key === 'lyricGlowParticles') pushDesktopLyricsState(true);
  if (key === 'wallpaperMode') applyWallpaperModeState(true);
  if (key === 'shelfShowPodcasts' || key === 'shelfMergeCollections') {
    if (shelfManager && shelfManager.rebuild) shelfManager.rebuild(true);
    if (shelfManager && shelfManager.refreshTheme) shelfManager.refreshTheme();
  }
  if (key === 'liveBackgroundKeep') {
    fx.performanceBackground = fx.liveBackgroundKeep ? 'keep' : 'auto';
    updatePerformanceControls();
    saveLyricLayout();
    if (fx.liveBackgroundKeep && backgroundCacheTrimTimer) {
      clearTimeout(backgroundCacheTrimTimer);
      backgroundCacheTrimTimer = 0;
    }
    updateRenderPowerClasses();
    applyRendererPowerMode();
    if (fx.liveBackgroundKeep) recoverVisualsAfterBackground('live-background-keep');
  }
  if (key === 'lyricGlow') showToast(fx.lyricGlow ? '歌词溢光已开启' : '歌词溢光已关闭');
  if (key === 'lyricGlowBeat') showToast(fx.lyricGlowBeat ? '歌词溢光跟随鼓点' : '歌词溢光已脱离鼓点');
  if (key === 'lyricGlowParticles') showToast(fx.lyricGlowParticles ? '歌词光粒已开启' : '歌词光粒已关闭');
  if (key === 'desktopLyrics') showToast(fx.desktopLyrics ? '桌面歌词已开启' : '桌面歌词已关闭');
  if (key === 'desktopLyricsClickThrough') showToast(fx.desktopLyricsClickThrough !== false ? '桌面歌词已锁定' : '桌面歌词可移动');
  if (key === 'desktopLyricsCinema') showToast(fx.desktopLyricsCinema !== false ? '桌面歌词电影震动已开启' : '桌面歌词电影震动已关闭，基础漂浮保留');
  if (key === 'desktopLyricsHighlight') showToast(fx.desktopLyricsHighlight === true ? '桌面歌词高亮跟随已开启' : '桌面歌词高亮跟随已关闭');
  if (key === 'wallpaperMode') showToast(fx.wallpaperMode ? '壁纸模式已开启' : '壁纸模式已关闭');
  if (key === 'shelfShowPodcasts') showToast(fx.shelfShowPodcasts !== false ? '3D歌单架已显示播客歌单' : '3D歌单架已隐藏播客歌单');
  if (key === 'shelfMergeCollections') showToast(fx.shelfMergeCollections === true ? '我的歌单与收藏歌单已合并滚动' : '收藏歌单恢复滚到底切页');
  if (key === 'liveBackgroundKeep') showToast(fx.liveBackgroundKeep ? '直播后台保持已开启' : '直播后台保持已关闭');
  if (key === 'lyricCameraLock') showToast(fx.lyricCameraLock ? '歌词已绑定镜头' : '歌词已恢复自由漂浮');
  if (key === 'bloom') showToast(fx.bloom ? '溢光已开启' : '溢光已关闭');
  if (key === 'edge') showToast(fx.edge ? '已开启轮廓高亮' : '已关闭轮廓高亮');
  if (key === 'cinema') showToast(fx.cinema ? '已开启电影镜头' : '已关闭电影镜头');
  if (key === 'aiDepth') {
    if (fx.aiDepth) {
      aiDepthFailUntil = 0;
      queueAIDepthForCurrentCover(true);
    }
    showToast(fx.aiDepth ? '已开启后台 AI 立体增强' : '已关闭 AI 立体增强, 使用轻量弧面');
  }
}
function toggleFxPanel(force) {
  var el = document.getElementById('fx-panel');
  if (!el) return;
  if (!diyPlayerMode && force !== false) {
    showToast('开启 DIY 玩家模式后可打开视觉控制台');
    return;
  }
  var currentlyOpen = el.classList.contains('show') || el.classList.contains('peek');
  if (peekTimers && peekTimers.fx) { clearTimeout(peekTimers.fx); peekTimers.fx = null; }
  fxPanelPinned = false;
  if (force === false) {
    el.classList.remove('show', 'peek');
    el.classList.toggle('closing', currentlyOpen);
    setTimeout(function(){ el.classList.remove('closing'); }, 280);
    var fab = document.getElementById('fx-fab');
    if (fab) fab.classList.remove('active');
    return;
  }
  if (currentlyOpen && force !== true) {
    el.classList.remove('show', 'peek');
    el.classList.add('closing');
    setTimeout(function(){ el.classList.remove('closing'); }, 280);
    var fabClose = document.getElementById('fx-fab');
    if (fabClose) fabClose.classList.remove('active');
    return;
  }
  el.classList.remove('show', 'closing');
  setPeek(el, true, 'fx');
}
function resetFx() {
  var savedCam = fx.cam;
  var savedShelf = fx.shelf;
  var savedShelfCameraMode = normalizeShelfCameraMode(fx.shelfCameraMode || fxDefaults.shelfCameraMode);
  var savedShelfPresence = normalizeShelfPresence(fx.shelfPresence || fxDefaults.shelfPresence);
  fx = Object.assign({}, fxDefaults, {
    cam: savedCam,
    shelf: savedShelf,
    shelfCameraMode: savedShelfCameraMode,
    shelfPresence: savedShelfPresence,
    shelfAngleY: shelfDefaultAngleForCameraMode(savedShelfCameraMode),
    shelfAngleYManual: false
  });
  applyCoverParticleResolution(fx.coverResolution, { reload: true });
  updateFxInputs();
  applyDesktopLyricsState(true);
  applyWallpaperModeState(true);
  updateRenderPowerClasses();
  applyRendererPowerMode();
  setStageLyricPalette(stageLyrics.coverPalette || stageLyrics.palette);
  setPreset(fx.preset, { silent: true, preserveCamera: true, skipTransition: true });
  if (fx.floatLayer) createFloatLayer(); else destroyFloatLayer();
  if (shelfManager && shelfManager.rebuild) shelfManager.rebuild(true);
  if (shelfManager && shelfManager.refreshTheme) shelfManager.refreshTheme();
  saveLyricLayout();
  showToast('已恢复默认参数');
}

function setShelfMode(m) {
  m = /^(off|side|stage)$/.test(String(m || '')) ? m : fxDefaults.shelf;
  fx.shelf = m;
  document.querySelectorAll('#shelf-seg button').forEach(function(b){ b.classList.toggle('active', b.dataset.shelf === m); });
  if (shelfManager) shelfManager.setMode(m);
  // 舞台模式: 顶部搜索、底部控件让位
  var searchArea = document.getElementById('search-area');
  var bottomBar = document.getElementById('bottom-bar');
  if (searchArea) searchArea.classList.toggle('stage-mode', m === 'stage');
  if (bottomBar) bottomBar.classList.toggle('stage-mode', m === 'stage');
  saveLyricLayout();
}

function updateShelfControlUi() {
  fx.shelfCameraMode = normalizeShelfCameraMode(fx.shelfCameraMode || fxDefaults.shelfCameraMode);
  fx.shelfPresence = normalizeShelfPresence(fx.shelfPresence || fxDefaults.shelfPresence);
  document.querySelectorAll('#shelf-camera-seg [data-shelf-camera]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-shelf-camera') === fx.shelfCameraMode);
  });
  document.querySelectorAll('#shelf-presence-seg [data-shelf-presence]').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-shelf-presence') === fx.shelfPresence);
  });
  var color = shelfAccentHex();
  var picker = document.getElementById('shelf-accent-picker');
  var value = document.getElementById('shelf-accent-value');
  if (picker) picker.value = color;
  if (value) value.textContent = color.toUpperCase();
}
function refreshShelfVisuals(reason) {
  updateShelfControlUi();
  if (shelfManager && shelfManager.refreshTheme) shelfManager.refreshTheme();
  if (shelfManager && shelfManager.rebuild && reason === 'mode') shelfManager.rebuild(true);
}
function setShelfCameraMode(mode) {
  fx.shelfCameraMode = normalizeShelfCameraMode(mode);
  applyShelfCameraDefaultAngle(true);
  setRange('fx-shelfangle', fx.shelfAngleY);
  updateShelfControlUi();
  if (fx.shelfCameraMode === 'static' && orbit && orbit.focus && /^shelf-/.test(String(orbit.focus.type || ''))) {
    setFocusZone(null, true);
  }
  saveLyricLayout();
  showToast(fx.shelfCameraMode === 'static' ? '3D歌单架: 静态镜头' : '3D歌单架: 动态镜头');
}
function setShelfPresence(mode) {
  fx.shelfPresence = normalizeShelfPresence(mode);
  updateShelfControlUi();
  if (shelfManager && shelfManager.setMode) shelfManager.setMode(fx.shelf);
  if (fx.shelfPresence === 'auto' && !shelfPinnedOpen) {
    shelfHoverCue.target = 0;
  }
  saveLyricLayout();
  showToast(fx.shelfPresence === 'always' ? '3D歌单架: 常驻' : '3D歌单架: 自动隐藏');
}
function setShelfAccentColor(color, silent) {
  fx.shelfAccentColor = normalizeHexColor(color || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor);
  refreshShelfVisuals('color');
  saveLyricLayout();
  if (!silent) showToast('歌单架颜色: ' + fx.shelfAccentColor.toUpperCase());
}
function resetShelfAccentColor() {
  setShelfAccentColor(fxDefaults.shelfAccentColor || '#f4d28a');
}

