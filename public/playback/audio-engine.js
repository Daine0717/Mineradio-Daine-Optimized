// Audio engine runtime: playback, queue, quality and volume controls.

function initAudio() {
  if (audioReady) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  source = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  beatAnalyser = audioCtx.createAnalyser();
  gainNode = audioCtx.createGain();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.58;
  beatAnalyser.fftSize = BEAT_FFT_SIZE;
  beatAnalyser.smoothingTimeConstant = 0.10;
  source.connect(analyser);
  source.connect(beatAnalyser);
  analyser.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  applyVolumeToAudio();
  frequencyData.fill(0);
  beatFrequencyData.fill(0);
  beatTimeDomainData.fill(128);
  resetRealtimeBeatEngine();
  audioReady = true;
}
function resumeAudioAnalysis() {
  if (audioCtx && audioCtx.state === 'suspended') return audioCtx.resume().catch(function(e){ console.warn('audio context resume failed:', e); });
  return Promise.resolve();
}

function updatePlaybackQualityUi() {
  var label = document.getElementById('quality-btn-label');
  var btn = document.getElementById('quality-btn');
  var provider = currentPlaybackQualityProvider();
  var canUseSvip = provider === 'kugou' ? true : hasProviderSvip('netease', loginStatus);
  var displayQuality = playbackQuality === 'jymaster' && !canUseSvip ? 'hires' : playbackQuality;
  updateQualityOptionText(provider);
  if (label) label.textContent = playbackQualityShortLabelForProvider(displayQuality, provider);
  if (btn) btn.title = playbackQuality === 'jymaster' && !canUseSvip
    ? '音质: ' + playbackQualityLabel(displayQuality) + ' · 超清母带需网易云 SVIP'
    : '音质: ' + playbackQualityLabelForProvider(displayQuality, provider);
  document.querySelectorAll('.quality-option').forEach(function(option){
    var q = normalizePlaybackQuality(option.dataset.quality);
    var locked = provider !== 'kugou' && option.dataset.svip === '1' && !canUseSvip;
    option.classList.toggle('active', q === displayQuality);
    option.classList.toggle('locked', locked);
    option.disabled = locked;
    option.title = locked ? '需要网易云 SVIP 账号' : playbackQualityLabelForProvider(q, provider);
  });
}
function setPlaybackQuality(value) {
  var next = normalizePlaybackQuality(value);
  var provider = currentPlaybackQualityProvider();
  if (provider !== 'kugou' && next === 'jymaster' && !hasProviderSvip('netease', loginStatus)) {
    showToast(hasPlatformLogin('netease') ? '超清母带需要网易云 SVIP' : '登录网易云 SVIP 后可用超清母带');
    if (!hasPlatformLogin('netease')) openProviderLogin('netease');
    return;
  }
  playbackQuality = next;
  savePlaybackQualityPreference();
  updatePlaybackQualityUi();
  var wrap = document.getElementById('quality-control');
  if (wrap) wrap.classList.remove('open');
  applyPlaybackQualityToCurrentTrack(next);
}
function canReloadCurrentTrackForQuality() {
  if (currentIdx < 0 || currentIdx >= playQueue.length) return false;
  if (!audio || !audio.src || audio.paused || audio.ended) return false;
  var song = playQueue[currentIdx];
  if (!song || song.type === 'local' || song.source === 'local') return false;
  return songProviderKey(song) === 'netease' || songProviderKey(song) === 'qq' || songProviderKey(song) === 'kugou';
}
function applyPlaybackQualityToCurrentTrack(nextQuality) {
  var provider = currentPlaybackQualityProvider();
  var label = playbackQualityLabelForProvider(nextQuality || playbackQuality, provider);
  if (!canReloadCurrentTrackForQuality()) {
    showToast('音质偏好: ' + label + ' · 下次播放生效');
    return;
  }
  var resumeAt = audio && isFinite(audio.currentTime) ? audio.currentTime : 0;
  showToast('正在切换音质: ' + label);
  Promise.resolve(playQueueAt(currentIdx, {
    qualityOverride: nextQuality || playbackQuality,
    qualitySwitch: true,
    resumeAt: resumeAt,
    preserveHomeState: true,
  })).catch(function(e){
    console.warn('[QualitySwitch]', e);
    showToast('音质切换失败，已保留偏好');
  }).finally(forcePlaybackControlsInteractive);
}
function toggleQualityPanel(e) {
  if (e) e.stopPropagation();
  var wrap = document.getElementById('quality-control');
  if (wrap) wrap.classList.toggle('open');
}
function bindQualityControl() {
  var wrap = document.getElementById('quality-control');
  if (wrap) {
    wrap.addEventListener('mouseenter', function(){ wrap.classList.add('open'); });
    wrap.addEventListener('mouseleave', function(){ setTimeout(function(){ if (!wrap.matches(':hover')) wrap.classList.remove('open'); }, 260); });
  }
  document.addEventListener('click', function(e){
    if (wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
  });
  updatePlaybackQualityUi();
}

function clearAudioFadeTimers() {
  if (audioFadeTimer) {
    clearTimeout(audioFadeTimer);
    audioFadeTimer = null;
  }
  if (audioElementFadeFrame) {
    cancelAnimationFrame(audioElementFadeFrame);
    audioElementFadeFrame = 0;
  }
}
function currentAudioOutputGain() {
  if (gainNode && gainNode.gain && isFinite(gainNode.gain.value)) return clampRange(Number(gainNode.gain.value), 0, 1);
  if (audio && isFinite(audio.volume)) return clampRange(Number(audio.volume), 0, 1);
  return clampRange(targetVolume, 0, 1);
}
function audioSilentFloor() {
  return targetVolume > 0.001 ? AUDIO_SILENCE_GAIN : 0;
}
function normalizeAudioFadeTarget(value) {
  value = clampRange(Number(value) || 0, 0, 1);
  return value <= 0.001 ? audioSilentFloor() : value;
}
function holdAudioOutputGain(now) {
  var current = currentAudioOutputGain();
  if (!gainNode || !audioCtx || !gainNode.gain) return current;
  var param = gainNode.gain;
  try {
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(now);
      return currentAudioOutputGain();
    }
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
  } catch (e) {
    try {
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    } catch (_) {}
  }
  return current;
}
function setAudioOutputGainImmediate(value) {
  value = normalizeAudioFadeTarget(value);
  clearAudioFadeTimers();
  if (gainNode && audioCtx) {
    var now = audioCtx.currentTime || 0;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(value, now);
  } else if (audio) {
    audio.volume = value;
  }
}
function rampAudioOutputGain(value, durationMs) {
  value = normalizeAudioFadeTarget(value);
  durationMs = Math.max(0, Number(durationMs) || 0);
  clearAudioFadeTimers();
  var serial = audioFadeSerial;
  if (gainNode && audioCtx) {
    var now = audioCtx.currentTime || 0;
    holdAudioOutputGain(now);
    if (durationMs <= 0) {
      gainNode.gain.setValueAtTime(value, now);
      return;
    }
    gainNode.gain.linearRampToValueAtTime(value, now + durationMs / 1000);
    return;
  }
  if (!audio) return;
  var from = currentAudioOutputGain();
  var started = performance.now();
  function tickAudioFade(nowMs) {
    if (serial !== audioFadeSerial || !audio) return;
    var t = durationMs ? clampRange((nowMs - started) / durationMs, 0, 1) : 1;
    var eased = 1 - Math.pow(1 - t, 3);
    audio.volume = from + (value - from) * eased;
    if (t < 1) audioElementFadeFrame = requestAnimationFrame(tickAudioFade);
    else audioElementFadeFrame = 0;
  }
  audioElementFadeFrame = requestAnimationFrame(tickAudioFade);
}
function preparePlaybackFadeIn() {
  audioFadeSerial++;
  setAudioOutputGainImmediate(0);
}
function startPlaybackFadeIn() {
  audioFadeSerial++;
  if (targetVolume <= 0.001) {
    setAudioOutputGainImmediate(0);
    return;
  }
  rampAudioOutputGain(targetVolume, AUDIO_FADE_IN_MS);
}
function restorePlaybackGain() {
  audioFadeSerial++;
  setAudioOutputGainImmediate(targetVolume);
}
function fadeOutAndPauseAudio() {
  if (!audio || audio.paused) return Promise.resolve(false);
  var serial = ++audioFadeSerial;
  rampAudioOutputGain(0, AUDIO_FADE_OUT_MS);
  return new Promise(function(resolve) {
    audioFadeTimer = setTimeout(function(){
      audioFadeTimer = null;
      if (serial !== audioFadeSerial || !audio) {
        resolve(false);
        return;
      }
      try { audio.pause(); } catch (pauseErr) { console.warn('[TogglePlayPause]', pauseErr); }
      setAudioOutputGainImmediate(0);
      resolve(true);
    }, AUDIO_FADE_OUT_MS + 80);
  });
}

