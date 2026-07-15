//  Resize / 快捷键
// ============================================================
function refreshMainRendererViewport(reason) {
  var viewport = mainRenderViewportSize();
  if (typeof camera !== 'undefined' && camera) {
    camera.aspect = viewport.width / viewport.height;
    camera.updateProjectionMatrix();
  }
  applyRendererPowerMode();
  if (typeof requestStageLyricCameraSnap === 'function' && (desktopRuntimeState.fullscreen || document.fullscreenElement || document.body.classList.contains('minimal-mode'))) {
    requestStageLyricCameraSnap(reason === 'resize' ? 4 : 10);
  }
}
var mainViewportRefreshTimer = 0;
function scheduleMainRendererViewportRefresh(reason) {
  if (mainViewportRefreshTimer) clearTimeout(mainViewportRefreshTimer);
  mainViewportRefreshTimer = setTimeout(function(){
    mainViewportRefreshTimer = 0;
    refreshMainRendererViewport(reason || 'sync');
  }, 180);
}
var mainResizeStopTimer = 0;
var mainResizeFrame = 0;
window.addEventListener('resize', function(){
  if (mainResizeFrame) return;
  mainResizeFrame = requestAnimationFrame(function(){
    mainResizeFrame = 0;
    if (!document.body.classList.contains('window-resizing')) document.body.classList.add('window-resizing');
    if (mainResizeStopTimer) clearTimeout(mainResizeStopTimer);
    mainResizeStopTimer = setTimeout(function(){
      mainResizeStopTimer = 0;
      document.body.classList.remove('window-resizing');
      refreshMainRendererViewport('resize-end');
      window.dispatchEvent(new Event('mineradio-resize-end'));
      if (desktopRuntimeState.fullscreen || desktopFullscreenActive || document.fullscreenElement || document.body.classList.contains('desktop-fullscreen')) layoutFullscreenDiyZone();
    }, 180);
  });
});
document.addEventListener('keydown', function(e){
  if (isTypingTarget(e.target)) return;
  if (handleConfiguredLocalHotkey(e)) return;
  if (shouldSuppressDefaultConfiguredHotkey(e)) return;
  if (e.code === 'Space') {
    if (freeCamera && freeCamera.active) { e.preventDefault(); return; }
    e.preventDefault(); togglePlay();
  }
  else if (e.code === 'Home') { e.preventDefault(); goHome(); }
  else if (e.code === 'ArrowUp') { e.preventDefault(); adjustVolumeByKeyboard(0.05); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); adjustVolumeByKeyboard(-0.05); }
  else if (e.code === 'ArrowRight') nextTrack();
  else if (e.code === 'ArrowLeft')  prevTrack();
  else if (e.code === 'Escape')     {
    if (immersiveMode) {
      e.preventDefault();
      setImmersiveMode(false);
      return;
    }
    if (window.desktopWindow && window.desktopWindow.isDesktop && desktopFullscreenActive && !document.fullscreenElement && window.desktopWindow.exitFullscreenWindowed) {
      e.preventDefault();
      window.desktopWindow.exitFullscreenWindowed();
      return;
    }
    if (document.fullscreenElement) {
      e.preventDefault();
      document.exitFullscreen();
      return;
    }
    var localBeatModal = document.getElementById('local-beat-modal');
    if (localBeatModal && localBeatModal.classList.contains('show')) {
      e.preventDefault();
      if (localBeatAnalysis.active) cancelLocalBeatAnalysis();
      else closeLocalBeatModal();
      return;
    }
    var customLyricModal = document.getElementById('custom-lyric-modal');
    if (customLyricModal && customLyricModal.classList.contains('show')) {
      e.preventDefault();
      closeCustomLyricModal();
      return;
    }
    var trackDetailModal = document.getElementById('track-detail-modal');
    if (trackDetailModal && trackDetailModal.classList.contains('show')) {
      e.preventDefault();
      closeTrackDetailModal();
      return;
    }
    if (miniQueueOpen) { closeMiniQueue(); return; }
    if (shelfManager && shelfManager.hasOpenContent()) { safeShelfCloseContent('escape-key'); return; }
    closeLoginModal(); closeUserModal(); toggleFxPanel(false); togglePlaylistPanel(false);
  }
  else if (e.code === 'KeyL') { if (!immersiveMode) toggleLyricsPanel(); }
  else if (e.code === 'KeyP') {
    if (!immersiveMode && diyPlayerMode) toggleFxPanel();
    else if (!immersiveMode) showToast('开启 DIY 玩家模式后可打开视觉控制台');
  }
  else if (e.code === 'KeyI') toggleImmersiveMode();
  else if (e.code === 'KeyF') toggleFullscreen();
});

