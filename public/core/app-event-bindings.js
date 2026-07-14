document.getElementById('file-input').addEventListener('change', function(e){ handleFiles(e.target.files); e.target.value = ''; });
document.getElementById('home-hero-bg-input').addEventListener('change', function(e){
  var file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file || !/^image\//i.test(file.type || '')) return;
  var reader = new FileReader();
  reader.onload = function(){
    try {
      localStorage.setItem(HOME_HERO_BG_KEY, String(reader.result || ''));
      applyHomeHeroBackground();
      showToast('Home 背景已更新');
    } catch (err) {
      showToast('背景太大，无法保存');
    }
  };
  reader.readAsDataURL(file);
});