function applyVolumeToAudio() {
  if (audio) {
    audio.muted = false;
    audio.volume = gainNode ? 1 : targetVolume;
  }
  if (gainNode && audioCtx) {
    var now = audioCtx.currentTime || 0;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setTargetAtTime(targetVolume, now, 0.025);
  }
}

function updateVolumeUi() {
  var slider = document.getElementById('volume-slider');
  var value = document.getElementById('volume-value');
  var icon = document.getElementById('volume-icon');
  var wrap = document.getElementById('volume-control');
  var pct = Math.round(targetVolume * 100);
  if (slider && Math.abs(parseFloat(slider.value) - targetVolume) > 0.001) slider.value = targetVolume;
  if (value) value.textContent = pct + '%';
  if (wrap) wrap.classList.toggle('muted', targetVolume <= 0.01);
  if (icon) {
    icon.innerHTML = targetVolume <= 0.01
      ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="17" y1="9" x2="22" y2="14"/><line x1="22" y1="9" x2="17" y2="14"/>'
      : targetVolume < 0.45
        ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 10.5a2 2 0 0 1 0 3"/>'
        : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 9.5a4 4 0 0 1 0 5"/><path d="M18 7a7 7 0 0 1 0 10"/>';
  }
}

function setVolume(value, silent) {
  var next = Math.max(0, Math.min(1, Number(value) || 0));
  targetVolume = next;
  if (next > 0.01) lastNonZeroVolume = next;
  try { localStorage.setItem('apex-player-volume', String(next)); } catch (e) {}
  applyVolumeToAudio();
  updateVolumeUi();
  if (!silent) showToast('音量 ' + Math.round(next * 100) + '%');
}
function adjustVolumeByKeyboard(delta) {
  var step = Number(delta) || 0;
  if (!step) return;
  setVolume(clampRange(targetVolume + step, 0, 1), false);
}

function toggleVolumePanel(e) {
  if (e) e.stopPropagation();
  var wrap = document.getElementById('volume-control');
  if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
  if (wrap) wrap.classList.toggle('open');
}

function toggleMute() {
  setVolume(targetVolume > 0.01 ? 0 : (lastNonZeroVolume || 0.8));
}

function bindVolumeControls() {
  var slider = document.getElementById('volume-slider');
  var btn = document.getElementById('volume-btn');
  var wrap = document.getElementById('volume-control');
  function keepVolumePanelOpen() {
    if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
    if (wrap) wrap.classList.add('open');
  }
  function closeVolumePanelSoon() {
    if (volumeCloseTimer) clearTimeout(volumeCloseTimer);
    volumeCloseTimer = setTimeout(function(){
      volumeCloseTimer = null;
      if (wrap) wrap.classList.remove('open');
    }, 520);
  }
  if (wrap) {
    wrap.addEventListener('mouseenter', keepVolumePanelOpen);
    wrap.addEventListener('mouseleave', closeVolumePanelSoon);
  }
  if (slider) {
    slider.addEventListener('input', function(){ setVolume(slider.value, true); });
    slider.addEventListener('focus', keepVolumePanelOpen);
    slider.addEventListener('blur', closeVolumePanelSoon);
    slider.addEventListener('change', function(){ showToast('音量 ' + Math.round(targetVolume * 100) + '%'); });
  }
  if (btn) {
    btn.addEventListener('dblclick', function(e){ e.stopPropagation(); toggleMute(); });
  }
  document.addEventListener('click', function(e){
    if (!wrap) return;
    if (!wrap.contains(e.target)) {
      if (volumeCloseTimer) { clearTimeout(volumeCloseTimer); volumeCloseTimer = null; }
      wrap.classList.remove('open');
    }
  });
  updateVolumeUi();
  applyVolumeToAudio();
}

