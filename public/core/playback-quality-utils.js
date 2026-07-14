function normalizePlaybackQuality(value) {
  value = String(value || '').toLowerCase();
  if (value === 'jymaster' || value === 'master' || value === 'svip') return 'jymaster';
  if (value === 'hires' || value === 'hi-res' || value === 'highres' || value === 'highest') return 'hires';
  if (value === 'lossless' || value === 'flac' || value === 'sq') return 'lossless';
  if (value === 'exhigh' || value === 'high' || value === '320k' || value === 'hq') return 'exhigh';
  if (value === 'standard' || value === 'normal' || value === 'std') return 'standard';
  return 'hires';
}
function playbackQualityLabel(value) {
  value = normalizePlaybackQuality(value);
  if (value === 'jymaster') return '超清母带';
  if (value === 'hires') return '高清臻音';
  if (value === 'lossless') return '无损';
  if (value === 'exhigh') return '极高';
  if (value === 'standard') return '标准';
  return '高清臻音';
}
function playbackQualityShortLabel(value) {
  value = normalizePlaybackQuality(value);
  if (value === 'jymaster') return '母带';
  if (value === 'hires') return '臻音';
  if (value === 'lossless') return 'SQ';
  if (value === 'exhigh') return 'HQ';
  if (value === 'standard') return 'STD';
  return '臻音';
}
function playbackQualityRank(value) {
  value = normalizePlaybackQuality(value);
  if (value === 'jymaster') return 5;
  if (value === 'hires') return 4;
  if (value === 'lossless') return 3;
  if (value === 'exhigh') return 2;
  if (value === 'standard') return 1;
  return 4;
}
function playbackQualityWasDowngraded(requested, resolved) {
  return playbackQualityRank(resolved) < playbackQualityRank(requested);
}
function kugouQualityHashesParam(song) {
  if (!song || !song.qualityHashes) return '';
  try {
    return '&qualityHashes=' + encodeURIComponent(JSON.stringify(song.qualityHashes));
  } catch (e) {
    return '';
  }
}
function playbackBitrateLabel(br) {
  br = Number(br) || 0;
  if (!br) return '';
  if (br >= 1000000) return (br / 1000000).toFixed(br >= 2000000 ? 1 : 2).replace(/\.0+$/, '') + ' Mbps';
  return Math.round(br / 1000) + ' kbps';
}
function playbackResolvedQualityText(data) {
  data = data || {};
  var label = playbackQualityLabel(data.level || data.quality || playbackQuality);
  var br = playbackBitrateLabel(data.br);
  return br ? (label + ' · ' + br) : label;
}
function readPlaybackQualityPreference() {
  try {
    return normalizePlaybackQuality(localStorage.getItem(PLAYBACK_QUALITY_STORE_KEY) || 'hires');
  } catch (e) {
    return 'hires';
  }
}
function savePlaybackQualityPreference() {
  try { localStorage.setItem(PLAYBACK_QUALITY_STORE_KEY, playbackQuality); } catch (e) {}
}
function currentPlaybackQualityProvider() {
  var song = currentIdx >= 0 && playQueue && playQueue[currentIdx] ? playQueue[currentIdx] : null;
  return songProviderKey(song);
}
function playbackQualityLabelForProvider(value, provider) {
  value = normalizePlaybackQuality(value);
  if (provider === 'kugou') {
    if (value === 'jymaster') return '酷狗母带';
    if (value === 'hires') return 'Hi-Res';
    if (value === 'lossless') return '无损 SQ';
    if (value === 'exhigh') return '极高 HQ';
    if (value === 'standard') return '标准';
  }
  return playbackQualityLabel(value);
}
function playbackQualityShortLabelForProvider(value, provider) {
  value = normalizePlaybackQuality(value);
  if (provider === 'kugou') {
    if (value === 'jymaster') return '母带';
    if (value === 'hires') return 'HiRes';
    if (value === 'lossless') return 'SQ';
    if (value === 'exhigh') return 'HQ';
    if (value === 'standard') return 'STD';
  }
  return playbackQualityShortLabel(value);
}
function updateQualityOptionText(provider) {
  var map = provider === 'kugou'
    ? {
      jymaster: ['酷狗母带', '最高规格 / 有则优先'],
      hires: ['Hi-Res', '高解析优先'],
      lossless: ['无损 SQ', 'FLAC 优先'],
      exhigh: ['极高 HQ', '320kbps / OGG 优先'],
      standard: ['标准', '128kbps'],
    }
    : {
      jymaster: ['超清母带', 'SVIP / 最高规格'],
      hires: ['高清臻音', '默认 / 细节优先'],
      lossless: ['无损 SQ', 'FLAC 优先'],
      exhigh: ['极高 HQ', '320kbps'],
      standard: ['标准', '128kbps'],
    };
  document.querySelectorAll('.quality-option').forEach(function(option){
    var q = normalizePlaybackQuality(option.dataset.quality);
    var text = map[q] || map.hires;
    var span = option.querySelector('span');
    var small = option.querySelector('small');
    if (span) span.textContent = text[0];
    if (small) small.textContent = text[1];
  });
}