// ============================================================
//  UI 半隐藏 v8 — 三个面板的触发/隐藏体验完全统一
//   - 搜索栏 (顶部): y < 80 进入, y > 96 离开
//   - 控制台 (右侧): x > w-48 进入, x < w-380 离开
//   - 歌单 (左侧): x < 48 进入, x > 380 离开
//   - 进入立即显示, 离开延迟 500ms (统一)
// ============================================================
var PEEK_HIDE_DELAY = 170;
var peekTimers = { search:null, fx:null, pl:null };
function isPlaylistPanelOpen(panel) {
  return !!(panel && (panel.classList.contains('peek') || panel.classList.contains('show')));
}
function syncPlaylistPanelCameraFocus(panel, immediate) {
  if (typeof setFocusZone !== 'function') return;
  if (isPlaylistPanelOpen(panel)) {
    setFocusZone('queue', immediate);
    return;
  }
  var shelfDetailOpen = !!(shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent());
  setFocusZone(shelfDetailOpen ? 'shelf-detail' : (shelfPinnedOpen ? 'shelf-side' : null), immediate);
}
function setPeek(el, on, key) {
  if (!el) return;
  if (immersiveMode && on && (key === 'search' || key === 'fx')) return;
  if (on && !diyPlayerMode && key === 'fx') return;
  if (!on && key === 'search' && emptyHomeActive && !immersiveMode) return;
  if (!on && key === 'pl' && playlistPanelPinned) return;
  if (on && key === 'fx') document.body.classList.remove('fullscreen-diy-peek');
  if (on) {
    var wasPeek = el.classList.contains('peek');
    if (peekTimers[key]) { clearTimeout(peekTimers[key]); peekTimers[key] = null; }
    if (key === 'fx') el.classList.remove('closing');
    if (key === 'pl' && !wasPeek && !playQueue.length && queueViewTab === 'queue') switchPlaylistTab('playlists');
    if (key === 'pl' && !wasPeek && playQueue.length && currentIdx >= 0) {
      if (el.dataset && el.dataset.preserveTabOnOpen === '1') delete el.dataset.preserveTabOnOpen;
      else if (queueViewTab !== 'queue') switchPlaylistTab('queue');
      scrollPlaylistPanelToCurrent();
    } else if (key === 'pl' && el.dataset && el.dataset.preserveTabOnOpen === '1') {
      delete el.dataset.preserveTabOnOpen;
    }
    el.classList.add('peek');
    if (key === 'pl') syncPlaylistPanelCameraFocus(el, !wasPeek);
    if (key === 'pl' && !wasPeek) {
      scheduleUiWarmTask(function(){
        flushDeferredQueuePanel('playlist-panel-peek');
        if (queueViewTab === 'queue') animateVisiblePanelList(document.getElementById('queue-list'), '.queue-item', el, '.queue-item.now', { scrollActive: false });
      }, 180);
    }
    if (key === 'fx') {
      var fabOn = document.getElementById('fx-fab');
      if (fabOn) fabOn.classList.add('active');
    }
  } else {
    if (peekTimers[key]) clearTimeout(peekTimers[key]);
    peekTimers[key] = setTimeout(function(){
      el.classList.remove('peek');
      if (key === 'pl') {
        delete el.dataset.buttonOpenSource;
        el.dataset.pointerCloseArmed = '1';
        syncPlaylistPanelCameraFocus(el, true);
      }
      if (key === 'fx') {
        var fabOff = document.getElementById('fx-fab');
        if (fabOff && !el.classList.contains('show')) fabOff.classList.remove('active');
      }
      peekTimers[key] = null;
    }, PEEK_HIDE_DELAY);
  }
}
function uploadTipWasSeen() {
  try { return localStorage.getItem(UPLOAD_TIP_STORE_KEY) === '1'; } catch (e) { return true; }
}
function markUploadTipSeen() {
  try { localStorage.setItem(UPLOAD_TIP_STORE_KEY, '1'); } catch (e) {}
}
function closeUploadTip(manual) {
  var tip = document.getElementById('upload-tip');
  if (uploadTipTimer) { clearTimeout(uploadTipTimer); uploadTipTimer = null; }
  if (manual) markUploadTipSeen();
  if (!tip || !tip.classList.contains('show')) return;
  if (window.gsap) {
    window.gsap.killTweensOf(tip);
    window.gsap.to(tip, {
      autoAlpha: 0,
      y: -8,
      scale: 0.98,
      duration: 0.24,
      ease: 'power2.in',
      overwrite: true,
      onComplete: function(){
        tip.classList.remove('show');
        window.gsap.set(tip, { clearProps: 'opacity,visibility,transform,filter' });
      }
    });
  } else {
    tip.classList.remove('show');
  }
}
function maybeShowUploadTipOnce() {
  if (!diyPlayerMode) return;
  if (uploadTipWasSeen()) return;
  if (immersiveMode) {
    setTimeout(maybeShowUploadTipOnce, 1800);
    return;
  }
  if (document.body.classList.contains('splash-active') || loginGuideAnimating) {
    setTimeout(maybeShowUploadTipOnce, 900);
    return;
  }
  var loginModal = document.getElementById('login-modal');
  var userModal = document.getElementById('user-modal');
  var coverModal = document.getElementById('cover-crop-modal');
  var hasModal = (loginModal && loginModal.classList.contains('show')) ||
    (userModal && userModal.classList.contains('show')) ||
    (coverModal && coverModal.classList.contains('show'));
  if (hasModal) {
    uploadTipAttempts++;
    if (uploadTipAttempts < 18) setTimeout(maybeShowUploadTipOnce, 1800);
    return;
  }
  var area = document.getElementById('search-area');
  var tip = document.getElementById('upload-tip');
  if (!area || !tip) return;
  markUploadTipSeen();
  setPeek(area, true, 'search');
  tip.classList.add('show');
  if (window.gsap) {
    window.gsap.killTweensOf(tip);
    window.gsap.fromTo(tip,
      { autoAlpha: 0, y: -10, scale: 0.975 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.62, ease: 'expo.out', overwrite: true }
    );
    var uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
      window.gsap.fromTo(uploadBtn,
        { scale: 1, boxShadow: '0 10px 32px rgba(0,0,0,.22)' },
        { scale: 1.07, boxShadow: '0 0 0 8px rgba(244,210,138,0),0 16px 46px rgba(244,210,138,.14)', duration: 0.58, ease: 'sine.inOut', yoyo: true, repeat: 3, overwrite: true }
      );
    }
  }
  uploadTipTimer = setTimeout(function(){
    uploadTipTimer = null;
    closeUploadTip(false);
    setPeek(area, false, 'search');
  }, 6800);
}
var secondaryPlaylistEdgeGuard = { enteredAt:0, timer:null, x:0, y:0, H:0 };
var SECONDARY_PLAYLIST_EDGE_MIN_X = 36;
var SECONDARY_PLAYLIST_EDGE_MAX_X = 96;
var SECONDARY_PLAYLIST_EDGE_DWELL_MS = 220;
var SECONDARY_PLAYLIST_SEAM_CLOSE_X = 28;
function isSecondaryLeftDisplaySeamGuardActive() {
  var state = (typeof desktopWindowState !== 'undefined' && desktopWindowState) ? desktopWindowState : {};
  return !!(window.desktopWindow && window.desktopWindow.isDesktop && state.isPrimaryDisplay === false && state.hasDisplayOnLeft);
}
function resetSecondaryPlaylistEdgeGuard() {
  if (secondaryPlaylistEdgeGuard.timer) {
    clearTimeout(secondaryPlaylistEdgeGuard.timer);
    secondaryPlaylistEdgeGuard.timer = null;
  }
  secondaryPlaylistEdgeGuard.enteredAt = 0;
}
function isSecondaryPlaylistSafeBandPoint(ex, ey, H) {
  return ey > 132 && ey < H - 132 && ex >= SECONDARY_PLAYLIST_EDGE_MIN_X && ex < SECONDARY_PLAYLIST_EDGE_MAX_X;
}
function armSecondaryPlaylistEdgeDwell() {
  if (secondaryPlaylistEdgeGuard.timer) return;
  secondaryPlaylistEdgeGuard.timer = setTimeout(function(){
    secondaryPlaylistEdgeGuard.timer = null;
    if (!isSecondaryLeftDisplaySeamGuardActive()) return;
    if (!isSecondaryPlaylistSafeBandPoint(secondaryPlaylistEdgeGuard.x, secondaryPlaylistEdgeGuard.y, secondaryPlaylistEdgeGuard.H)) return;
    var panel = document.getElementById('playlist-panel');
    if (panel) setPeek(panel, true, 'pl');
  }, SECONDARY_PLAYLIST_EDGE_DWELL_MS);
}
function isPlaylistEdgeTrigger(ex, ey, H) {
  var inVerticalBand = ey > 132 && ey < H - 132;
  if (!inVerticalBand) {
    resetSecondaryPlaylistEdgeGuard();
    return false;
  }
  if (!isSecondaryLeftDisplaySeamGuardActive()) {
    return ex >= 14 && ex < 78;
  }
  var inSafeBand = isSecondaryPlaylistSafeBandPoint(ex, ey, H);
  if (!inSafeBand) {
    resetSecondaryPlaylistEdgeGuard();
    return false;
  }
  secondaryPlaylistEdgeGuard.x = ex;
  secondaryPlaylistEdgeGuard.y = ey;
  secondaryPlaylistEdgeGuard.H = H;
  var now = performance.now();
  if (!secondaryPlaylistEdgeGuard.enteredAt) secondaryPlaylistEdgeGuard.enteredAt = now;
  armSecondaryPlaylistEdgeDwell();
  return now - secondaryPlaylistEdgeGuard.enteredAt >= SECONDARY_PLAYLIST_EDGE_DWELL_MS;
}
function playlistPanelExitPadding() {
  return isSecondaryLeftDisplaySeamGuardActive() ? 34 : 72;
}
function playlistPanelFocusPadding() {
  return isSecondaryLeftDisplaySeamGuardActive() ? 28 : 52;
}
function shouldClosePlaylistPanelFromPointer(ppOn, ex, ppRect) {
  if (!ppOn) return false;
  var panel = document.getElementById('playlist-panel');
  if (panel && panel.dataset.pointerCloseArmed === '0') return false;
  if (isSecondaryLeftDisplaySeamGuardActive() && ex < SECONDARY_PLAYLIST_SEAM_CLOSE_X) return true;
  return ex > ppRect.right + playlistPanelExitPadding();
}
function isPlaylistPanelFocusActive(pp) {
  return isPlaylistPanelOpen(pp);
}
window.addEventListener('mousemove', function(e){
  var sa = document.getElementById('search-area');
  var fp = document.getElementById('fx-panel');
  var pp = document.getElementById('playlist-panel');
  var ex = e.clientX, ey = e.clientY, W = innerWidth, H = innerHeight;
  updateUserCapsuleAutoHideFromPointer(ex, ey);
  updateFxFabAutoHideFromPointer(ex, ey);
  updateFullscreenDiyPeekFromPointer(ex, ey);
  if (document.body.classList.contains('splash-active')) {
    updateShelfHoverCueFromPointer(null);
    updateShelfCardHoverSelection(null);
    setFocusZone(null);
    return;
  }
  if (immersiveMode) {
    updateShelfHoverCueFromPointer(e);
    updateShelfCardHoverSelection(e);
    updateControlsAutoHideFromPointer(ex, ey);
    var ppOnImm = pp.classList.contains('peek');
    var ppRectImm = pp.getBoundingClientRect();
    var inQueueTriggerImm = isPlaylistEdgeTrigger(ex, ey, H);
    var inQueuePanelImm = ppOnImm && ex >= ppRectImm.left - 18 && ex <= ppRectImm.right + 24 && ey >= ppRectImm.top - 22 && ey <= ppRectImm.bottom + 22;
    if (inQueuePanelImm && pp.dataset.pointerCloseArmed === '0') pp.dataset.pointerCloseArmed = '1';
    if (inQueueTriggerImm || inQueuePanelImm) setPeek(pp, true, 'pl');
    else if (shouldClosePlaylistPanelFromPointer(ppOnImm, ex, ppRectImm)) setPeek(pp, false, 'pl');
    var shelfCanFocusImm = !!(shelfManager && shelfManager.canInteract && shelfManager.canInteract());
    var newFocusImm = null;
    var queueFocusImm = isPlaylistPanelFocusActive(pp);
    var shelfHoverFocusImm = !!(shelfCanFocusImm && isSideShelfFocusHit(e));
    if (queueFocusImm) newFocusImm = 'queue';
    else if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) newFocusImm = 'shelf-detail';
    else if (shelfHoverFocusImm) newFocusImm = 'shelf-side';
    else if (shelfCanFocusImm && shelfManager.getMode() === 'stage' && ey > H * 0.55) newFocusImm = 'shelf-stage';
    setFocusZone(newFocusImm, newFocusImm === 'queue');
    return;
  }
  updateShelfHoverCueFromPointer(e);
  updateShelfCardHoverSelection(e);
  // 搜索 (上): 顶部 48px 内进入; 已显示时鼠标在 280px 内保留
  var saOn = sa.classList.contains('peek');
  var saRect = sa.getBoundingClientRect();
  var searchFocused = document.activeElement === $input;
  var uploadTip = document.getElementById('upload-tip');
  var uploadTipOpen = !!(uploadTip && uploadTip.classList.contains('show'));
  var inSearchPanel = saOn && ex >= saRect.left - 24 && ex <= saRect.right + 24 && ey >= saRect.top - 22 && ey <= saRect.bottom + 42;
  if (ey < 66 || inSearchPanel || searchFocused || uploadTipOpen) setPeek(sa, true, 'search');
  else if (saOn && !emptyHomeActive) setPeek(sa, false, 'search');
  // 控制台: 右下角触发；一旦面板出现，就按真实面板矩形保留显示
  // 歌单/队列 DOM 面板只在左侧明确停留时出现，避免和右侧 3D 架抢焦点
  var ppOn = pp.classList.contains('peek');
  var ppRect = pp.getBoundingClientRect();
  var inQueueTrigger = isPlaylistEdgeTrigger(ex, ey, H);
  var inQueuePanel = ppOn && ex >= ppRect.left - 18 && ex <= ppRect.right + 24 && ey >= ppRect.top - 22 && ey <= ppRect.bottom + 22;
  if (inQueuePanel && pp.dataset.pointerCloseArmed === '0') pp.dataset.pointerCloseArmed = '1';
  if (inQueueTrigger || inQueuePanel) setPeek(pp, true, 'pl');
  else if (shouldClosePlaylistPanelFromPointer(ppOn, ex, ppRect)) setPeek(pp, false, 'pl');

  // v8: 镜头跟拍触发判断
  //   - 队列面板 peek 时 → queue focus
  //   - 3D shelf side 模式只在点击展开后 → shelf-side
  //   - 3D shelf stage 模式 + 鼠标在下 35% → shelf-stage
  var shelfCanFocus = !!(shelfManager && shelfManager.canInteract && shelfManager.canInteract());
  if (!shelfCanFocus && !(shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent())) {
    shelfPinnedOpen = false;
  }

  var newFocus = null;
  var queueFocusActive = isPlaylistPanelFocusActive(pp);
  var shelfHoverFocus = !!(shelfCanFocus && isSideShelfFocusHit(e));
  if (queueFocusActive) {
    newFocus = 'queue';
  } else if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) {
    newFocus = 'shelf-detail';
  } else if (shelfHoverFocus) {
    newFocus = 'shelf-side';
  } else if (shelfCanFocus && shelfManager.getMode() === 'stage' && ey > H * 0.55) {
    newFocus = 'shelf-stage';
  }
  setFocusZone(newFocus, newFocus === 'queue');
});

// ============================================================