function queueItemKey(song) {
  if (!song) return '';
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return 'qq:' + (song.mid || song.songmid || song.id || (song.name + '|' + song.artist));
  if (song.type === 'podcast' && song.programId) return 'podcast:' + song.programId;
  if (song.localKey) return 'local:' + song.localKey;
  if (song.id != null && song.id !== '') return 'song:' + song.id;
  return String(song.name || '') + '|' + String(song.artist || '');
}
function queueSong(song, opts) {
  opts = opts || {};
  if (!song) return -1;
  var cloned = cloneSong(song);
  var insertAt = playQueue.length;
  if (opts.position === 'next') {
    var key = queueItemKey(cloned);
    var existing = -1;
    if (key) {
      for (var i = 0; i < playQueue.length; i++) {
        if (queueItemKey(playQueue[i]) === key) { existing = i; break; }
      }
    }
    if (existing === currentIdx) return currentIdx;
    if (existing >= 0) {
      cloned = playQueue.splice(existing, 1)[0];
      if (currentIdx >= 0 && existing < currentIdx) currentIdx -= 1;
    }
    var hasCurrent = currentIdx >= 0 && currentIdx < playQueue.length;
    insertAt = hasCurrent ? Math.min(playQueue.length, currentIdx + 1) : playQueue.length;
    playQueue.splice(insertAt, 0, cloned);
  } else {
    playQueue.push(cloned);
    insertAt = playQueue.length - 1;
  }
  safeRenderQueuePanel('queue-song');
  safeShelfRebuild('queue-song');
  return insertAt;
}
function queueSongNext(song) {
  return queueSong(song, { position: 'next' });
}
function queueSearchResult(i) {
  var song = playlist[i]; if (!song) return;
  queueSongNext(song);
  showToast('已设为下一首: ' + song.name);
}
function queueDetailSongNext(song) {
  if (!song || song.type === 'podcast-radio') return;
  queueSongNext(song);
  showToast('已设为下一首: ' + (song.name || ''));
}
function queueIndexNext(i) {
  i = Number(i);
  if (!isFinite(i) || i < 0 || i >= playQueue.length) return;
  var song = playQueue[i];
  queueSongNext(song);
  showToast('已设为下一首: ' + (song && song.name ? song.name : ''));
}
function openQueueArtist(i) {
  var song = playQueue && playQueue[i];
  if (song) openArtistDetailForSong(song);
}
function moveQueueIndexToTop(idx) {
  idx = Number(idx);
  if (!isFinite(idx) || idx < 0 || idx >= playQueue.length) return -1;
  if (idx === 0) return 0;
  var item = playQueue.splice(idx, 1)[0];
  playQueue.unshift(item);
  if (currentIdx === idx) currentIdx = 0;
  else if (currentIdx >= 0 && currentIdx < idx) currentIdx += 1;
  return 0;
}
function playSearchResult(i) {
  var song = playlist[i]; if (!song) return;
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (!playQueue.length) { playQueue.unshift(cloneSong(song)); currentIdx = 0; }
  else {
    var matchIdx = -1;
    var targetKey = queueItemKey(song);
    for (var j = 0; j < playQueue.length; j++) if (queueItemKey(playQueue[j]) === targetKey) { matchIdx = j; break; }
    if (matchIdx >= 0) currentIdx = moveQueueIndexToTop(matchIdx);
    else { playQueue.unshift(cloneSong(song)); currentIdx = 0; }
  }
  $results.classList.remove('show');
  $input.value = ''; $input.blur();
  playQueueAt(currentIdx);
}
var firstPlayDone = false;

