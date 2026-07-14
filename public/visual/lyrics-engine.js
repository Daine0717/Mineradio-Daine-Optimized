// ============================================================
//  歌词
// ============================================================
async function fetchLyric(songOrId, token) {
  try {
    var song = (songOrId && typeof songOrId === 'object') ? songOrId : null;
    var provider = songProviderKey(song);
    var endpoint;
    if (provider === 'qq') {
      var mid = song.mid || song.songmid || song.id || '';
      var qqId = song.qqId || (/^\d+$/.test(String(song.id || '')) ? song.id : '');
      endpoint = '/api/qq/lyric?mid=' + encodeURIComponent(mid) + '&id=' + encodeURIComponent(qqId);
    } else if (provider === 'kugou') {
      var hash = song.hash || song.id || '';
      endpoint = '/api/kugou/lyric?hash=' + encodeURIComponent(hash) + '&duration=' + encodeURIComponent(song.duration || song.timelength || '');
    } else {
      var songId = song ? song.id : songOrId;
      endpoint = '/api/lyric?id=' + encodeURIComponent(songId);
    }
    var r = await apiJson(endpoint);
    if (token !== trackSwitchToken) return;
    var nativeLines = parseYrcText(r.yrc || '');
    var lrcLines = parseLyricText(r.lyric || '');
    var hasNativeKaraoke = nativeLines.some(function(line){ return line.words && line.words.length; });
    var timingSource = hasNativeKaraoke ? 'yrc-word' : (nativeLines.length ? 'yrc-line' : (lrcLines.length ? 'lrc-line' : 'fallback'));
    var lines = withLyricFallback(nativeLines.length ? nativeLines : lrcLines);
    if (lines.length && lines[0].fallback) timingSource = 'fallback';
    setOriginalLyricsState(lines, hasNativeKaraoke, timingSource);
    applyPreferredLyricsForCurrent(true);
  } catch (e) {
    if (token !== trackSwitchToken) return;
    var fallbackLines = withLyricFallback([]);
    setOriginalLyricsState(fallbackLines, false, 'fallback');
    applyPreferredLyricsForCurrent(true);
  }
}
function currentLyricFallbackText() {
  var song = currentLyricSong() || {};
  var title = (song.name || document.getElementById('thumb-title').textContent || '').trim();
  var artist = (song.artist || document.getElementById('thumb-artist').textContent || '').trim();
  if (!title) return '';
  return artist ? title + ' - ' + artist : title;
}
function isNoLyricText(text) {
  var compact = String(text || '').replace(/\s+/g, '').replace(/[，,。.!！?？、~～]/g, '');
  return !compact ||
    compact === '纯音乐请欣赏' ||
    compact === '暂无歌词' ||
    compact === '暂无歌词敬请期待' ||
    compact === '此歌曲为没有填词的纯音乐请您欣赏';
}
function withLyricFallback(lines) {
  lines = Array.isArray(lines) ? lines.filter(function(line){ return line && String(line.text || '').trim(); }) : [];
  if (lines.length && !lines.every(function(line){ return isNoLyricText(line.text); })) return lines;
  var text = currentLyricFallbackText();
  return text ? [{ t:0, text:text, duration:9999, charCount:Math.max(1, text.length), fallback:true }] : [];
}
function lyricTagTimeToSeconds(min, sec, frac) {
  var t = (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
  if (frac) t += (parseInt(frac, 10) || 0) / Math.pow(10, Math.min(3, frac.length));
  return t;
}
function finalizeLyricLineDurations(lines) {
  lines.sort(function(a, b){ return a.t - b.t; });
  for (var i = 0; i < lines.length; i++) {
    var next = lines[i + 1];
    var inferred = next && next.t > lines[i].t ? next.t - lines[i].t : 4.8;
    if (!isFinite(lines[i].duration) || lines[i].duration <= 0) lines[i].duration = inferred;
    lines[i].duration = Math.max(0.45, Math.min(12, lines[i].duration));
    lines[i].charCount = Math.max(1, lines[i].charCount || String(lines[i].text || '').length);
  }
  return lines;
}
function parseLyricText(text) {
  var lines = [], reg = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;
  text.split(/\r?\n/).forEach(function(line){
    var times = [], m;
    reg.lastIndex = 0;
    while ((m = reg.exec(line))) times.push(lyricTagTimeToSeconds(m[1], m[2], m[3]));
    if (!times.length) return;
    var txt = line.replace(reg, '').trim();
    if (!txt) return;
    times.forEach(function(t){ lines.push({ t: t, text: txt, source:'lrc' }); });
  });
  return finalizeLyricLineDurations(lines);
}
function parseYrcText(text) {
  var lines = [];
  String(text || '').split(/\r?\n/).forEach(function(line){
    var m = line.match(/^\[(\d+),(\d+)\](.*)$/);
    if (!m) return;
    var lineStartMs = parseInt(m[1], 10) || 0;
    var lineDurMs = parseInt(m[2], 10) || 0;
    var body = m[3] || '';
    var words = [], fullText = '';
    var reg = /\((\d+),(\d+),\d+\)([^()]*)/g, wm;
    while ((wm = reg.exec(body))) {
      var txt = (wm[3] || '').replace(/\s+/g, ' ');
      if (!txt) continue;
      var rawStart = parseInt(wm[1], 10) || 0;
      var rawDur = parseInt(wm[2], 10) || 0;
      var absStartMs = rawStart >= lineStartMs - 500 ? rawStart : lineStartMs + rawStart;
      var c0 = fullText.length;
      fullText += txt;
      words.push({ text:txt, t:absStartMs / 1000, d:Math.max(0.06, rawDur / 1000), c0:c0, c1:fullText.length });
    }
    if (!fullText) fullText = body.replace(/\(\d+,\d+,\d+\)/g, '').replace(/\s+/g, ' ');
    var leading = (fullText.match(/^\s+/) || [''])[0].length;
    fullText = fullText.replace(/\s+/g, ' ').trim();
    if (!fullText) return;
    if (words.length) {
      words.forEach(function(w){
        w.c0 = Math.max(0, Math.min(fullText.length, w.c0 - leading));
        w.c1 = Math.max(w.c0, Math.min(fullText.length, w.c1 - leading));
      });
      words = words.filter(function(w){ return w.c1 > w.c0; });
    }
    lines.push({ t:lineStartMs / 1000, duration:lineDurMs / 1000, text:fullText, words:words, charCount:Math.max(1, fullText.length), source: words.length ? 'yrc-word' : 'yrc-line' });
  });
  return finalizeLyricLineDurations(lines);
}
function renderLyrics() {
  // v8: 歌词渲染由 stageLyrics 在每帧 tickLyricsParticles 里推动
  clearStageLyrics();
}
function toggleLyricsPanel(force) {
  if (force === false) fx.particleLyrics = false;
  else if (force === true) fx.particleLyrics = true;
  else fx.particleLyrics = !fx.particleLyrics;
  if (fx.particleLyrics) {
    createLyricsParticles();
    showToast('歌词已开启');
  } else {
    clearStageLyrics();
    showToast('歌词已关闭');
  }
  lyricsVisible = fx.particleLyrics;
}
function updateLyricsHighlight() { /* v8: 由 tickLyricsParticles 接管 */ }
