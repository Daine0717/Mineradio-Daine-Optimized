var minimalModeBusy = false;
var minimalModeVisualState = null;

function setMinimalShaderMode(enabled) {
  if (typeof uniforms !== 'undefined' && uniforms.uMinimalMode) uniforms.uMinimalMode.value = enabled ? 1 : 0;
}

function captureMinimalModeVisualState() {
  return {
    preset: fx.preset,
    coverResolution: fx.coverResolution,
    particleLyrics: fx.particleLyrics,
    orbit: orbit ? {
      userRadius: orbit.userRadius,
      userPhi: orbit.userPhi,
      userTheta: orbit.userTheta,
      baselineRadius: orbit.baselineRadius,
      baselinePhi: orbit.baselinePhi,
      baselineTheta: orbit.baselineTheta
    } : null
  };
}

function restoreMinimalModeVisualState() {
  var saved = minimalModeVisualState;
  minimalModeVisualState = null;
  if (!saved) return;
  fx.particleLyrics = saved.particleLyrics;
  applyCoverParticleResolution(saved.coverResolution, { reload:false });
  setPreset(saved.preset, { noSave:true, silent:true, preserveCamera:true, allowMinimalOverride:true });
  if (saved.orbit && orbit) Object.assign(orbit, saved.orbit);
  syncFxUniforms();
}

async function setMinimalMode(enabled) {
  var api = getDesktopWindowApi();
  if (!api || minimalModeBusy || !api.setMinimalMode) return;
  minimalModeBusy = true;
  try {
    if (enabled) {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen().catch(function(){});
      minimalModeVisualState = captureMinimalModeVisualState();
      document.body.classList.remove('minimal-transition-exit');
      document.body.classList.add('minimal-transitioning', 'minimal-entering');
      await new Promise(function(resolve){ setTimeout(resolve, 180); });
      document.body.classList.add('minimal-mode');
      setMinimalShaderMode(true);
      document.body.classList.remove('minimal-entering');
      fx.particleLyrics = true;
      setPreset(5, { noSave:true, silent:true });
      applyCoverParticleResolution(Math.min(fx.coverResolution, 0.85), { reload:false });
      await api.setMinimalMode(true);
      await new Promise(function(resolve){ setTimeout(resolve, 260); });
      document.body.classList.remove('minimal-transitioning');
    } else {
      document.body.classList.add('minimal-transitioning', 'minimal-entering', 'minimal-transition-exit');
      await new Promise(function(resolve){ setTimeout(resolve, 180); });
      await api.setMinimalMode(false);
      restoreMinimalModeVisualState();
      document.body.classList.remove('minimal-mode');
      setMinimalShaderMode(false);
      await new Promise(function(resolve){ setTimeout(resolve, 260); });
      document.body.classList.remove('minimal-transitioning', 'minimal-entering', 'minimal-transition-exit');
    }
  } catch (e) {
    console.warn('minimal mode transition failed:', e);
    var state = api.getState ? await api.getState().catch(function(){ return null; }) : null;
    var isMinimal = state ? !!state.isMinimalMode : !enabled;
    if (isMinimal) {
      document.body.classList.add('minimal-mode');
      setMinimalShaderMode(true);
    } else {
      restoreMinimalModeVisualState();
      document.body.classList.remove('minimal-mode');
      setMinimalShaderMode(false);
    }
    document.body.classList.remove('minimal-transitioning', 'minimal-entering', 'minimal-transition-exit', 'window-resizing');
    showToast('极简模式切换失败');
  } finally {
    minimalModeBusy = false;
  }
}

function toggleMinimalMode() {
  setMinimalMode(!document.body.classList.contains('minimal-mode'));
}
