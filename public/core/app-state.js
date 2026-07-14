(function(){
  var state = window.MineradioState || {};

  function section(name) {
    return state[name] || (state[name] = {});
  }

  function alias(sectionName, name, initialValue) {
    var bucket = section(sectionName);
    if (!Object.prototype.hasOwnProperty.call(bucket, name)) bucket[name] = initialValue;
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        get: function(){ return bucket[name]; },
        set: function(value){ bucket[name] = value; }
      });
    } catch (e) {}
  }

  alias('search', 'searchTimer', null);
  alias('search', 'searchRequestSeq', 0);
  alias('search', 'searchLastResultQuery', '');
  alias('search', 'searchMode', 'song');
  alias('search', 'playlist', []);
  alias('search', 'podcastResults', []);
  alias('search', 'podcastPrograms', []);
  alias('search', 'podcastCurrentRadio', null);

  alias('playback', 'playQueue', []);
  alias('playback', 'currentIdx', -1);
  alias('playback', 'playing', false);
  alias('playback', 'playToggleBusy', false);
  alias('playback', 'playMode', 'loop');
  alias('playback', 'audio', null);
  alias('playback', 'audioCtx', null);
  alias('playback', 'source', null);
  alias('playback', 'analyser', null);
  alias('playback', 'beatAnalyser', null);
  alias('playback', 'gainNode', null);
  alias('playback', 'uiSfxCtx', null);
  alias('playback', 'lastShelfSelectSfxAt', 0);
  alias('playback', 'audioReady', false);
  alias('playback', 'volumeTween', null);
  alias('playback', 'trackSwitchToken', 0);
  alias('playback', 'audioFadeTimer', null);
  alias('playback', 'audioElementFadeFrame', 0);
  alias('playback', 'audioFadeSerial', 0);
  alias('playback', 'targetVolume', 1);
  alias('playback', 'lastNonZeroVolume', 0.8);
  alias('playback', 'volumeCloseTimer', null);
  alias('playback', 'playbackQuality', 'hires');
  alias('playback', 'qqPlaybackQualityCeiling', '');
  alias('playback', 'firstPlayDone', false);

  alias('library', 'userPlaylists', []);
  alias('library', 'qqPlaylists', []);
  alias('library', 'kugouPlaylists', []);
  alias('library', 'myPodcastCollections', []);
  alias('library', 'myPodcastItems', {});
  alias('library', 'playlistCoverCache', {});

  alias('account', 'loginStatus', { loggedIn: false, vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '无VIP' });
  alias('account', 'qqLoginStatus', { provider: 'qq', loggedIn: false, preview: false, nickname: 'QQ 音乐', userId: '', avatar: '', vipType: 0 });
  alias('account', 'kugouLoginStatus', { provider: 'kugou', loggedIn: false, preview: true, nickname: '酷狗音乐', userId: '', avatar: '', vipType: 0 });
  alias('account', 'qqLoginAutoRefreshTimer', null);
  alias('account', 'qqLoginWasLoggedIn', false);
  alias('account', 'kugouLoginWasLoggedIn', false);
  alias('account', 'loginProvider', 'netease');
  alias('account', 'activeAccountProvider', 'netease');
  alias('account', 'dualAccountMode', false);
  alias('account', 'qqCookieBusy', false);
  alias('account', 'neteaseWebLoginBusy', false);
  alias('account', 'qqWebLoginBusy', false);
  alias('account', 'kugouWebLoginBusy', false);
  alias('account', 'qqManualCookieOpen', false);
  alias('account', 'loginStatusChecked', false);
  alias('account', 'loginStatusCheckFailed', false);
  alias('account', 'qrPollTimer', null);
  alias('account', 'qrKey', null);
  alias('account', 'startupLoginGuideShown', false);
  alias('account', 'loginGuideAnimating', false);
  alias('account', 'loginGuideRaf', null);

  alias('playlistPanel', 'queueViewTab', 'queue');
  alias('playlistPanel', 'miniQueueOpen', false);
  alias('playlistPanel', 'miniQueueRenderSeq', 0);
  alias('playlistPanel', 'queueRenderSeq', 0);
  alias('playlistPanel', 'playlistRenderSeq', 0);
  alias('playlistPanel', 'queuePanelDirty', false);
  alias('playlistPanel', 'playlistPanelRenderLimit', 28);
  alias('playlistPanel', 'playlistPanelLazyBound', false);
  alias('playlistPanel', 'playlistPanelPinned', false);
  alias('playlistPanel', 'playlistPanelDetailState', { key: '', loading: false, playlist: null, tracks: [], token: 0, renderLimit: 64 });
  alias('playlistPanel', 'smoothWheelScrollBound', false);

  alias('bottomBar', 'controlsAutoHide', false);
  alias('bottomBar', 'controlsHovering', false);
  alias('bottomBar', 'controlsHideTimer', null);
  alias('bottomBar', 'controlsHandleDimTimer', null);
  alias('bottomBar', 'controlsLastMoveAt', 0);
  alias('bottomBar', 'controlsShelfSuppressUntil', 0);
  alias('bottomBar', 'progressDragState', { active: false, lastParticleAt: 0 });

  alias('uiMode', 'diyPlayerMode', false);
  alias('uiMode', 'userCapsuleAutoHide', false);
  alias('uiMode', 'fxFabAutoHide', false);
  alias('uiMode', 'fxFabAutoHideRevealArmed', true);
  alias('uiMode', 'immersiveMode', false);

  alias('runtime', 'desktopRuntimeState', { desktop: false, minimized: false, visible: true, focused: true, fullscreen: false });
  alias('runtime', 'renderPowerState', { mode: '', width: 0, height: 0, pixelRatio: 0 });
  alias('runtime', 'backgroundCacheTrimTimer', 0);
  alias('runtime', 'runtimePerfState', { lastCacheTrimAt: 0, cacheTrimCount: 0, lastCacheTrimReason: '', lastHeapSampleAt: 0, heapMB: 0, cacheCounts: {} });

  alias('lyrics', 'lyricsLines', []);
  alias('lyrics', 'lyricsVisible', false);
  alias('lyrics', 'lyricsHasNativeKaraoke', false);
  alias('lyrics', 'lyricsTimingSource', 'none');
  alias('lyrics', 'lyricSourceMode', 'original');
  alias('lyrics', 'originalLyricsState', { lines: [], hasNativeKaraoke: false, timingSource: 'none' });
  alias('lyrics', 'customLyricMap', {});
  alias('lyrics', 'customLyricPrefs', {});
  alias('lyrics', 'stageLyrics', null);

  alias('cover', 'coverCropState', null);
  alias('cover', 'coverCropBound', false);
  alias('cover', 'coverProcessToken', 0);
  alias('cover', 'aiDepthPipeline', null);
  alias('cover', 'aiDepthReady', false);
  alias('cover', 'aiDepthBusy', false);
  alias('cover', 'aiDepthFailUntil', 0);
  alias('cover', 'coverDepthCache', Object.create(null));
  alias('cover', 'coverDepthCacheKeys', []);
  alias('cover', 'aiDepthLastRunAt', 0);
  alias('cover', 'aiDepthMinGapMs', 18000);
  alias('cover', 'currentCoverSource', null);
  alias('cover', 'coverPickerCanvas', null);
  alias('cover', 'customCoverMap', {});
  alias('cover', 'colorMixTween', null);
  alias('cover', 'alphaTween', null);
  alias('cover', 'floatAlphaTween', null);
  alias('cover', 'loadingTween', null);
  alias('cover', 'loadingShownAt', 0);
  alias('cover', 'loadingHideTimer', null);
  alias('cover', 'coverDepthTween', null);

  alias('glass', 'controlGlassState', { key: '', searchBoxKey: '', searchPillKey: '' });

  alias('shelf', 'shelfPinnedOpen', false);
  alias('shelf', 'shelfManager', null);
  alias('shelf', 'shelfOpenAnimAt', -10);
  alias('shelf', 'shelfHoverCue', { target: 0, value: 0, x: 0, y: 0, lastAt: 0, enteredAt: 0, zoneActive: false, guide: false });
  alias('shelf', 'shelfVisibility', 0);
  alias('shelf', 'wheelOverShelf', false);

  alias('guide', 'idleGuideCanvas', null);
  alias('guide', 'idleGuideCtx', null);
  alias('guide', 'idleGuideW', 0);
  alias('guide', 'idleGuideH', 0);
  alias('guide', 'idleGuideDpr', 1);
  alias('guide', 'idleGuideParticles', []);
  alias('guide', 'idleGuideTrails', [[], [], [], []]);
  alias('guide', 'idleGuideStartedAt', 0);
  alias('guide', 'idleGuideVisible', false);
  alias('guide', 'idleGuideLastFrameAt', 0);
  alias('guide', 'idleGuideDelayTimer', null);
  alias('guide', 'IDLE_GUIDE_BACKGROUND_ENABLED', false);
  alias('guide', 'idleGuideInteraction', {
    angle: 0,
    velocity: 0,
    rotX: -0.12,
    rotY: 0,
    spinX: 0,
    spinY: 0,
    zoom: 1,
    zoomTarget: 1,
    zoomPulse: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    pointerX: 0.5,
    pointerY: 0.5,
    pointerActive: false,
    focus: 0,
    press: 0,
    tiltX: 0,
    tiltY: 0
  });
  alias('guide', 'visualGuideActive', false);
  alias('guide', 'visualGuideStep', 0);
  alias('guide', 'visualGuideResizeBound', false);
  alias('guide', 'visualGuideState', { bottomWasVisible: false, searchWasPeek: false, fxWasPeek: false, plWasPeek: false, mode: 'simple', manual: false });

  alias('gesture', 'gestureVideo', null);
  alias('gesture', 'gestureCamera', null);
  alias('gesture', 'gestureHands', null);
  alias('gesture', 'gestureActive', false);
  alias('gesture', 'handLmSmooth', null);
  alias('gesture', 'handLmLastSeen', 0);
  alias('gesture', 'pinchState', { active: false, lastX: 0, lastY: 0, lastT: 0 });
  alias('gesture', 'particleSpin', { vx: 0, vy: 0, damping: 0.90 });
  alias('gesture', 'gestureRotation', { x: 0, y: 0 });
  alias('gesture', 'gestureGrip', { value: 0, target: 0, openness: 1, lastState: 'open', pulse: 0 });
  alias('gesture', 'handCanvas', null);
  alias('gesture', 'handCanvasCtx', null);

  alias('interaction', 'peekTimers', { search: null, fx: null, pl: null });
  alias('interaction', 'uploadTipTimer', null);
  alias('interaction', 'uploadTipAttempts', 0);
  alias('interaction', 'secondaryPlaylistEdgeGuard', { enteredAt: 0, timer: null, x: 0, y: 0, H: 0 });

  alias('splash', 'splashAnimating', true);
  alias('splash', 'splashCanvas', null);
  alias('splash', 'splashCtx', null);
  alias('splash', 'splashGl', null);
  alias('splash', 'splashGlProgram', null);
  alias('splash', 'splashGlBuffer', null);
  alias('splash', 'splashGlUniforms', null);
  alias('splash', 'splashW', 0);
  alias('splash', 'splashH', 0);
  alias('splash', 'splashDust', []);
  alias('splash', 'splashStreaks', []);
  alias('splash', 'splashShards', []);
  alias('splash', 'splashPixelRatio', 1);
  alias('splash', 'splashStartedAt', 0);
  alias('splash', 'splashSoundPlayed', false);
  alias('splash', 'splashAudioCtx', null);
  alias('splash', 'splashSoundFallbackArmed', false);
  alias('splash', 'splashTimer', null);
  alias('splash', 'reduceSplashMotion', false);
  alias('splash', 'splashReadyToEnter', false);

  alias('desktopBridge', 'desktopOverlayPushState', { lyricsAt: 0, wallpaperAt: 0, lastLyricsKey: '', lastLyricsBeatKey: '', lastWallpaperKey: '' });
  alias('desktopBridge', 'desktopFullscreenActive', false);
  alias('desktopBridge', 'documentFullscreenActive', false);
  alias('desktopBridge', 'desktopWindowState', {});

  alias('updatePreview', 'updatePreviewState', null);

  alias('ui', 'toastTimer', null);

  alias('localFiles', 'currentLocalSong', null);
  alias('localFiles', 'dropOv', null);
  alias('localFiles', 'dragCount', 0);

  alias('home', 'emptyHomeActive', false);
  alias('home', 'homeForcedOpen', false);
  alias('home', 'homeSuppressed', false);
  alias('home', 'homeDiscoverState', { loading: false, loaded: false, loggedIn: false, mode: 'starter', songs: [], playlists: [], podcasts: [], error: '', updatedAt: 0 });
  alias('home', 'homeDiscoverToken', 0);
  alias('home', 'homeVisualPresetActive', false);
  alias('home', 'homeVisualPrevPreset', 0);
  alias('home', 'homeWeatherRadioState', { loading: false, loaded: false, city: '上海', weather: null, radio: null, error: '', updatedAt: 0 });
  alias('home', 'homeWeatherToken', 0);
  alias('home', 'homeWeatherLoadTimer', null);
  alias('home', 'homeWeatherLoadPromise', null);
  alias('home', 'weatherRadioStartBusy', false);
  alias('home', 'homeHeroLyricState', { loading: false, loaded: false, lyric: null, error: '' });
  alias('home', 'activeRadioContext', null);
  alias('home', 'listenStatsState', { history: [], songs: {}, artists: {}, updatedAt: 0 });
  alias('home', 'listenSession', null);
  alias('home', 'homeWallpaperPrewarmStarted', false);

  alias('trackDetail', 'trackDetailSeq', 0);
  alias('trackDetail', 'detailArtistSongs', []);

  alias('songActions', 'likedSongMap', {});
  alias('songActions', 'likeBusyMap', {});
  alias('songActions', 'likeStatusToken', 0);
  alias('songActions', 'collectTargetSong', null);
  alias('songActions', 'collectBusy', false);

  alias('fxControls', 'presetTransition', { active: false, start: -10, duration: 0.92, from: 0, to: 0 });
  alias('fxControls', 'userFxArchives', []);
  alias('fxControls', 'userFxArchiveEditing', -1);
  alias('fxControls', 'coverColorPickerState', { target: 'visualTint', canvas: null });
  alias('fxControls', 'homeWaveTrackState', { bars: 0, smooth: [] });

  alias('startup', 'startupLoginStatusPromise', null);

  alias('renderLoop', 'prevTime', 0);
  alias('renderLoop', 'renderPerfState', null);
  alias('renderLoop', 'splashWarmRenderLast', 0);

  alias('fxPanel', 'fxPanelTab', 'presets');
  alias('fx', 'fx', null);

  window.MineradioState = state;
})();
