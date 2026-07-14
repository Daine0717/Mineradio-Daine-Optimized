async function apiJson(url, opts) {
  opts = opts || {};
  var timeoutMs = Number(opts.timeoutMs) || 0;
  var fetchOpts = Object.assign({}, opts);
  delete fetchOpts.timeoutMs;
  var timer = null;
  if (timeoutMs && window.AbortController && !fetchOpts.signal) {
    var controller = new AbortController();
    fetchOpts.signal = controller.signal;
    timer = setTimeout(function(){ controller.abort(); }, timeoutMs);
  }
  try {
    var res = await fetch(url, fetchOpts);
    return res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function escHtml(s){ var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
