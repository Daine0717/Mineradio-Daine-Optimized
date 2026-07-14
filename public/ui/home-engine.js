function setHomeArt(id, url, size) {
  var el = document.getElementById(id);
  if (!el) return;
  var src = url ? coverUrlWithSize(url, size || 260) : '';
  el.style.backgroundImage = src ? 'url("' + cssImageUrl(src) + '")' : '';
  el.classList.toggle('has-cover', !!src);
  el.classList.toggle('home-skeleton', !src && homeDiscoverState.loading);
}
function compactHomeCount(n) {
  n = Number(n) || 0;
  if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
  if (n >= 10000) return Math.round(n / 10000) + '万';
  return n ? String(n) : '';
}
function loadListenStatsState() {
  try {
    var raw = localStorage.getItem(HOME_LISTEN_STATS_KEY);
    if (!raw) return { recent: null, history: [], songs: {}, artists: {}, updatedAt: 0 };
    var data = JSON.parse(raw);
    return {
      recent: data.recent || (Array.isArray(data.history) ? data.history[0] : null) || null,
      history: Array.isArray(data.history) ? data.history.slice(0, 180) : [],
      songs: data.songs && typeof data.songs === 'object' ? data.songs : {},
      artists: data.artists && typeof data.artists === 'object' ? data.artists : {},
      updatedAt: Number(data.updatedAt) || 0,
    };
  } catch (e) {
    return { recent: null, history: [], songs: {}, artists: {}, updatedAt: 0 };
  }
}
listenStatsState = loadListenStatsState();
function saveListenStatsState() {
  try {
    listenStatsState.updatedAt = Date.now();
    localStorage.setItem(HOME_LISTEN_STATS_KEY, JSON.stringify(listenStatsState));
  } catch (e) {}
}
function listenSongSnapshot(song) {
  song = song || {};
  return {
    key: queueItemKey(song),
    id: song.id || '',
    mid: song.mid || song.songmid || '',
    mediaMid: song.mediaMid || song.media_mid || '',
    type: song.type || 'song',
    sourceKey: song.source || song.provider || '',
    name: song.name || song.title || '未知歌曲',
    artist: song.artist || '',
    cover: songCoverSrc(song, 220) || song.cover || '',
    source: songSourceLabel(song),
    provider: song.provider || song.source || song.type || '',
    duration: Number(song.duration) || 0,
  };
}
function beginListenSession(song, context) {
  if (!song) return;
  var snap = listenSongSnapshot(song);
  if (!snap.key) return;
  if (listenSession && listenSession.key !== snap.key) finalizeListenSession(false);
  listenStatsState.recent = {
    key: snap.key,
    id: snap.id || '',
    mid: snap.mid || '',
    mediaMid: snap.mediaMid || '',
    type: snap.type || 'song',
    sourceKey: snap.sourceKey || '',
    name: snap.name || '未知歌曲',
    artist: snap.artist || '',
    cover: snap.cover || '',
    source: snap.source || '',
    playedAt: Date.now(),
    listenMs: 0,
    completed: false,
    context: context || activeRadioContext || null,
  };
  saveListenStatsState();
  if (emptyHomeActive) renderHomeDiscover();
  listenSession = {
    key: snap.key,
    song: snap,
    context: context || activeRadioContext || null,
    startedAt: Date.now(),
    lastWallAt: Date.now(),
    lastAudioTime: audio && isFinite(audio.currentTime) ? audio.currentTime : 0,
    listenMs: 0,
    maxProgress: 0,
  };
}
function updateListenStatsTick(force) {
  if (!audio || audio.paused) return;
  var song = currentCoverSong();
  if (!song) return;
  var key = queueItemKey(song);
  if (!listenSession || listenSession.key !== key) beginListenSession(song, activeRadioContext);
  if (!listenSession) return;
  if (!audio.duration) return;
  var now = Date.now();
  var audioTime = isFinite(audio.currentTime) ? audio.currentTime : 0;
  var deltaByAudio = Math.max(0, audioTime - (listenSession.lastAudioTime || 0)) * 1000;
  var deltaByWall = Math.max(0, now - (listenSession.lastWallAt || now));
  var delta = deltaByAudio > 0 ? Math.min(deltaByAudio, deltaByWall || deltaByAudio, 4200) : 0;
  if (force && delta <= 0) delta = Math.min(deltaByWall, 1500);
  if (delta > 0 && delta < 8000) listenSession.listenMs += delta;
  listenSession.lastWallAt = now;
  listenSession.lastAudioTime = audioTime;
  listenSession.maxProgress = Math.max(listenSession.maxProgress || 0, audio.duration ? audioTime / audio.duration : 0);
}
function finalizeListenSession(completed) {
  if (!listenSession) return;
  updateListenStatsTick(true);
  var session = listenSession;
  listenSession = null;
  var effective = completed || session.listenMs >= 45000 || session.maxProgress >= 0.5 || (!audio || !audio.duration ? session.listenMs >= 30000 : false);
  if (!effective) return;
  var now = Date.now();
  var snap = session.song || {};
  var record = {
    key: session.key,
    id: snap.id || '',
    mid: snap.mid || '',
    mediaMid: snap.mediaMid || '',
    type: snap.type || 'song',
    sourceKey: snap.sourceKey || '',
    name: snap.name || '未知歌曲',
    artist: snap.artist || '',
    cover: snap.cover || '',
    source: snap.source || '',
    playedAt: now,
    listenMs: Math.round(session.listenMs),
    completed: !!completed,
    context: session.context || null,
  };
  listenStatsState.recent = record;
  listenStatsState.history = [record].concat((listenStatsState.history || []).filter(function(item){ return item && item.key !== record.key; })).slice(0, 180);
  var songStat = listenStatsState.songs[record.key] || { key: record.key, name: record.name, artist: record.artist, cover: record.cover, source: record.source, plays: 0, listenMs: 0, completed: 0, lastPlayedAt: 0 };
  songStat.name = record.name;
  songStat.artist = record.artist;
  songStat.cover = record.cover || songStat.cover || '';
  songStat.source = record.source || songStat.source || '';
  songStat.plays += 1;
  songStat.listenMs += record.listenMs;
  songStat.completed += completed ? 1 : 0;
  songStat.lastPlayedAt = now;
  listenStatsState.songs[record.key] = songStat;
  String(record.artist || '').split(/\s*\/\s*|\s*,\s*|、|&/).forEach(function(name){
    name = name.trim();
    if (!name) return;
    var artistStat = listenStatsState.artists[name] || { name: name, plays: 0, listenMs: 0, lastPlayedAt: 0 };
    artistStat.plays += 1;
    artistStat.listenMs += record.listenMs;
    artistStat.lastPlayedAt = now;
    listenStatsState.artists[name] = artistStat;
  });
  saveListenStatsState();
  if (emptyHomeActive) renderHomeDiscover();
}
function mostPlayedSong() {
  var list = Object.keys(listenStatsState.songs || {}).map(function(key){ return listenStatsState.songs[key]; });
  list.sort(function(a, b){ return (b.plays - a.plays) || (b.listenMs - a.listenMs) || (b.lastPlayedAt - a.lastPlayedAt); });
  return list[0] || null;
}
function topListenArtist() {
  var list = Object.keys(listenStatsState.artists || {}).map(function(key){ return listenStatsState.artists[key]; });
  list.sort(function(a, b){ return (b.plays - a.plays) || (b.listenMs - a.listenMs) || (b.lastPlayedAt - a.lastPlayedAt); });
  return list[0] || null;
}
function homeListenSummary() {
  var recent = listenStatsState.recent || (listenStatsState.history || [])[0] || null;
  var topSong = mostPlayedSong();
  var topArtist = topListenArtist();
  var totalPlays = Object.keys(listenStatsState.songs || {}).reduce(function(sum, key){ return sum + ((listenStatsState.songs[key] && listenStatsState.songs[key].plays) || 0); }, 0);
  return { recent: recent, topSong: topSong, topArtist: topArtist, totalPlays: totalPlays };
}
function fallbackHomeTiles() {
  return [
    { kind: 'login', title: '登录同步歌单', sub: '网易云 / QQ 音乐' },
    { kind: 'search', title: '搜索一首歌', sub: '原唱优先', query: '' },
    { kind: 'local', title: '导入本地音乐', sub: '本地文件也能可视化' },
    { kind: 'podcastSearch', title: '搜索播客', sub: '长内容 / 电台' },
    { kind: 'guide', title: '看看视觉舞台', sub: '粒子 / 歌词 / 封面' },
  ];
}
function homeTileCover(item) {
  if (!item) return '';
  if (item.kind === 'song' || item.kind === 'weatherSong') return songCoverSrc(item.song, 220);
  return item.cover ? coverUrlWithSize(item.cover, 220) : '';
}
function homeToneForItem(item, index) {
  if (!item) return 'daily';
  if (item.kind === 'weatherSong') return 'daily';
  if (item.kind === 'recent') return 'search';
  if (item.kind === 'profile') return 'local';
  if (item.tone) return item.tone;
  if (item.kind === 'song') return index % 2 ? 'search' : 'daily';
  if (item.kind === 'playlist') return 'playlist';
  if (item.kind === 'podcast' || item.kind === 'podcastSearch') return 'podcast';
  if (item.kind === 'local') return 'local';
  if (item.kind === 'guide') return 'guide';
  if (item.kind === 'login') return 'library';
  if (item.kind === 'search') return 'search';
  return ['daily', 'playlist', 'local', 'guide', 'search'][index % 5];
}
function renderHomeMosaic(items) {
  var cells = document.querySelectorAll('#home-mosaic .home-mosaic-cell');
  if (!cells.length) return;
  var covers = [];
  (items || []).forEach(function(item){
    var cover = homeTileCover(item);
    if (cover) covers.push(cover);
  });
  for (var i = 0; i < cells.length; i++) {
    var src = covers[i] || covers[(i + 1) % Math.max(1, covers.length)] || '';
    cells[i].style.backgroundImage = src ? 'url("' + cssImageUrl(src) + '")' : '';
    cells[i].classList.toggle('has-cover', !!src);
    cells[i].classList.toggle('home-skeleton', !src && homeDiscoverState.loading);
  }
}
function renderHomeTiles() {
  var row = document.getElementById('home-tile-row');
  var title = document.getElementById('home-rail-title');
  var note = document.getElementById('home-rail-note');
  if (!row) return;
  var tiles = [];
  var loggedOutHome = !homeDiscoverState.loggedIn && !hasAnyPlatformLogin();
  var weatherSongs = homeWeatherRadioState.radio && homeWeatherRadioState.radio.songs || [];
  var summary = homeListenSummary();
  if (summary.recent && tiles.length < 5) {
    tiles.push({ kind: 'recent', title: summary.recent.name || '继续听', sub: summary.recent.artist || summary.recent.source || '', cover: summary.recent.cover, record: summary.recent });
  }
  if (summary.topArtist && tiles.length < 5) {
    tiles.push({ kind: 'profile', title: summary.topArtist.name, sub: '常听歌手 · ' + summary.topArtist.plays + ' 次', query: summary.topArtist.name });
  }
  if (!loggedOutHome) {
    homeDiscoverState.songs.slice(0, Math.max(0, 4 - tiles.length)).forEach(function(song, i){
      tiles.push({ kind: 'song', index: i, song: song, title: song.name || '今日歌曲', sub: song.artist || songSourceLabel(song) });
    });
    homeDiscoverState.playlists.slice(0, Math.max(0, 5 - tiles.length)).forEach(function(pl, i){
      tiles.push({ kind: 'playlist', index: i, title: pl.name || '推荐歌单', sub: (pl.trackCount ? pl.trackCount + ' 首' : 'Playlist') + (pl.playCount ? ' · ' + compactHomeCount(pl.playCount) + ' 播放' : ''), cover: pl.cover });
    });
    if (tiles.length < 5) {
      homeDiscoverState.podcasts.slice(0, 5 - tiles.length).forEach(function(p, i){
        tiles.push({ kind: 'podcast', index: i, title: p.name || '热门播客', sub: p.djName || p.category || 'Podcast', cover: p.cover });
      });
    }
  }
  if (tiles.length < 5) {
    weatherSongs.slice(0, 5 - tiles.length).forEach(function(song, i){
      tiles.push({ kind: 'weatherSong', index: i, song: song, title: song.name || '天气电台歌曲', sub: song.artist || songSourceLabel(song) });
    });
  }
  if (!tiles.length) tiles = fallbackHomeTiles();
  tiles = tiles.slice(0, 5);
  if (title) title.textContent = summary.recent ? '接着听' : (loggedOutHome ? '先从这里开始' : '你的歌单与推荐');
  if (note) {
    var liveNote = homeDiscoverState.updatedAt ? '刚刚更新 · 点击即可播放' : '点击即可播放';
    note.textContent = homeDiscoverState.loading ? '正在整理推荐' : (loggedOutHome && !weatherSongs.length ? '不会自动拉取外部推荐' : (homeDiscoverState.error ? '离线精选' : liveNote));
  }
  row.innerHTML = tiles.map(function(item, i){
    var cover = homeTileCover(item);
    var tone = homeToneForItem(item, i);
    var coverClass = 'home-tile-cover' + (cover ? ' has-cover' : '');
    return '<button class="home-tile' + (!cover && homeDiscoverState.loading ? ' home-skeleton' : '') + '" data-home-tone="' + escHtml(tone) + '" type="button" onclick="handleHomeTileClick(' + i + ')">' +
      '<div class="' + coverClass + '" style="' + (cover ? 'background-image:url(&quot;' + escHtml(cssImageUrl(cover)) + '&quot;)' : '') + '"></div>' +
      '<div class="home-tile-title">' + escHtml(item.title || '') + '</div>' +
      '<div class="home-tile-sub">' + escHtml(item.sub || '') + '</div>' +
    '</button>';
  }).join('');
  row._homeTiles = tiles;
  renderHomeMosaic(tiles);
}
function fallbackHomeHeroLyric() {
  return { text: '今日副歌正在整理，先让音乐把房间点亮。', song: '今日热门歌曲', artist: 'Mineradio' };
}
function homeHeroLyricCandidates() {
  var songs = (homeDiscoverState.songs || []).filter(function(song){
    return song && song.id && /^\d+$/.test(String(song.id)) && songSourceLabel(song) === '网易云音乐';
  }).map(function(song){
    return { id: song.id, name: song.name || '今日歌曲', artist: song.artist || songSourceLabel(song) };
  });
  return songs.concat(homeHeroLyricFallbackSongs).slice(0, 12);
}
function plainLyricLines(text) {
  return String(text || '').split(/\n+/).map(function(line){
    return line
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\([^)]*\d+[^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }).filter(function(line){
    return line && line.length > 1 && !/^(作词|作曲|编曲|制作|出品|发行|监制|录音|混音|母带|吉他|贝斯|鼓|和声|OP|SP)\b/i.test(line);
  });
}
function pickChorusLyric(lines) {
  lines = (lines || []).filter(Boolean);
  if (!lines.length) return '';
  var start = Math.max(0, Math.floor(lines.length * 0.45) - 1);
  var text = lines.slice(start, start + 3).join(' / ');
  return text.length > 90 ? text.slice(0, 88) + '...' : text;
}
function renderHomeHeroLyric() {
  var hero = document.querySelector('#empty-home .home-hero');
  var title = document.getElementById('home-weather-title');
  var kicker = document.getElementById('home-weather-kicker');
  var meta = document.getElementById('home-weather-meta');
  var note = document.querySelector('#empty-home .home-hero-empty-note');
  var lyric = homeHeroLyricState.lyric || fallbackHomeHeroLyric();
  if (hero) hero.classList.add('is-lyric-card');
  if (kicker) kicker.textContent = 'Today Chorus';
  if (title) title.textContent = '"' + (lyric.text || fallbackHomeHeroLyric().text) + '"';
  if (note) note.textContent = lyric.song ? ((lyric.song || '今日热门歌曲') + (lyric.artist ? ' · ' + lyric.artist : '')) : '从今日热门歌曲里挑一段副歌歌词。';
  if (meta) {
    var parts = [
      lyric.song || '今日热门歌曲',
      lyric.artist || '网易云音乐'
    ];
    meta.innerHTML = parts.map(function(text){ return '<span class="home-weather-pill">' + escHtml(text) + '</span>'; }).join('');
  }
}
async function loadHomeHeroLyric(force) {
  if (homeHeroLyricState.loading) return;
  if (homeHeroLyricState.loaded && !force) return;
  homeHeroLyricState.loading = true;
  homeHeroLyricState.error = '';
  renderHomeHeroLyric();
  var songs = homeHeroLyricCandidates().sort(function(){ return Math.random() - 0.5; });
  for (var i = 0; i < songs.length; i++) {
    try {
      var song = songs[i];
      var data = await apiJson('/api/lyric?id=' + encodeURIComponent(song.id) + '&t=' + Date.now(), { timeoutMs: 9000 });
      var text = pickChorusLyric(plainLyricLines(data && (data.lyric || data.yrc || '')));
      if (!text) continue;
      homeHeroLyricState.lyric = { text: text, song: song.name || '今日热门歌曲', artist: song.artist || '网易云音乐' };
      homeHeroLyricState.loaded = true;
      homeHeroLyricState.loading = false;
      renderHomeHeroLyric();
      return;
    } catch (e) {}
  }
  homeHeroLyricState.lyric = fallbackHomeHeroLyric();
  homeHeroLyricState.loaded = true;
  homeHeroLyricState.loading = false;
  homeHeroLyricState.error = 'LYRIC_FAILED';
  renderHomeHeroLyric();
}
function applyHomeHeroBackground() {
  var hero = document.querySelector('#empty-home .home-hero');
  if (!hero) return;
  var bg = '';
  try { bg = localStorage.getItem(HOME_HERO_BG_KEY) || ''; } catch (e) {}
  hero.style.setProperty('--home-hero-bg', bg ? 'url("' + cssImageUrl(bg) + '")' : '');
  hero.classList.toggle('has-custom-bg', !!bg);
}
function pickHomeHeroBackground() {
  var input = document.getElementById('home-hero-bg-input');
  if (input) input.click();
}
function setHomeCardButton(cardId, label, action) {
  var title = document.getElementById(cardId);
  var card = title && title.closest ? title.closest('.home-card') : null;
  if (!card) return;
  var labelEl = card.querySelector('.home-card-label');
  if (labelEl) labelEl.textContent = label;
  card.onclick = action;
}
function applyHomeCardActions() {
  setHomeCardButton('home-weather-card-title', '我喜欢', openHomeLikedPanel);
  setHomeCardButton('home-daily-title', '今日推荐', playHomeDaily);
  setHomeCardButton('home-private-title', '上次听到', function(){ playHomeRecent(); });
  setHomeCardButton('home-continue-title', '热门歌单', function(){ openHomePlaylist(0); });
  setHomeCardButton('home-profile-title', '我的播客', openHomePodcastList);
  setHomeCardButton('home-library-title', '我的歌单', openHomeLibrary);
}
function renderHomeDiscover() {
  var sub = document.getElementById('home-subtitle');
  var loggedOutHome = !homeDiscoverState.loggedIn && !hasAnyPlatformLogin();
  applyHomeCardActions();
  renderHomeHeroLyric();
  if (sub) {
    if (loggedOutHome) sub.textContent = '登录后会把你的歌单、常听歌手和最近播放放在这里；也可以直接搜索或导入本地音乐。';
    else sub.textContent = '从你的歌单、最近播放和常听歌手开始，左侧会随机放一段今日热门副歌。';
  }
  var daily = homeDiscoverState.songs[0] || null;
  var playlistItem = homeDiscoverState.playlists[0] || null;
  var podcastItem = homeDiscoverState.podcasts[0] || null;
  var summary = homeListenSummary();
  var weatherCardTitle = document.getElementById('home-weather-card-title');
  var weatherCardSub = document.getElementById('home-weather-card-sub');
  var dailyTitle = document.getElementById('home-daily-title');
  var dailySub = document.getElementById('home-daily-sub');
  var privateTitle = document.getElementById('home-private-title');
  var privateSub = document.getElementById('home-private-sub');
  var continueTitle = document.getElementById('home-continue-title');
  var continueSub = document.getElementById('home-continue-sub');
  var profileTitle = document.getElementById('home-profile-title');
  var profileSub = document.getElementById('home-profile-sub');
  var libTitle = document.getElementById('home-library-title');
  var libSub = document.getElementById('home-library-sub');
  if (weatherCardTitle) weatherCardTitle.textContent = '我喜欢';
  if (weatherCardSub) {
    weatherCardSub.textContent = '网易云 / QQ / 酷狗红心歌单';
  }
  if (continueTitle) continueTitle.textContent = playlistItem ? playlistItem.name : '热门歌单';
  if (continueSub) continueSub.textContent = playlistItem ? (((playlistItem.trackCount || 0) ? playlistItem.trackCount + ' 首 · ' : '') + (playlistItem.creator || '点击播放歌单')) : '打开今日热门歌单';
  if (profileTitle) profileTitle.textContent = podcastItem ? podcastItem.name : '我的播客';
  if (profileSub) profileSub.textContent = podcastItem ? (podcastItem.creator || podcastItem.sub || '打开播客列表') : '打开播放列表里的我的播客';
  if (loggedOutHome) {
    if (dailyTitle) dailyTitle.textContent = '每日推荐';
    if (dailySub) dailySub.textContent = '登录后同步你的今日歌曲';
    if (privateTitle) privateTitle.textContent = summary.recent ? summary.recent.name : '上次听到';
    if (privateSub) privateSub.textContent = summary.recent ? (summary.recent.artist || '最近播放') : '最近播放会出现在这里';
    if (continueTitle) continueTitle.textContent = '热门歌单';
    if (continueSub) continueSub.textContent = '登录后同步推荐歌单';
    if (libTitle) libTitle.textContent = '我的歌单';
    if (libSub) libSub.textContent = '打开左侧歌单库';
    setHomeArt('home-weather-art', '', 280);
    setHomeArt('home-daily-art', '', 280);
    setHomeArt('home-private-art', '', 280);
    setHomeArt('home-continue-art', summary.recent && summary.recent.cover, 280);
    setHomeArt('home-profile-art', summary.topSong && summary.topSong.cover || summary.recent && summary.recent.cover, 280);
    setHomeArt('home-library-art', '', 280);
  } else {
    if (dailyTitle) dailyTitle.textContent = daily ? daily.name : '每日推荐';
    if (dailySub) dailySub.textContent = daily ? ((daily.artist || songSourceLabel(daily) || '今日歌曲') + ' · 点击播放今日队列') : '同步你的今日歌曲';
    if (privateTitle) privateTitle.textContent = summary.recent ? summary.recent.name : '上次听到';
    if (privateSub) privateSub.textContent = summary.recent ? (summary.recent.artist || summary.recent.source || '最近播放') : '最近播放会出现在这里';
    if (libTitle) libTitle.textContent = '我的歌单';
    if (libSub) libSub.textContent = userPlaylists.length ? (userPlaylists.length + ' 个歌单 · 打开左侧列表') : '打开左侧歌单库';
    setHomeArt('home-weather-art', (userPlaylists[0] && userPlaylists[0].cover) || (playlistItem && playlistItem.cover) || daily && daily.cover, 280);
    setHomeArt('home-daily-art', daily && daily.cover, 280);
    setHomeArt('home-private-art', summary.recent && summary.recent.cover || daily && daily.cover || playlistItem && playlistItem.cover, 280);
    setHomeArt('home-continue-art', playlistItem && playlistItem.cover || summary.recent && summary.recent.cover, 280);
    setHomeArt('home-profile-art', podcastItem && podcastItem.cover || summary.topSong && summary.topSong.cover, 280);
    setHomeArt('home-library-art', (userPlaylists[0] && userPlaylists[0].cover) || summary.topSong && summary.topSong.cover || summary.recent && summary.recent.cover || podcastItem && podcastItem.cover, 280);
  }
  renderHomeTiles();
}
async function loadHomeDiscover(force) {
  if (homeDiscoverState.loading) return;
  if (homeDiscoverState.loaded && !force) return;
  var token = ++homeDiscoverToken;
  homeDiscoverState.loading = true;
  homeDiscoverState.error = '';
  renderHomeDiscover();
  try {
    var data = await apiJson('/api/discover/home?t=' + Date.now());
    if (token !== homeDiscoverToken) return;
    homeDiscoverState.loggedIn = !!(data && data.loggedIn);
    homeDiscoverState.mode = data && data.mode || (homeDiscoverState.loggedIn ? 'member' : 'starter');
    homeDiscoverState.songs = homeDiscoverState.loggedIn ? (data && data.dailySongs || []).map(cloneSong) : [];
    homeDiscoverState.playlists = homeDiscoverState.loggedIn ? (data && data.playlists || []) : [];
    homeDiscoverState.podcasts = homeDiscoverState.loggedIn ? (data && data.podcasts || []) : [];
    homeDiscoverState.updatedAt = Number(data && data.updatedAt) || Date.now();
    homeDiscoverState.loaded = true;
  } catch (e) {
    console.warn('home discover failed:', e);
    if (token === homeDiscoverToken) homeDiscoverState.error = 'DISCOVER_FAILED';
  } finally {
    if (token === homeDiscoverToken) {
      homeDiscoverState.loading = false;
      renderHomeDiscover();
      if (emptyHomeActive) loadHomeHeroLyric(true);
    }
  }
}
function homeWeatherRadioUrl(opts) {
  opts = opts || {};
  var params = [];
  if (opts.lat != null && opts.lon != null) {
    params.push('lat=' + encodeURIComponent(opts.lat));
    params.push('lon=' + encodeURIComponent(opts.lon));
    params.push('city=' + encodeURIComponent(opts.city || '当前位置'));
  } else {
    params.push('city=' + encodeURIComponent(opts.city || homeWeatherRadioState.city || '上海'));
  }
  params.push('timezone=' + encodeURIComponent(opts.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto'));
  params.push('t=' + Date.now());
  return '/api/weather/radio?' + params.join('&');
}
async function loadHomeWeatherRadio(force, opts) {
  opts = opts || {};
  if (homeWeatherRadioState.loading && homeWeatherLoadPromise && opts.lat == null && opts.lon == null && !opts.city) {
    return homeWeatherLoadPromise;
  }
  if (homeWeatherRadioState.loading && !force) return homeWeatherRadioState;
  if (homeWeatherRadioState.loaded && !force && !opts.lat) return homeWeatherRadioState;
  var token = ++homeWeatherToken;
  homeWeatherRadioState.loading = true;
  homeWeatherRadioState.error = '';
  renderHomeDiscover();
  var loadPromise = (async function(){
    try {
      var data = await apiJson(homeWeatherRadioUrl(opts), { timeoutMs: 14000 });
      if (token !== homeWeatherToken) return homeWeatherRadioState;
      homeWeatherRadioState.weather = data && data.weather || null;
      homeWeatherRadioState.radio = data && data.radio || null;
      homeWeatherRadioState.loaded = true;
      homeWeatherRadioState.updatedAt = Date.now();
      if (homeWeatherRadioState.weather && homeWeatherRadioState.weather.location && homeWeatherRadioState.weather.location.name) {
        homeWeatherRadioState.city = homeWeatherRadioState.weather.location.name;
        localStorage.setItem(HOME_WEATHER_CITY_KEY, homeWeatherRadioState.city);
      } else if (opts.city) {
        homeWeatherRadioState.city = opts.city;
        localStorage.setItem(HOME_WEATHER_CITY_KEY, homeWeatherRadioState.city);
      }
    } catch (e) {
      console.warn('weather radio failed:', e);
      if (token === homeWeatherToken) homeWeatherRadioState.error = 'WEATHER_FAILED';
    } finally {
      if (token === homeWeatherToken) {
        homeWeatherRadioState.loading = false;
        renderHomeDiscover();
      }
    }
    return homeWeatherRadioState;
  })();
  homeWeatherLoadPromise = loadPromise;
  try {
    return await loadPromise;
  } finally {
    if (homeWeatherLoadPromise === loadPromise) homeWeatherLoadPromise = null;
  }
}
function scheduleHomeWeatherLoad(delay) {
  if (homeWeatherLoadTimer) return;
  homeWeatherLoadTimer = setTimeout(function(){
    homeWeatherLoadTimer = null;
    if (!emptyHomeActive) return;
    loadHomeWeatherRadio(false);
  }, delay || 760);
}
function weatherRadioContext() {
  var weather = homeWeatherRadioState.weather || {};
  var radio = homeWeatherRadioState.radio || {};
  return {
    type: 'weather-radio',
    provider: 'open-meteo',
    title: radio.title || '天气电台',
    location: weather.location && weather.location.name || homeWeatherRadioState.city || '',
    weather: weather.label || '',
    temperature: weather.temperature,
    mood: weather.mood && weather.mood.key || '',
  };
}
async function startWeatherRadio(opts) {
  opts = opts || {};
  if (weatherRadioStartBusy) return;
  weatherRadioStartBusy = true;
  try {
  if (!homeWeatherRadioState.loaded || !(homeWeatherRadioState.radio && homeWeatherRadioState.radio.songs && homeWeatherRadioState.radio.songs.length)) {
    showToast('正在生成天气电台');
    await loadHomeWeatherRadio(true);
  }
  var radio = homeWeatherRadioState.radio;
  if (!radio || !radio.songs || !radio.songs.length) {
    var seed = radio && radio.seedQueries && radio.seedQueries[0] || '雨天 R&B';
    showToast('天气队列暂时为空，先打开搜索');
    runHomeSearch(seed);
    return;
  }
  activeRadioContext = weatherRadioContext();
  playQueue = radio.songs.map(function(song){
    var cloned = cloneSong(song);
    cloned.radioContext = activeRadioContext;
    return cloned;
  });
  currentIdx = 0;
  homeForcedOpen = false;
  if (!opts.preserveHomeState) homeSuppressed = false;
  setHomeControlsLocked(false);
  safeRenderQueuePanel('weather-radio-start');
  safeShelfRebuild('weather-radio-start', true);
  forcePlaybackControlsInteractive();
  try {
    await playQueueAt(0, { context: activeRadioContext });
  } catch (e) {
    console.warn('[WeatherRadioStartPlay]', e);
    showToast('天气电台已载入，播放启动失败');
  }
  forcePlaybackControlsInteractive();
  showToast((radio.title || '天气电台') + ' · ' + playQueue.length + ' 首');
  } finally {
    weatherRadioStartBusy = false;
  }
}
var emptyHomeStartEl = document.getElementById('empty-home');
if (emptyHomeStartEl) {
  emptyHomeStartEl.addEventListener('click', function(e){
    var start = e.target && e.target.closest ? e.target.closest('[data-home-radio-start]') : null;
    if (!start || !emptyHomeStartEl.contains(start)) return;
    e.preventDefault();
    e.stopPropagation();
    startWeatherRadio();
  }, true);
}
function locateWeatherRadio() {
  var previousWeatherCity = homeWeatherRadioState.city || '上海';
  homeWeatherToken++;
  homeWeatherRadioState.loading = true;
  homeWeatherRadioState.loaded = false;
  homeWeatherRadioState.error = '';
  homeWeatherRadioState.weather = null;
  homeWeatherRadioState.radio = null;
  homeWeatherRadioState.city = '定位中';
  renderHomeDiscover();
  var locationSettled = false;
  var ipFallbackStarted = false;
  function useIpFallback() {
    if (locationSettled || ipFallbackStarted) return;
    ipFallbackStarted = true;
    apiJson('/api/weather/ip-location?t=' + Date.now()).then(function(data){
      var loc = data && data.location;
      if (!loc || !isFinite(Number(loc.latitude)) || !isFinite(Number(loc.longitude))) throw new Error(data && data.error || 'IP_LOCATION_FAILED');
      if (locationSettled) return;
      locationSettled = true;
      homeWeatherRadioState.city = loc.city || '当前位置';
      localStorage.setItem(HOME_WEATHER_CITY_KEY, homeWeatherRadioState.city);
      renderHomeDiscover();
      showToast('已用网络位置定位到 ' + (loc.city || '当前位置'));
      loadHomeWeatherRadio(true, {
        lat: loc.latitude,
        lon: loc.longitude,
        city: loc.city || '当前位置',
        timezone: loc.timezone || '',
      });
    }).catch(function(e){
      console.warn('weather ip location failed:', e);
      if (locationSettled) return;
      homeWeatherRadioState.loading = false;
      homeWeatherRadioState.error = 'LOCATION_FAILED';
      homeWeatherRadioState.city = previousWeatherCity;
      renderHomeDiscover();
      showToast('定位不可用，可以手动换城市');
    });
  }
  // Desktop users need a stable city label; browser coordinates can be stale or cityless.
  useIpFallback();
}
function changeWeatherCity() {
  var city = window.prompt('输入城市名', homeWeatherRadioState.city || '上海');
  city = String(city || '').trim();
  if (!city) return;
  homeWeatherRadioState.city = city;
  localStorage.setItem(HOME_WEATHER_CITY_KEY, city);
  homeWeatherRadioState.loaded = false;
  loadHomeWeatherRadio(true, { city: city });
}
function shouldShowEmptyHomeCore(ignoreSplash) {
  if (!ignoreSplash && document.body.classList.contains('splash-active')) return false;
  if (immersiveMode) return false;
  if (homeForcedOpen) return true;
  if (homeSuppressed) return false;
  if (shelfPinnedOpen) return false;
  if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return false;
  if (playQueue && playQueue.length) return false;
  if (currentIdx >= 0 && playQueue[currentIdx]) return false;
  if (playing) return false;
  return true;
}
function shouldShowEmptyHome() {
  return shouldShowEmptyHomeCore(false);
}
function shouldShowEmptyHomeAfterSplash() {
  return shouldShowEmptyHomeCore(true);
}
function shouldForceEmptyHomeAfterSplash() {
  if (immersiveMode) return false;
  if (shelfPinnedOpen) return false;
  if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return false;
  if (playQueue && playQueue.length) return false;
  if (currentIdx >= 0 && playQueue[currentIdx]) return false;
  if (playing) return false;
  return true;
}
function shouldUseIdleWallpaperPreview(ignoreSplash) {
  if (!ignoreSplash && document.body.classList.contains('splash-active')) return false;
  if (immersiveMode || playing || (audio && !audio.paused)) return false;
  if (shelfPinnedOpen) return false;
  if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) return false;
  return true;
}
function setHomeControlsLocked(locked) {
  document.body.classList.toggle('home-controls-locked', !!locked);
  var bottom = document.getElementById('bottom-bar');
  if (bottom && locked && !hasActivePlaybackControls()) bottom.classList.add('soft-hidden');
  if (bottom && !locked) bottom.classList.remove('soft-hidden');
  if (locked) closeMiniQueue();
}
function openHomePlayerConsole() {
  setHomeControlsLocked(false);
  var bar = document.getElementById('bottom-bar');
  if (bar) {
    bar.classList.add('visible');
    bar.classList.remove('soft-hidden');
    bar.style.pointerEvents = '';
  }
  wakeBottomHandle(2800);
  setControlsHidden(false);
  forcePlaybackControlsInteractive();
  updateControlsChromeState();
  if (controlsAutoHide) scheduleControlsHide(1800);
  showToast('播放器控制台已展开');
}
function ensureHomeWallpaperParticles(opts) {
  opts = opts || {};
  if (uniforms && uniforms.uAlpha && opts.instant) {
    uniforms.uAlpha.value = 0.96;
  } else if (uniforms && uniforms.uAlpha && uniforms.uAlpha.value < 0.88) {
    tweenParticleAlpha(uniforms.uAlpha.value || 0, 0.96, 920);
  }
  if (uniforms && uniforms.uFloatAlpha) uniforms.uFloatAlpha.value = 0;
  if (floatGroup) destroyFloatLayer();
}
function activateHomeWallpaperPreview(opts) {
  opts = opts || {};
  document.body.classList.add('home-wallpaper-preview');
  ensureHomeWallpaperParticles(opts);
}
var homeWallpaperPrewarmStarted = false;
function prewarmHomeWallpaperPreview() {
  if (homeWallpaperPrewarmStarted) return;
  homeWallpaperPrewarmStarted = true;
  if (!shouldUseIdleWallpaperPreview(true)) return;
  scheduleVisualApply(function(){
    if (!shouldUseIdleWallpaperPreview(true)) return;
    activateHomeWallpaperPreview({ skipTransition: true, instant: true });
  }, 900, 2600);
}
function deactivateHomeWallpaperPreview(playback) {
  document.body.classList.remove('home-wallpaper-preview');
  if (!homeVisualPresetActive) return;
  homeVisualPresetActive = false;
  var nextPreset = typeof homeVisualPrevPreset === 'number' ? homeVisualPrevPreset : (fx && typeof fx.preset === 'number' ? fx.preset : 0);
  if (typeof setPreset === 'function' && fx.preset !== nextPreset) {
    setPreset(nextPreset, { silent: true, preserveCamera: false, skipTransition: false, noSave: true });
  }
}
function switchPlaybackVisualToEmily() {
  if (homeVisualPresetActive) {
    deactivateHomeWallpaperPreview(true);
    return;
  }
  document.body.classList.remove('home-wallpaper-preview');
  var targetPreset = typeof playbackVisualPreset === 'number' ? playbackVisualPreset : fxDefaults.preset;
  startupVisualPreviewActive = false;
  if (typeof setPreset === 'function' && fx.preset !== targetPreset) {
    setPreset(targetPreset, { silent: true, preserveCamera: false, noSave: true });
  } else if (typeof syncFxUniforms === 'function') {
    syncFxUniforms();
  }
}
function applyStartupStarfieldPreset() {
  if (playing || currentIdx >= 0) return;
  startupVisualPreviewActive = true;
  if (typeof setPreset === 'function' && fx.preset !== 5) {
    setPreset(5, { silent: true, preserveCamera: false, skipTransition: true, noSave: true });
  } else if (typeof syncFxUniforms === 'function') {
    syncFxUniforms();
  }
}
function updateEmptyHomeVisibility(opts) {
  opts = opts || {};
  var show = shouldShowEmptyHome();
  emptyHomeActive = show;
  document.body.classList.toggle('empty-home-active', show);
  if (!show) setHomeControlsLocked(false);
  if (show) activateHomeWallpaperPreview();
  else deactivateHomeWallpaperPreview(false);
  if (show) {
    setPeek(document.getElementById('search-area'), true, 'search');
    applyHomeHeroBackground();
    renderHomeDiscover();
    loadHomeHeroLyric(!!opts.forceLoad);
    if (!hasAnyPlatformLogin()) {
      homeDiscoverState.loading = false;
      homeDiscoverState.loaded = true;
      homeDiscoverState.loggedIn = false;
      homeDiscoverState.mode = 'starter';
      homeDiscoverState.songs = [];
      homeDiscoverState.playlists = [];
      homeDiscoverState.podcasts = [];
      renderHomeDiscover();
    } else {
      renderHomeDiscover();
      scheduleVisualApply(function(){ loadHomeDiscover(!!opts.forceLoad); }, 220, 1200);
    }
  }
  return show;
}
function runHomeSearch(query, mode) {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  updateEmptyHomeVisibility();
  if (mode) setSearchMode(mode);
  else if (searchMode === 'podcast') setSearchMode('song');
  var q = String(query || '').trim();
  var area = document.getElementById('search-area');
  if (area) setPeek(area, true, 'search');
  if ($input) {
    $input.value = q;
    $input.focus();
  }
  if (q) doSearch(q);
  else if (searchMode === 'podcast') loadPodcastHot();
  else renderSearchHistory();
}
function skipLoginAndFocusSearch() {
  closeLoginModal();
  setTimeout(function(){ runHomeSearch(''); }, 180);
}
function openHomeLocalImport() {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  updateEmptyHomeVisibility();
  var input = document.getElementById('file-input');
  if (input) input.click();
}
function openHomeProductGuide() {
  closeLoginModal();
  setTimeout(function(){ startVisualGuide({ manual: true, source: 'home' }); }, 160);
}
async function waitForHomeDiscoverIdle(timeout) {
  var started = Date.now();
  while (homeDiscoverState.loading && Date.now() - started < (timeout || 2200)) {
    await new Promise(function(resolve){ setTimeout(resolve, 80); });
  }
}
async function playHomeDaily() {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    showLoginModal({ source: 'home-daily' });
    return;
  }
  await waitForHomeDiscoverIdle();
  if (!homeDiscoverState.loaded || (!homeDiscoverState.songs.length && !homeDiscoverState.loading)) {
    await loadHomeDiscover(true);
  }
  if (!homeDiscoverState.songs.length) {
    runHomeSearch('每日推荐');
    return;
  }
  playQueue = homeDiscoverState.songs.map(cloneSong);
  currentIdx = 0;
  safeRenderQueuePanel('home-daily');
  safeShelfRebuild('home-daily', true);
  forcePlaybackControlsInteractive();
  playQueueAt(0).catch(function(e){ console.warn('[HomeDailyPlay]', e); });
}
async function playHomePrivateRadio() {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    showLoginModal({ source: 'home-private' });
    return;
  }
  await waitForHomeDiscoverIdle();
  if (!homeDiscoverState.loaded || ((!homeDiscoverState.playlists.length && !homeDiscoverState.songs.length) && !homeDiscoverState.loading)) {
    await loadHomeDiscover(true);
  }
  if (homeDiscoverState.songs.length) {
    playQueue = homeDiscoverState.songs.map(cloneSong);
    currentIdx = 0;
    safeRenderQueuePanel('home-private-radio');
    safeShelfRebuild('home-private-radio', true);
    forcePlaybackControlsInteractive();
    playQueueAt(0).catch(function(e){ console.warn('[HomePrivatePlay]', e); });
    return;
  }
  var item = homeDiscoverState.playlists[0];
  if (item && item.id) {
    await loadPlaylistIntoQueueById(item.id, true, item.name || '私人雷达');
    return;
  }
  openHomeLibrary();
}
function playHomeSong(index) {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  var song = homeDiscoverState.songs[index];
  if (!song) {
    if (index > 0) playHomePrivateRadio();
    else playHomeDaily();
    return;
  }
  playQueue = homeDiscoverState.songs.map(cloneSong);
  currentIdx = Math.max(0, Math.min(playQueue.length - 1, index));
  safeRenderQueuePanel('home-song-card');
  safeShelfRebuild('home-song-card', true);
  forcePlaybackControlsInteractive();
  playQueueAt(currentIdx).catch(function(e){ console.warn('[HomeSongPlay]', e); });
}
function openHomePlaylist(index) {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    runHomeSearch('');
    return;
  }
  openPlaylistPanelTab('playlists', true);
  var item = homeDiscoverState.playlists[index];
  if (!item || !item.id) {
    openHomeLibrary();
    return;
  }
  loadPlaylistIntoQueueById(item.id, true, item.name || '');
}
function openHomePodcast(index) {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  openPlaylistPanelTab('podcasts', true);
  var item = homeDiscoverState.podcasts[index];
  if (!item || !item.id) {
    setSearchMode('podcast');
    loadPodcastHot();
    return;
  }
  loadPodcastRadioIntoQueue(item.id, true, item.name || '');
}
function openHomeLikedPanel() {
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    openHomeProductGuide();
    return;
  }
  homeSuppressed = false;
  setHomeControlsLocked(false);
  if (typeof openLikedPlaylistPanel === 'function') openLikedPlaylistPanel();
  else openHomeLibrary();
}
async function openHomePodcastList() {
  homeForcedOpen = false;
  homeSuppressed = false;
  setHomeControlsLocked(false);
  openPlaylistPanelTab('podcasts', true);
  await refreshUserPlaylists(true);
  var item = homeDiscoverState.podcasts[0];
  if (item && item.id) {
    loadPodcastRadioIntoQueue(item.id, true, item.name || '');
    return;
  }
  var collection = myPodcastCollections && myPodcastCollections[0];
  if (collection && collection.key) openMyPodcastCollection(collection.key, collection.title || '');
}
function openHomeThirdCard() {
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    openHomeLocalImport();
    return;
  }
  openHomePodcast(0);
}
function openHomeLibrary() {
  if (!hasAnyPlatformLogin() && !homeDiscoverState.loggedIn) {
    openHomeProductGuide();
    return;
  }
  homeSuppressed = false;
  setHomeControlsLocked(false);
  openPlaylistPanelTab('playlists', true);
  refreshUserPlaylists(true);
}
function goHome() {
  if (homeForcedOpen || emptyHomeActive) {
    dismissHomePage({ toast: true });
    showToast('已关闭 Home');
    return;
  }
  homeSuppressed = false;
  homeForcedOpen = true;
  setHomeControlsLocked(true);
  if (shelfManager && shelfManager.hasOpenContent && shelfManager.hasOpenContent()) safeShelfCloseContent('open-empty-home');
  if (typeof setShelfPinnedOpen === 'function') setShelfPinnedOpen(false, true);
  togglePlaylistPanel(false);
  setPeek(document.getElementById('playlist-panel'), false, 'pl');
  setPeek(document.getElementById('fx-panel'), false, 'fx');
  setPeek(document.getElementById('search-area'), true, 'search');
  if (typeof setFocusZone === 'function') setFocusZone(null, true);
  if (orbit && orbit.focus) orbit.focus.active = false;
  updateEmptyHomeVisibility({ forceLoad: true });
  showToast('已回到 Home');
}
function dismissHomePage(opts) {
  opts = opts || {};
  homeForcedOpen = false;
  homeSuppressed = true;
  setHomeControlsLocked(false);
  updateEmptyHomeVisibility({ forceLoad: false });
  setPeek(document.getElementById('search-area'), false, 'search');
  if (typeof setFocusZone === 'function') setFocusZone(null, true);
}
function songFromListenRecord(record) {
  if (!record) return null;
  var provider = record.sourceKey || '';
  if (!provider && record.type === 'qq') provider = 'qq';
  if (!provider) provider = record.mid ? 'qq' : 'netease';
  return {
    provider: provider,
    source: provider,
    type: record.type || (provider === 'qq' ? 'qq' : 'song'),
    id: record.id || record.mid || record.key || '',
    mid: record.mid || '',
    songmid: record.mid || '',
    mediaMid: record.mediaMid || '',
    name: record.name || '继续听',
    artist: record.artist || '',
    cover: record.cover || '',
  };
}
async function playHomeRecent(record) {
  record = record || homeListenSummary().recent;
  if (!record) {
    showToast('还没有听歌记录');
    return;
  }
  var song = songFromListenRecord(record);
  if (!song || (!song.id && !song.mid)) {
    runHomeSearch(record.name || '');
    return;
  }
  activeRadioContext = null;
  playQueue = [cloneSong(song)];
  currentIdx = 0;
  safeRenderQueuePanel('home-recent-song');
  safeShelfRebuild('home-recent-song', true);
  forcePlaybackControlsInteractive();
  await playQueueAt(0);
}
function openHomeInsight() {
  var summary = homeListenSummary();
  if (summary.topArtist && summary.topArtist.name) {
    runHomeSearch(summary.topArtist.name);
    return;
  }
  if (summary.topSong && summary.topSong.name) {
    runHomeSearch(summary.topSong.name);
    return;
  }
  showToast('播放几首歌后会生成听歌画像');
}
async function playWeatherSong(index) {
  var radio = homeWeatherRadioState.radio;
  var songs = radio && radio.songs || [];
  if (!songs[index]) {
    startWeatherRadio();
    return;
  }
  activeRadioContext = weatherRadioContext();
  playQueue = songs.map(function(song){
    var cloned = cloneSong(song);
    cloned.radioContext = activeRadioContext;
    return cloned;
  });
  currentIdx = index;
  safeRenderQueuePanel('weather-radio-song');
  safeShelfRebuild('weather-radio-song', true);
  forcePlaybackControlsInteractive();
  await playQueueAt(index, { context: activeRadioContext });
}
function handleHomeTileClick(index) {
  var row = document.getElementById('home-tile-row');
  var item = row && row._homeTiles && row._homeTiles[index];
  if (!item) return;
  if (item.kind === 'weatherSong') playWeatherSong(item.index);
  else if (item.kind === 'recent') playHomeRecent(item.record);
  else if (item.kind === 'profile') openHomeInsight();
  else if (item.kind === 'song') playHomeSong(item.index);
  else if (item.kind === 'login') showLoginModal({ source: 'home-tile' });
  else if (item.kind === 'local') openHomeLocalImport();
  else if (item.kind === 'guide') openHomeProductGuide();
  else if (item.kind === 'playlist') openHomePlaylist(item.index);
  else if (item.kind === 'podcast') openHomePodcast(item.index);
  else if (item.kind === 'podcastSearch') { setSearchMode('podcast'); loadPodcastHot(); }
  else if (item.kind === 'library') openHomeLibrary();
  else runHomeSearch(item.query || item.title || '');
}