function playbackProviderLabel(song) {
  var key = songProviderKey(song);
  return key === 'qq' ? 'QQ Music' : (key === 'kugou' ? 'Kugou' : 'Netease');
}
function playbackLoginProvider(song) {
  var key = songProviderKey(song);
  return key === 'qq' ? 'qq' : (key === 'kugou' ? 'kugou' : 'netease');
}
function playbackRestrictionMessage(song, data) {
  data = data || {};
  var restriction = data.restriction || {};
  var category = data.reason || restriction.category || '';
  var provider = playbackProviderLabel(song);
  var message = data.message || restriction.message || '';
  if (!message) {
    if (category === 'login_required') message = provider + '需要登录后再尝试播放';
    else if (category === 'vip_required') message = provider + '歌曲需要会员权限';
    else if (category === 'paid_required') message = provider + '歌曲需要购买或更高权限';
    else if (category === 'trial_only') message = provider + '仅返回试听片段';
    else if (category === 'copyright_unavailable') message = provider + '版权暂不可播';
    else message = provider + '没有返回可播放地址';
  }
  if (category === 'login_required') return message + ' · 正在打开登录';
  if (category === 'copyright_unavailable' || category === 'url_unavailable') return message + ' · 可以试试另一个平台版本';
  return message;
}
function qqPlaybackRetryQualities(requestedQuality, resolvedLevel) {
  requestedQuality = normalizePlaybackQuality(requestedQuality || playbackQuality);
  resolvedLevel = String(resolvedLevel || '').toLowerCase();
  var pool = [];
  if (requestedQuality === 'jymaster' || requestedQuality === 'hires' || requestedQuality === 'lossless' || resolvedLevel === 'hires' || resolvedLevel === 'lossless') {
    pool = ['exhigh', 'standard'];
  } else if (requestedQuality === 'exhigh' || resolvedLevel === 'exhigh') {
    pool = ['standard'];
  }
  return pool.filter(function(q){ return q !== requestedQuality; });
}
async function retryQQPlaybackWithCompatibleQuality(song, idx, token, opts, data, requestedQuality) {
  opts = opts || {};
  var tried = Array.isArray(opts.qqQualityTried) ? opts.qqQualityTried.slice() : [];
  [requestedQuality, data && data.level].forEach(function(q){
    q = normalizePlaybackQuality(q || '');
    if (q && tried.indexOf(q) < 0) tried.push(q);
  });
  var candidates = qqPlaybackRetryQualities(requestedQuality, data && data.level).filter(function(q){ return tried.indexOf(q) < 0; });
  if (!candidates.length || token !== trackSwitchToken) return false;
  var nextQuality = candidates[0];
  var resolvedQuality = normalizePlaybackQuality(data && data.level);
  if (resolvedQuality === 'hires' || resolvedQuality === 'lossless') qqPlaybackQualityCeiling = nextQuality;
  showSourceFallbackNotice('QQ 音质自动兼容', '当前音质启动失败，正在切到 ' + playbackQualityLabel(nextQuality) + '。');
  await playQueueAt(idx, Object.assign({}, opts, {
    qualityOverride: nextQuality,
    qqQualityTried: tried,
  }));
  return true;
}
var sourceFallbackNoticeTimer = null;
function closeSourceFallbackNotice() {
  var notice = document.getElementById('source-fallback-notice');
  if (sourceFallbackNoticeTimer) { clearTimeout(sourceFallbackNoticeTimer); sourceFallbackNoticeTimer = null; }
  if (notice) notice.classList.remove('show');
}
function showSourceFallbackNotice(title, body) {
  var notice = document.getElementById('source-fallback-notice');
  var titleEl = document.getElementById('source-fallback-title');
  var bodyEl = document.getElementById('source-fallback-body');
  if (!notice || !titleEl || !bodyEl) return;
  titleEl.textContent = title || '自动换源';
  bodyEl.textContent = body || '';
  notice.classList.add('show');
  if (sourceFallbackNoticeTimer) clearTimeout(sourceFallbackNoticeTimer);
  sourceFallbackNoticeTimer = setTimeout(closeSourceFallbackNotice, 5000);
}
function normalizeMatchText(text) {
  return String(text || '').toLowerCase()
    .replace(/[（(【\[].*?[）)】\]]/g, '')
    .replace(/[\s·・\-—_.,，。:：'"“”‘’/\\|]+/g, '');
}
function artistNameParts(song) {
  var parts = [];
  if (song && Array.isArray(song.artists)) {
    song.artists.forEach(function(a){ if (a && a.name) parts.push(a.name); });
  }
  if (song && song.artist) {
    String(song.artist).split(/\s*\/\s*|\s*,\s*|、|&| feat\.? | ft\.? /i).forEach(function(name){
      if (name && name.trim()) parts.push(name.trim());
    });
  }
  return parts.map(normalizeMatchText).filter(Boolean);
}
function isSameTitleArtist(source, candidate) {
  if (!source || !candidate) return false;
  if (normalizeMatchText(source.name || source.title) !== normalizeMatchText(candidate.name || candidate.title)) return false;
  var a = artistNameParts(source);
  var b = artistNameParts(candidate);
  if (!a.length || !b.length) return false;
  return a.some(function(name){ return b.indexOf(name) >= 0; });
}
function alternatePlaybackProvider(song) {
  return songProviderKey(song) === 'qq' ? 'netease' : 'qq';
}
async function searchAlternatePlatformSong(song) {
  var target = alternatePlaybackProvider(song);
  var artist = artistNameParts(song)[0] || '';
  var query = [song.name || song.title || '', song.artist || artist].filter(Boolean).join(' ').trim();
  if (!query) return null;
  var url = target === 'qq'
    ? '/api/qq/search?keywords=' + encodeURIComponent(query) + '&limit=8'
    : '/api/search?keywords=' + encodeURIComponent(query) + '&limit=12';
  var data = await apiJson(url);
  var list = data && (data.songs || data.result || []);
  for (var i = 0; i < list.length; i++) {
    if (isSameTitleArtist(song, list[i])) return cloneSong(list[i]);
  }
  return null;
}
function markQueueItemPlaybackFailed(idx) {
  if (playQueue[idx]) playQueue[idx]._lastPlaybackFailAt = Date.now();
}
function nextUnblockedQueueIndex(idx) {
  var now = Date.now();
  for (var step = 1; step < playQueue.length; step++) {
    var nextIdx = (idx + step) % playQueue.length;
    var failedAt = Number(playQueue[nextIdx] && playQueue[nextIdx]._lastPlaybackFailAt) || 0;
    if (!failedAt || now - failedAt > 18000) return nextIdx;
  }
  return -1;
}
function skipFailedQueueItem(idx, token, message) {
  hideLoading();
  if (token !== trackSwitchToken) return;
  markQueueItemPlaybackFailed(idx);
  if (playQueue.length <= 1) {
    showSourceFallbackNotice('没有可跳过的下一首', message || '当前歌曲不可播放，队列里没有其他歌曲。');
    return;
  }
  var nextIdx = nextUnblockedQueueIndex(idx);
  if (nextIdx < 0) {
    showSourceFallbackNotice('队列暂时没有可播歌曲', '已尝试绕开受限歌曲，当前队列没有新的可播放项。');
    return;
  }
  showSourceFallbackNotice('已跳过受限歌曲', message || '未找到同名同歌手的另一个平台版本，正在播放下一首。');
  currentIdx = nextIdx;
  playQueueAt(nextIdx, { fallbackDepth: 0 });
}
async function tryAutoPlaybackFallback(song, data, idx, token, opts) {
  opts = opts || {};
  if (opts.fallbackDepth > 0) {
    skipFailedQueueItem(idx, token, '自动换源后的版本仍不可播，正在播放下一首。');
    return true;
  }
  if (!song || song.type === 'local' || song.type === 'podcast' || song.source === 'podcast') return false;
  var restriction = (data && data.restriction) || {};
  var category = (data && data.reason) || restriction.category || '';
  var fromLabel = playbackProviderLabel(song);
  var targetLabel = alternatePlaybackProvider(song) === 'qq' ? 'QQ 音乐' : '网易云';
  showSourceFallbackNotice('正在自动换源', fromLabel + ' 当前不可播，正在查找 ' + targetLabel + ' 的同名同歌手版本。');
  try {
    var alternate = await searchAlternatePlatformSong(song);
    if (token !== trackSwitchToken) return true;
    if (!alternate) {
      if (category === 'login_required') return false;
      skipFailedQueueItem(idx, token, '没有找到同名同歌手的 ' + targetLabel + ' 版本，正在播放下一首。');
      return true;
    }
    alternate.autoFallbackFrom = songProviderKey(song);
    playQueue[idx] = hydrateCustomCover(alternate);
    safeRenderQueuePanel('source-fallback', { scrollCurrent: miniQueueOpen });
    safeShelfRebuild('source-fallback');
    showSourceFallbackNotice('已自动切换音源', (song.name || '当前歌曲') + ' 已从 ' + fromLabel + ' 切到 ' + targetLabel + '。');
    await playQueueAt(idx, { fallbackDepth: 1 });
    return true;
  } catch (e) {
    if (token !== trackSwitchToken) return true;
    skipFailedQueueItem(idx, token, '自动换源搜索失败，正在播放下一首。');
    return true;
  }
}
function handlePlaybackUnavailable(song, data) {
  hideLoading();
  forcePlaybackControlsInteractive();
  var provider = playbackLoginProvider(song);
  var restriction = (data && data.restriction) || {};
  var category = (data && data.reason) || restriction.category || '';
  showToast(playbackRestrictionMessage(song, data));
  if (category === 'login_required') {
    setTimeout(function(){
      var modal = document.getElementById('login-modal');
      if (!modal || modal.classList.contains('show')) return;
      openProviderLogin(provider);
    }, 520);
  }
}

function pauseCurrentAudioForTrackSwitch() {
  playToggleBusy = false;
  if (!audio) return;
  try {
    audioFadeSerial++;
    clearAudioFadeTimers();
    audio.onended = null;
    audio.pause();
  } catch (e) {}
  playing = false;
  setPlayIcon(false);
  syncPlaybackStateFromAudioEvent('track-switch');
}

function syncPlaybackStateFromAudioEvent(reason) {
  var isPlaying = !!(audio && audio.src && !audio.paused && !audio.ended);
  playing = isPlaying;
  setPlayIcon(isPlaying);
  if (!isPlaying) hideLoading();
  if (reason === 'play' || reason === 'playing') switchPlaybackVisualToEmily();
  forcePlaybackControlsInteractive();
}

function isPlaybackRecursionError(err) {
  var msg = String((err && err.message) || err || '');
  return err instanceof RangeError || /maximum call stack size exceeded/i.test(msg);
}

function safePlaybackStep(label, fn) {
  try {
    return fn();
  } catch (err) {
    console.warn('[PlaybackSetupStep]', label, err);
    return null;
  }
}

function playbackFailureToastText(err) {
  if (isPlaybackRecursionError(err)) return '播放准备异常，已保持播放器可操作';
  return '播放失败: ' + (err && err.message ? err.message : err);
}
function scheduleAudioResumePosition(media, seconds, token) {
  seconds = Math.max(0, Number(seconds) || 0);
  if (!media || seconds < 0.35) return;
  var applied = false;
  function applyResume() {
    if (applied || token !== trackSwitchToken || !media) return;
    var duration = Number(media.duration) || 0;
    var target = duration > 0 ? Math.min(seconds, Math.max(0, duration - 0.45)) : seconds;
    try {
      media.currentTime = target;
      applied = true;
      if (typeof syncBeatMapPlaybackCursor === 'function') syncBeatMapPlaybackCursor(target, true);
      if (typeof syncPodcastDjMapCursor === 'function') syncPodcastDjMapCursor(target, true);
      updatePlaybackProgressUi();
    } catch (e) {}
  }
  media.addEventListener('loadedmetadata', applyResume, { once: true });
  media.addEventListener('canplay', applyResume, { once: true });
  setTimeout(applyResume, 520);
  applyResume();
}

async function playQueueAt(idx, opts) {
  opts = opts || {};
  if (idx < 0 || idx >= playQueue.length) return;
  markRenderInteraction('track-switch', 1500);
  var playPhase = 'start';
  function markPlayPhase(name) { playPhase = name; }
  try {
  markPlayPhase('session-finalize');
  safePlaybackStep('session-finalize', function(){ finalizeListenSession(false); });
  homeForcedOpen = false;
  if (!opts.preserveHomeState) homeSuppressed = false;
  currentIdx = idx;
  safePlaybackStep('shelf-current-sync', function(){
    if (shelfManager && shelfManager.syncOpenContentToCurrent) shelfManager.syncOpenContentToCurrent(false);
  });
  trackSwitchToken++;
  markPlayPhase('cancel-previous-track');
  cancelBeatAnalysisTimer();
  cancelBeatPrefetchTimer();
  if (localBeatAnalysis.active) cancelLocalBeatAnalysis();
  closeGsapModal(document.getElementById('local-beat-modal'));
  beatMapToken++;
  var token = trackSwitchToken;
  var firstVisualPlay = !firstPlayDone;
  markPlayPhase('track-setup');
  var song = safePlaybackStep('hydrate-song', function(){ return hydrateCustomCover(playQueue[idx]); }) || playQueue[idx];
  playQueue[idx] = song;
  var playbackContext = opts.context || (song && song.radioContext) || null;
  activeRadioContext = playbackContext || null;
  safeRenderQueuePanel('play-queue-at-switch', { scrollCurrent: miniQueueOpen });
  safePlaybackStep('shelf-preview-suppress', suppressShelfPreviewForPlaybackSwitch);
  pauseCurrentAudioForTrackSwitch();
  var bmKey = safePlaybackStep('beatmap-key', function(){ return beatMapSongKey(song); }) || '';
  var podcastDjMode = !!safePlaybackStep('podcast-mode', function(){ return isPodcastSong(song); });
  safePlaybackStep('dj-mode', function(){ setDjModeActive(podcastDjMode, song); });
  safePlaybackStep('visual-switch', switchPlaybackVisualToEmily);
  currentLocalSong = null;
  safePlaybackStep('cover-button', updateCustomCoverButton);
  safePlaybackStep('like-buttons', function(){ updateLikeButtons(song); });
  safePlaybackStep('like-status', function(){ syncLikeStatusForSong(song); });
  safePlaybackStep('quality-ui', updatePlaybackQualityUi);
  safePlaybackStep('cinema-track-profile', function(){ resetCinemaTrackProfile(song); });
  safePlaybackStep('empty-home', function(){ if (!opts.preserveHomeState) updateEmptyHomeVisibility(); });
  safePlaybackStep('track-ui', function(){
    document.getElementById('hint').classList.add('hidden');
    document.getElementById('thumb-title').textContent = song.name;
    document.getElementById('thumb-artist').textContent = song.artist;
    updateControlTrackInfo(song);
    document.getElementById('thumb-wrap').classList.add('visible');
  });
  markPlayPhase('lyric-prep');
  safePlaybackStep('lyric-prep', function(){
    var initialLyricLines = withLyricFallback([]);
    setOriginalLyricsState(initialLyricLines, false, 'fallback');
    applyPreferredLyricsForCurrent(true);
  });

  markPlayPhase('cover-load');
  safePlaybackStep('cover-load', function(){
    var customCover = getCustomCoverForSong(song);
    var coverOpts = { trackToken: token, deferHeavy: true, delay: firstVisualPlay ? 380 : 680, timeout: firstVisualPlay ? 1400 : 1900 };
    if (customCover) applyCoverDataUrl(customCover, coverOpts);
    else loadCoverFromUrl(song.cover ? coverUrlWithSize(song.cover, 400) : '', coverOpts);
  });
  safePlaybackStep('trial-banner-reset', function(){ document.getElementById('trial-banner').classList.remove('show'); });
  safePlaybackStep('show-loading', showLoading);
  lyricSunEnergy = 0; lyricSunTarget = 0; lyricSunHold = 0; lyricSunAvg = 0; lyricSunPeak = 0.55;

  // 首次播放: 粒子从暗处浮出 (Apple 风格)
  if (firstVisualPlay) {
    safePlaybackStep('first-visual-alpha', function(){
      firstPlayDone = true;
      tweenParticleAlpha(uniforms.uAlpha.value || 0, 1.0, 220);
    });
  }

  try {
    markPlayPhase('source-url');
    var playbackProvider = songProviderKey(song);
    var isQQPlayback = playbackProvider === 'qq';
    var isKugouPlayback = playbackProvider === 'kugou';
    var requestedQuality = normalizePlaybackQuality(opts.qualityOverride || playbackQuality);
    if (!isQQPlayback && requestedQuality === 'jymaster' && !hasProviderSvip('netease', loginStatus)) requestedQuality = 'hires';
    if (isQQPlayback && qqPlaybackQualityCeiling && (requestedQuality === 'jymaster' || requestedQuality === 'hires' || requestedQuality === 'lossless')) {
      requestedQuality = qqPlaybackQualityCeiling;
    }
    var qualityParam = '&quality=' + encodeURIComponent(requestedQuality);
    var data = isQQPlayback
      ? await apiJson('/api/qq/song/url?mid=' + encodeURIComponent(song.mid || song.songmid || song.id || '') + '&mediaMid=' + encodeURIComponent(song.mediaMid || song.media_mid || '') + qualityParam)
      : (isKugouPlayback
        ? await apiJson('/api/kugou/song/url?hash=' + encodeURIComponent(song.hash || song.id || '') + '&albumAudioId=' + encodeURIComponent(song.albumAudioId || song.album_audio_id || '') + '&albumId=' + encodeURIComponent(song.albumId || song.album_id || '') + qualityParam + kugouQualityHashesParam(song))
        : await apiJson('/api/song/url?id=' + song.id + qualityParam));
    if (token !== trackSwitchToken) return;
    if (!data.url) {
      if (isQQPlayback && await retryQQPlaybackWithCompatibleQuality(song, idx, token, opts, data, requestedQuality)) return;
      if (await tryAutoPlaybackFallback(song, data, idx, token, opts)) return;
      handlePlaybackUnavailable(song, data);
      return;
    }
    var resolvedQualityText = playbackResolvedQualityText(data);
    if (!isQQPlayback && playbackQualityWasDowngraded(requestedQuality, data.level)) {
      showSourceFallbackNotice('网易云音质自动降级', '请求 ' + playbackQualityLabel(requestedQuality) + '，实际播放 ' + resolvedQualityText + '。');
    } else if (opts.qualitySwitch) {
      showSourceFallbackNotice('音质已切换', '实际播放: ' + resolvedQualityText + '。');
    }
    if (data.trial) {
      var txt;
      if (data.loggedIn && data.vipLevel === 'svip') txt = '此歌曲需要单曲、专辑购买或更高权限';
      else if (data.loggedIn && data.vipLevel === 'vip') txt = '此歌曲需要 SVIP 或购买 · 当前仅播放试听片段';
      else if (data.loggedIn) txt = '此歌曲需 VIP · 当前仅播放试听片段';
      else txt = '当前未登录 · 仅播放试听片段';
      document.getElementById('trial-text').textContent = txt;
      var trialLoginBtn = document.getElementById('trial-login-btn');
      if (trialLoginBtn) {
        trialLoginBtn.style.display = data.loggedIn ? 'none' : '';
        trialLoginBtn.onclick = function(){ openProviderLogin('netease'); };
      }
      document.getElementById('trial-banner').classList.add('show');
    }
    markPlayPhase('audio-element');
    if (!audio) { audio = new Audio(); audio.crossOrigin = 'anonymous'; }
    else {
      audioFadeSerial++;
      clearAudioFadeTimers();
      audio.pause();
    }
    bindPlaybackProgressEvents(audio);
    applyVolumeToAudio();
    var proxyAudioUrl = '/api/audio?url=' + encodeURIComponent(data.url);
    audio.src = proxyAudioUrl;
    updatePlaybackProgressUi();
    audio.onended = function(){
      if (token !== trackSwitchToken) return;
      finalizeListenSession(true);
      if (playMode === 'single') setTimeout(function(){ playQueueAt(currentIdx, { autoRepeat: true }); }, 0);
      else setTimeout(nextTrack, 0);
    };
    scheduleAudioResumePosition(audio, opts.resumeAt, token);
    audio.load();
    markPlayPhase('visual-prep');
    try {
    // 重置 beatmap 状态
    currentBeatMap = null;
    beatMapNextIdx = 0;
    resetAudioVisualState();
    resetBeatCameraSync(0);
    cancelBeatAnalysisTimer();
    beatMapToken++;
    var bmTok = beatMapToken;
    if (podcastDjMode) {
      // 播客走独立 DJ 离线锁拍系统, 不写入普通歌曲 beatMap.
      djBeatMapToken++;
      cancelDjBeatAnalysisTimer();
      resetDjBeatMapState();
      currentBeatMap = null;
      beatMapNextIdx = 0;
      var djTok = djBeatMapToken;
      var djKey = djSongKey(song);
      if (djBeatMapCache[djKey]) {
        currentDjBeatMap = djBeatMapCache[djKey];
        applyPodcastDjProfileFromMap(currentDjBeatMap);
        syncPodcastDjMapCursor(audio ? audio.currentTime : 0, true);
        hideBeatChip();
        notifyDesktopLyricsBeatMapReady();
        console.log('podcast DJ beatmap 缓存命中:', currentDjBeatMap.cameraBeats.length, '个主拍');
      } else {
        showBeatChip('DJ 离线锁拍准备中…');
        var djDurationSec = Math.max(0, Number(song.duration) || 0);
        if (djDurationSec > 10000) djDurationSec /= 1000;
        schedulePodcastDjAnalysis(djKey, data.url, djTok, djDurationSec);
      }
      maybeAnnounceDjMode();
    } else if (bmKey && beatMapCache[bmKey]) {
      // 如果缓存有, 直接用
      currentBeatMap = beatMapCache[bmKey];
      applyCinemaProfileFromBeatMap(currentBeatMap);
      syncBeatMapPlaybackCursor(audio ? audio.currentTime : 0);
      notifyDesktopLyricsBeatMapReady();
      console.log('beatmap 缓存命中:', currentBeatMap.kicks.length, '个鼓点');
      scheduleQueueBeatPrefetch(idx, 2600);
    } else {
      var diskBeatMap = bmKey ? await readBeatDiskCache(bmKey) : null;
      if (diskBeatMap) {
        currentBeatMap = diskBeatMap;
        applyCinemaProfileFromBeatMap(currentBeatMap);
        syncBeatMapPlaybackCursor(audio ? audio.currentTime : 0);
        notifyDesktopLyricsBeatMapReady();
        console.log('beatmap D盘缓存命中:', currentBeatMap.kicks.length, '个鼓点');
        scheduleQueueBeatPrefetch(idx, 2600);
      } else {
        // 后台延迟分析, 避免新歌刚开始播放时抢占解码和渲染资源
        scheduleBeatAnalysis(bmKey || song.id, proxyAudioUrl, bmTok, song);
      }
    }
    } catch (visualErr) {
      console.warn('[PlaybackVisualPrep]', song && song.name, visualErr);
      currentBeatMap = null;
      beatMapNextIdx = 0;
      safePlaybackStep('visual-prep-hide-chip', hideBeatChip);
    }
    markPlayPhase('audio-start');
    var playbackStarted = await playAudio({ silent: isQQPlayback });
    if (!playbackStarted) {
      if (isQQPlayback && await retryQQPlaybackWithCompatibleQuality(song, idx, token, opts, data, requestedQuality)) return;
      forcePlaybackControlsInteractive();
      if (opts.manual) {
        showToast('播放启动失败，请重新选择歌曲');
      } else {
        showSourceFallbackNotice('歌曲已载入', '点击播放器中间的播放按钮继续播放。');
      }
      return;
    }
    forcePlaybackControlsInteractive();
    markPlayPhase('session-begin');
    safePlaybackStep('listen-session-begin', function(){ beginListenSession(song, playbackContext); });
    markPlayPhase('lyrics-fetch');
    if (song.type === 'podcast') {
      safePlaybackStep('podcast-lyrics', function(){
        var podcastLyricLines = withLyricFallback([]);
        setOriginalLyricsState(podcastLyricLines, false, 'fallback');
        applyPreferredLyricsForCurrent(true);
      });
    } else {
      fetchLyric(song, token);
    }
    safeRenderQueuePanel('play-queue-at');
    scheduleShelfRebuild('play-queue-at', true);
    safePlaybackStep('shelf-preview-suppress-end', suppressShelfPreviewForPlaybackSwitch);
  } catch (err) {
    console.error('Play failed:', { phase: playPhase, error: err }, err);
    hideLoading();
    forcePlaybackControlsInteractive();
    if (!isPlaybackRecursionError(err) && token === trackSwitchToken && !opts.manual && playQueue.length > 1) {
      skipFailedQueueItem(idx, token, '当前歌曲加载失败，正在尝试队列里的下一首。');
      return;
    }
    showToast(playbackFailureToastText(err));
  }
  } catch (setupErr) {
    console.error('Play setup failed:', { phase: playPhase, error: setupErr }, setupErr);
    hideLoading();
    forcePlaybackControlsInteractive();
    if (!isPlaybackRecursionError(setupErr) && typeof token !== 'undefined' && token === trackSwitchToken && !opts.manual && playQueue.length > 1) {
      skipFailedQueueItem(idx, token, '当前歌曲切换失败，正在尝试队列里的下一首。');
      return;
    }
    showToast(playbackFailureToastText(setupErr));
  }
}
async function attemptAudioPlay(opts) {
  opts = opts || {};
  try {
      if (!audio) return false;
      if (!audioReady) initAudio();
      if (opts.fade !== false) preparePlaybackFadeIn();
      if (opts.manual) {
        var manualPlay = audio.play();
        await resumeAudioAnalysis();
        await manualPlay;
      } else {
        await resumeAudioAnalysis();
        await audio.play();
      }
      await resumeAudioAnalysis();
      switchPlaybackVisualToEmily();
      playing = true; setPlayIcon(true);
    if (opts.fade !== false) startPlaybackFadeIn();
    else restorePlaybackGain();
    forcePlaybackControlsInteractive();
    hideLoading();
    return true;
  } catch (err) {
    console.warn('Audio play blocked:', err && (err.message || err));
    restorePlaybackGain();
    playing = false; setPlayIcon(false);
    hideLoading();
    forcePlaybackControlsInteractive();
    if (!opts.silent) showToast(opts.manual ? '播放启动失败, 请重新选择歌曲' : '播放被系统拦截, 请点击播放按钮');
    return false;
  }
}
async function playAudio(opts) {
  opts = opts || {};
  return attemptAudioPlay({ manual: false, silent: !!opts.silent });
}
async function togglePlay() {
  if (playToggleBusy) return;
  playToggleBusy = true;
  try {
    forcePlaybackControlsInteractive();
    if ((!audio || !audio.src) && playQueue.length && currentIdx >= 0) {
      await playQueueAt(currentIdx, { manual: true });
      return;
    }
    if (!audio) return;
    if (audio.paused || audio.ended) {
      await attemptAudioPlay({ manual: true });
    } else {
      await fadeOutAndPauseAudio();
      playing = false;
      setPlayIcon(false);
      hideLoading();
      safePlaybackStep('listen-stats-pause', function(){ updateListenStatsTick(true); });
      forcePlaybackControlsInteractive();
      safePlaybackStep('sync-pause-state', function(){ syncPlaybackStateFromAudioEvent('manual-pause'); });
      safePlaybackStep('pause-controls-hide', function(){ scheduleControlsHide(520); });
    }
  } catch (err) {
    console.warn('[TogglePlay]', err);
    playing = !!(audio && !audio.paused);
    setPlayIcon(playing);
    hideLoading();
    forcePlaybackControlsInteractive();
    if (!audio || !audio.src) showToast('播放控制失败');
  } finally {
    playToggleBusy = false;
  }
}
function setPlayIcon(p) {
  var html = p
    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    : '<path d="M8 5v14l11-7z"/>';
  ['play-icon', 'minimal-play-icon'].forEach(function(id){
    var icon = document.getElementById(id);
    if (icon) icon.innerHTML = html;
  });
}
function nextTrack() {
  if (!playQueue.length) return;
  playToggleBusy = false;
  forcePlaybackControlsInteractive();
  if (playMode === 'shuffle') currentIdx = Math.floor(Math.random() * playQueue.length);
  else currentIdx = (currentIdx + 1) % playQueue.length;
  Promise.resolve(playQueueAt(currentIdx)).finally(forcePlaybackControlsInteractive);
}
function prevTrack() {
  if (!playQueue.length) return;
  playToggleBusy = false;
  forcePlaybackControlsInteractive();
  currentIdx = (currentIdx - 1 + playQueue.length) % playQueue.length;
  Promise.resolve(playQueueAt(currentIdx)).finally(forcePlaybackControlsInteractive);
}
function shuffleQueue() {
  for (var i = playQueue.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = playQueue[i]; playQueue[i] = playQueue[j]; playQueue[j] = tmp;
  }
  currentIdx = 0; safeRenderQueuePanel('shuffle-queue');
  showToast('队列已随机');
  safeShelfRebuild('shuffle-queue');
}
function clearQueue() {
  playQueue = []; currentIdx = -1;
  safeRenderQueuePanel('clear-queue');
  safeShelfRebuild('clear-queue');
  updateCustomCoverButton();
  updateCustomLyricControls();
  updateEmptyHomeVisibility({ forceLoad: false });
}
function removeFromQueue(idx) {
  if (idx < 0 || idx >= playQueue.length) return;
  playQueue.splice(idx, 1);
  if (currentIdx >= playQueue.length) currentIdx = playQueue.length - 1;
  safeRenderQueuePanel('remove-queue-item');
  safeShelfRebuild('remove-queue-item');
  updateCustomCoverButton();
  updateCustomLyricControls();
  updateEmptyHomeVisibility({ forceLoad: false });
}
function playModeLabel(mode) {
  return { loop: '顺序循环', shuffle: '随机播放', single: '单曲循环' }[mode] || '顺序循环';
}

function playModeIconMarkup(mode) {
  if (mode === 'shuffle') {
    return '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>';
  }
  if (mode === 'single') {
    return '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path d="M12 9v6"/><path d="M10.5 10.5 12 9l1.5 1.5"/>';
  }
  return '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>';
}

function updatePlayModeButton(animate) {
  var label = playModeLabel(playMode);
  var chip = document.getElementById('play-mode-chip');
  var btn = document.getElementById('play-mode-btn');
  var icon = document.getElementById('play-mode-icon');
  if (chip) chip.textContent = label;
  if (btn) {
    btn.dataset.mode = playMode;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.classList.toggle('active', playMode !== 'loop');
  }
  if (icon) icon.innerHTML = playModeIconMarkup(playMode);
  if (!animate || !btn) return;
  if (window.gsap) {
    window.gsap.killTweensOf(btn);
    if (icon) window.gsap.killTweensOf(icon);
    window.gsap.timeline({ defaults: { overwrite: true } })
      .fromTo(btn, { scale: 0.86, rotate: -8 }, { scale: 1.12, rotate: 4, duration: 0.16, ease: 'power2.out' })
      .to(btn, { scale: 1, rotate: 0, duration: 0.34, ease: 'back.out(2.1)' });
    window.gsap.fromTo(btn,
      { boxShadow: '0 0 0 0 rgba(255,63,85,.36)' },
      { boxShadow: '0 0 0 14px rgba(255,63,85,0)', duration: 0.58, ease: 'sine.out', overwrite: false, onComplete: function(){ window.gsap.set(btn, { clearProps: 'boxShadow' }); } }
    );
    if (icon) window.gsap.fromTo(icon, { y: 4, autoAlpha: 0.32, rotate: -22, scale: 0.74 }, { y: 0, autoAlpha: 1, rotate: 0, scale: 1, duration: 0.42, ease: 'expo.out', overwrite: true });
  } else {
    btn.classList.remove('mode-switching');
    void btn.offsetWidth;
    btn.classList.add('mode-switching');
    setTimeout(function(){ btn.classList.remove('mode-switching'); }, 460);
  }
}

function cyclePlayMode() {
  var modes = ['loop', 'shuffle', 'single'];
  var idx = modes.indexOf(playMode);
  playMode = modes[(idx + 1) % modes.length];
  updatePlayModeButton(true);
  showToast('播放模式: ' + playModeLabel(playMode));
}
updatePlayModeButton(false);
