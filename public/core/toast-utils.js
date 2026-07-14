var toastTimer = null;
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2600);
}

// ============================================================
//  动态库加载
// ============================================================
function loadScriptOnce(src) {
  return new Promise(function(resolve, reject){
    var hit = document.querySelector('script[src="' + src + '"]');
    if (hit) { resolve(); return; }
    var sc = document.createElement('script'); sc.src = src; sc.async = true;
    sc.onload = resolve; sc.onerror = reject;
    document.head.appendChild(sc);
  });
}
