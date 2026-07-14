function handleFiles(files) {
  var audioFile = null, imgFile = null;
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (f.type.startsWith('audio/') || /\.(mp3|flac|wav|ogg|m4a)$/i.test(f.name)) audioFile = f;
    else if (f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name)) imgFile = f;
  }
  if (audioFile) {
    finalizeListenSession(false);
    var url = URL.createObjectURL(audioFile);
    var localTitle = audioFile.name.replace(/\.[^.]+$/, '');
    trackSwitchToken++;
    var token = trackSwitchToken;
    var firstVisualPlay = !firstPlayDone;
    if (localBeatAnalysis.active) cancelLocalBeatAnalysis();
    closeGsapModal(document.getElementById('local-beat-modal'));
    cancelBeatAnalysisTimer();
    cancelDjBeatAnalysisTimer();
    beatMapToken++;
    djBeatMapToken++;
    setDjModeActive(false);
    currentBeatMap = null;
    resetDjBeatMapState();
    beatMapNextIdx = 0;
    resetAudioVisualState();
    resetBeatCameraSync(0);
    currentIdx = -1;
    currentLocalSong = hydrateCustomCover({
      type: 'local',
      name: localTitle,
      artist: '本地文件',
      localKey: [audioFile.name, audioFile.size || 0, audioFile.lastModified || 0].join(':'),
      localUrl: url,
      duration: 0
    });
    updateCustomCoverButton();
    document.getElementById('hint').classList.add('hidden');
    document.getElementById('thumb-title').textContent = localTitle;
    document.getElementById('thumb-artist').textContent = '本地文件';
    updateControlTrackInfo({ name: localTitle, artist: '本地文件' });
    document.getElementById('thumb-wrap').classList.add('visible');
    safeRenderQueuePanel('play-local-file');
    safeShelfRebuild('play-local-file', true);
    suppressShelfPreviewForPlaybackSwitch();
    if (firstVisualPlay) { firstPlayDone = true; tweenParticleAlpha(uniforms.uAlpha.value || 0, 1.0, 260); }
    if (!audio) { audio = new Audio(); audio.crossOrigin = 'anonymous'; }
    else audio.pause();
    bindPlaybackProgressEvents(audio);
    applyVolumeToAudio();
    audio.src = url;
    updatePlaybackProgressUi();
    lyricSunEnergy = 0; lyricSunTarget = 0; lyricSunHold = 0; lyricSunAvg = 0; lyricSunPeak = 0.55;
    audio.onended = function(){ finalizeListenSession(true); playing = false; setPlayIcon(false); };
    audio.onloadedmetadata = function(){
      if (currentLocalSong && currentLocalSong.localUrl === url) {
        currentLocalSong.duration = audio && isFinite(audio.duration) ? audio.duration : 0;
        if (lyricSourceMode === 'custom') applyCustomLyricState(currentLocalSong, true);
      }
    };
    var localLyricLines = withLyricFallback([]);
    setOriginalLyricsState(localLyricLines, false, 'fallback');
    applyPreferredLyricsForCurrent(true);
    document.getElementById('trial-banner').classList.remove('show');
    audio.load();
    playAudio().then(function(ok){
      if (ok && currentLocalSong && currentLocalSong.localUrl === url) beginListenSession(currentLocalSong, null);
    });
    setTimeout(function(){
      if (currentLocalSong && currentLocalSong.localUrl === url) prepareLocalBeatAnalysis(currentLocalSong, url);
    }, 520);
    var localCover = getCustomCoverForSong(currentLocalSong);
    var localCoverOpts = { trackToken: token, deferHeavy: firstVisualPlay, delay: firstVisualPlay ? 60 : 0, timeout: firstVisualPlay ? 300 : 180 };
    if (localCover) applyCoverDataUrl(localCover, localCoverOpts);
    else if (!imgFile) loadCoverFromUrl('', localCoverOpts);
  }
  if (imgFile) {
    var uploadCoverOpts = audioFile
      ? { trackToken: trackSwitchToken, deferHeavy: !!firstVisualPlay, delay: firstVisualPlay ? 60 : 0, timeout: firstVisualPlay ? 300 : 180 }
      : null;
    loadCoverFromFile(imgFile, uploadCoverOpts);
  }
  if (!audioFile) updateCustomCoverButton();
}
var dropOv = document.getElementById('drop-overlay'), dragCount = 0;
document.addEventListener('dragenter', function(e){ e.preventDefault(); dragCount++; dropOv.classList.add('show'); });
document.addEventListener('dragleave', function(e){ e.preventDefault(); dragCount--; if (dragCount<=0){ dragCount=0; dropOv.classList.remove('show'); } });
document.addEventListener('dragover',  function(e){ e.preventDefault(); });
document.addEventListener('drop', function(e){
  e.preventDefault(); dragCount = 0; dropOv.classList.remove('show');
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});

// ============================================================
//  控制台 — 预设卡片 + 主滑块 + 开关 + 三态
