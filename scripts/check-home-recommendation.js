const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  Date,
  Math,
  JSON,
  Object,
  String,
  Array,
  Number,
  Promise,
  setTimeout,
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { getElementById: () => null },
  HOME_LISTEN_STATS_KEY: 'test',
  listenStatsState: { history: [], songs: {}, artists: {} },
  queueItemKey: song => `${song.provider || 'song'}:${song.id}`,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/ui/home-engine.js', 'utf8'), context);

const marker = context.extractChorusLyric('[00:01]Verse\n[00:10][Chorus]\n[00:11]Stay with me\n[00:15]All through the night');
if (!marker.includes('Stay with me')) throw new Error('chorus marker extraction failed');
const repeated = context.extractChorusLyric('[00:01]主歌第一句\n[00:10]我们终会再见\n[00:14]别害怕黑夜\n[00:30]我们终会再见\n[00:34]别害怕黑夜');
if (!repeated.includes('我们终会再见')) throw new Error('repeated chorus extraction failed');

const candidates = [
  { provider: 'netease', id: 1, name: 'A', artist: 'Old', _homePlaylistName: '我喜欢的音乐' },
  { provider: 'netease', id: 2, name: 'B', artist: 'Fresh', _homePlaylistName: '我喜欢的音乐' },
];
const stats = {
  songs: { 'netease:2': { lastPlayedAt: Date.now() } },
  artists: { Old: { plays: 5, listenMs: 300000 } },
};
const ranked = context.rankHomeRecommendationCandidates(candidates, stats, '2026-07-15');
if (ranked[0].id !== 1 || ranked.length !== 2) throw new Error('recommendation ranking failed');
const topComment = context.topHomeComment([{ content: 'low', likedCount: 2 }, { content: 'top', likedCount: 19 }]);
if (!topComment || topComment.content !== 'top') throw new Error('top comment selection failed');
console.log('home recommendation checks passed');
