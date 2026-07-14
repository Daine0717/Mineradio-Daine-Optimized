var desktopRuntimeState = {
  desktop: !!window.desktopWindow,
  minimized: false,
  visible: true,
  focused: true,
  fullscreen: false
};
var renderPowerState = { mode: '', width: 0, height: 0, pixelRatio: 0 };
var backgroundCacheTrimTimer = 0;
var runtimePerfState = {
  lastCacheTrimAt: 0,
  cacheTrimCount: 0,
  lastCacheTrimReason: '',
  lastHeapSampleAt: 0,
  heapMB: 0,
  cacheCounts: {}
};
function isDeepBackgroundMode() {
  if (isLiveBackgroundKeepMode()) return false;
  return !!(document.hidden || desktopRuntimeState.minimized || desktopRuntimeState.visible === false);
}
function currentPerformanceBackgroundMode() {
  return normalizePerformanceBackgroundMode(fx && fx.performanceBackground, fx && fx.liveBackgroundKeep === true);
}
function isLiveBackgroundKeepMode() {
  return currentPerformanceBackgroundMode() === 'keep';
}
function isBackgroundReleaseMode() {
  return currentPerformanceBackgroundMode() === 'release';
}
function isHiddenForBackgroundOptimization() {
  return !!(document.hidden && !isLiveBackgroundKeepMode());
}
function isVisibleBackgroundMode() {
  return false;
}
function updateRenderPowerClasses() {
  document.body.classList.toggle('render-deep-sleep', isDeepBackgroundMode());
  document.body.classList.toggle('render-background-eco', isVisibleBackgroundMode());
}
function safeObjectKeys(obj) {
  try { return obj ? Object.keys(obj) : []; } catch (e) { return []; }
}
function markProtectedKey(map, key) {
  if (key) map[String(key)] = true;
}
function collectProtectedCoverUrls() {
  var keep = Object.create(null);
  function mark(url) { if (url) keep[String(url)] = true; }
  try {
    var song = (typeof currentCoverSong === 'function') ? currentCoverSong() : (playQueue && currentIdx >= 0 ? playQueue[currentIdx] : null);
    if (song) {
      mark(song.cover);
      if (typeof songCoverSrc === 'function') {
        mark(songCoverSrc(song, 60));
        mark(songCoverSrc(song, 360));
        mark(songCoverSrc(song, 400));
      }
    }
    if (typeof currentCoverSource !== 'undefined' && currentCoverSource && currentCoverSource.src) mark(currentCoverSource.src);
    if (typeof playlistPanelDetailState !== 'undefined' && playlistPanelDetailState && playlistPanelDetailState.playlist) {
      var cover = playlistPanelDetailState.playlist.cover;
      mark(cover);
      if (typeof coverUrlWithSize === 'function') {
        mark(coverUrlWithSize(cover, 88));
        mark(coverUrlWithSize(cover, 96));
      }
    }
    if (shelfManager && shelfManager.getCards) {
      shelfManager.getCards().forEach(function(card){
        if (card && card.item) mark(card.item.cover);
      });
    }
  } catch (e) {}
  return keep;
}
function collectProtectedBeatMapKeys() {
  var keep = Object.create(null);
  try {
    if (typeof beatMapSongKey === 'function' && playQueue && playQueue.length) {
      var start = Math.max(0, currentIdx - 5);
      var end = Math.min(playQueue.length - 1, currentIdx + 5);
      for (var i = start; i <= end; i++) markProtectedKey(keep, beatMapSongKey(playQueue[i]));
    }
    if (typeof beatPrefetchLastKey !== 'undefined') markProtectedKey(keep, beatPrefetchLastKey);
    if (typeof djMode !== 'undefined' && djMode && djMode.songKey) markProtectedKey(keep, djMode.songKey);
    if (typeof localBeatAnalysis !== 'undefined' && localBeatAnalysis && localBeatAnalysis.song && typeof beatMapSongKey === 'function') {
      markProtectedKey(keep, beatMapSongKey(localBeatAnalysis.song));
    }
  } catch (e) {}
  return keep;
}
function collectProtectedCoverDepthIds() {
  var keep = Object.create(null);
  try {
    if (typeof coverDepthCacheId !== 'function') return keep;
    var candidates = [];
    if (typeof currentCoverSource !== 'undefined' && currentCoverSource && currentCoverSource.src) candidates.push(currentCoverSource.src);
    var song = (typeof currentCoverSong === 'function') ? currentCoverSong() : null;
    if (song && typeof songCoverSrc === 'function') {
      candidates.push(songCoverSrc(song, 360));
      candidates.push(songCoverSrc(song, 400));
    }
    var texImg = (typeof coverTex !== 'undefined' && coverTex && coverTex.image) ? coverTex.image : null;
    var w = texImg && texImg.width ? texImg.width : 0;
    var h = texImg && texImg.height ? texImg.height : 0;
    candidates.forEach(function(src){
      if (src) markProtectedKey(keep, coverDepthCacheId(src + '|tex=' + w + 'x' + h));
    });
  } catch (e) {}
  return keep;
}
function trimObjectCache(cache, keep, protectedKeys, skipRecord) {
  var keys = safeObjectKeys(cache);
  if (!cache || keys.length <= keep) return 0;
  var drop = keys.length - keep;
  var dropped = 0;
  for (var i = 0; i < keys.length && drop > 0; i++) {
    var key = keys[i];
    if (protectedKeys && protectedKeys[key]) continue;
    var rec = cache[key];
    if (skipRecord && skipRecord(rec, key)) continue;
    delete cache[key];
    drop--;
    dropped++;
  }
  return dropped;
}
function trimCoverDepthCache(keep, protectedKeys) {
  if (!coverDepthCache || !coverDepthCacheKeys) return 0;
  var keys = coverDepthCacheKeys.filter(function(key){ return !!coverDepthCache[key]; });
  if (keys.length <= keep) {
    coverDepthCacheKeys = keys;
    return 0;
  }
  var keepSet = Object.create(null);
  var count = 0;
  for (var i = keys.length - 1; i >= 0 && count < keep; i--) {
    keepSet[keys[i]] = true;
    count++;
  }
  Object.keys(protectedKeys || {}).forEach(function(key){ keepSet[key] = true; });
  var dropped = 0;
  keys.forEach(function(key){
    if (keepSet[key]) return;
    delete coverDepthCache[key];
    dropped++;
  });
  coverDepthCacheKeys = keys.filter(function(key){ return !!coverDepthCache[key]; });
  return dropped;
}
function collectRuntimePerfSnapshot(now) {
  now = now || performance.now();
  runtimePerfState.cacheCounts = {
    playlistCovers: safeObjectKeys(playlistCoverCache).length,
    coverDepth: coverDepthCacheKeys ? coverDepthCacheKeys.length : 0,
    beatMaps: safeObjectKeys(beatMapCache).length,
    djBeatMaps: safeObjectKeys(djBeatMapCache).length
  };
  if (performance && performance.memory && now - runtimePerfState.lastHeapSampleAt > 12000) {
    runtimePerfState.lastHeapSampleAt = now;
    runtimePerfState.heapMB = Math.round((performance.memory.usedJSHeapSize || 0) / 1048576);
  }
  return {
    render: (typeof renderPerfState !== 'undefined') ? {
      mode: renderPerfState.mode,
      fps: renderPerfState.fps,
      skipped: renderPerfState.skipped,
      longFrames: renderPerfState.longFrames
    } : null,
    runtime: runtimePerfState,
    renderer: (typeof renderer !== 'undefined' && renderer && renderer.info) ? {
      geometries: renderer.info.memory && renderer.info.memory.geometries,
      textures: renderer.info.memory && renderer.info.memory.textures,
      calls: renderer.info.render && renderer.info.render.calls,
      triangles: renderer.info.render && renderer.info.render.triangles
    } : null,
    viewport: (typeof renderer !== 'undefined' && renderer && renderer.domElement) ? {
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      renderPixelRatio: renderer.getPixelRatio ? Number(renderer.getPixelRatio().toFixed(3)) : 0,
      canvasWidth: renderer.domElement.width || 0,
      canvasHeight: renderer.domElement.height || 0,
      renderPixels: (renderer.domElement.width || 0) * (renderer.domElement.height || 0),
      targetFps: (typeof getAdaptiveRenderFps === 'function') ? getAdaptiveRenderFps() : 0,
      interactionBoost: (typeof isRenderInteractionActive === 'function') ? isRenderInteractionActive() : false,
      interactionReason: (typeof renderInteractionReason !== 'undefined') ? renderInteractionReason : ''
    } : null,
    deepSleep: isDeepBackgroundMode()
  };
}
window.__mineradioPerfSnapshot = collectRuntimePerfSnapshot;
function trimRuntimeCaches(reason, aggressive) {
  var protectedCovers = collectProtectedCoverUrls();
  var protectedBeats = collectProtectedBeatMapKeys();
  var dropped = 0;
  dropped += trimObjectCache(playlistCoverCache, aggressive ? 72 : 180, protectedCovers, function(rec){
    return rec && rec.loading;
  });
  dropped += trimCoverDepthCache(aggressive ? 4 : 10, collectProtectedCoverDepthIds());
  dropped += trimObjectCache(beatMapCache, aggressive ? 12 : 36, protectedBeats);
  dropped += trimObjectCache(djBeatMapCache, aggressive ? 4 : 12, protectedBeats);
  if (aggressive && typeof renderer !== 'undefined' && renderer && renderer.renderLists && renderer.renderLists.dispose) {
    try { renderer.renderLists.dispose(); } catch (e) {}
  }
  runtimePerfState.lastCacheTrimAt = performance.now();
  runtimePerfState.cacheTrimCount += 1;
  runtimePerfState.lastCacheTrimReason = reason || (aggressive ? 'deep' : 'active');
  collectRuntimePerfSnapshot(runtimePerfState.lastCacheTrimAt);
  return dropped;
}
function trimVisualCachesForBackground() {
  if (!isDeepBackgroundMode()) return;
  trimRuntimeCaches('deep-background', true);
}
function scheduleBackgroundCacheTrim() {
  if (!isDeepBackgroundMode()) return;
  if (backgroundCacheTrimTimer) clearTimeout(backgroundCacheTrimTimer);
  backgroundCacheTrimTimer = setTimeout(function(){
    backgroundCacheTrimTimer = 0;
    trimVisualCachesForBackground();
  }, 900);
}
function maybeTrimRuntimeCaches(now) {
  now = now || performance.now();
  var deep = isDeepBackgroundMode();
  var gap = deep ? (isBackgroundReleaseMode() ? 3600 : 7000) : 45000;
  if (!deep && now < 30000) return;
  if (now - runtimePerfState.lastCacheTrimAt < gap) return;
  trimRuntimeCaches(deep ? (isBackgroundReleaseMode() ? 'release-frame' : 'deep-frame') : 'active-frame', deep);
}
function mainRenderViewportSize() {
  var width = Math.max(1, innerWidth);
  return {
    width: width,
    height: document.body.classList.contains('minimal-mode') ? Math.round(width * 9 / 16) : Math.max(1, innerHeight)
  };
}
function applyRendererPowerMode() {
  if (typeof renderer === 'undefined' || !renderer) return;
  var deep = isDeepBackgroundMode();
  var viewport = mainRenderViewportSize();
  var width = deep ? 4 : viewport.width;
  var height = deep ? 4 : viewport.height;
  var pixelRatio = getRenderPixelRatio();
  var mode = deep ? 'sleep' : 'active';
  if (renderPowerState.mode === mode && renderPowerState.width === width && renderPowerState.height === height && Math.abs(renderPowerState.pixelRatio - pixelRatio) < 0.001) return;
  renderPowerState = { mode: mode, width: width, height: height, pixelRatio: pixelRatio };
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  if (typeof uniforms !== 'undefined' && uniforms && uniforms.uPixel) uniforms.uPixel.value = renderer.getPixelRatio();
  if (deep) {
    if (renderer.renderLists && renderer.renderLists.dispose) renderer.renderLists.dispose();
    scheduleBackgroundCacheTrim();
  }
}
function updateDesktopRuntimeState(state) {
  state = state || {};
  var wasFullscreen = desktopRuntimeState.fullscreen;
  var wasDeep = isDeepBackgroundMode();
  desktopRuntimeState.desktop = !!window.desktopWindow;
  desktopRuntimeState.minimized = !!state.isMinimized;
  desktopRuntimeState.visible = state.isVisible !== false;
  desktopRuntimeState.focused = state.isFocused !== false;
  desktopRuntimeState.fullscreen = !!(state.isFullScreen || state.isNativeFullScreen || state.isHtmlFullScreen || state.isWindowFullScreen);
  updateRenderPowerClasses();
  applyRendererPowerMode();
  if (fx && (fx.desktopLyrics || fx.wallpaperMode)) setTimeout(syncDesktopOverlayState, 0);
  if (wasDeep && !isDeepBackgroundMode()) recoverVisualsAfterBackground('desktop-runtime-state');
  if (desktopRuntimeState.fullscreen !== wasFullscreen) scheduleMainRendererViewportRefresh('desktop-runtime-state');
}
function installRenderPowerHooks() {
  updateRenderPowerClasses();
  document.addEventListener('visibilitychange', function(){
    updateRenderPowerClasses();
    applyRendererPowerMode();
    if (!isDeepBackgroundMode()) recoverVisualsAfterBackground('visibilitychange');
  });
  window.addEventListener('focus', function(){
    desktopRuntimeState.focused = true;
    updateRenderPowerClasses();
    applyRendererPowerMode();
    if (!isDeepBackgroundMode()) recoverVisualsAfterBackground('focus');
  });
  window.addEventListener('blur', function(){
    desktopRuntimeState.focused = false;
    updateRenderPowerClasses();
    applyRendererPowerMode();
  });
  if (window.desktopWindow && typeof window.desktopWindow.onStateChange === 'function') {
    window.desktopWindow.onStateChange(updateDesktopRuntimeState);
    if (typeof window.desktopWindow.getState === 'function') {
      window.desktopWindow.getState().then(updateDesktopRuntimeState).catch(function(){});
    }
  }
}
