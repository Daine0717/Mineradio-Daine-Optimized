const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('public/system/minimal-mode.js', 'utf8');

function createContext() {
  const classes = new Set();
  const state = { isMinimalMode: false, fail: false };
  const context = {
    console: { warn() {} },
    setTimeout(resolve) { resolve(); },
    document: {
      fullscreenElement: null,
      body: {
        classList: {
          add(...names) { names.forEach((name) => classes.add(name)); },
          remove(...names) { names.forEach((name) => classes.delete(name)); },
          contains(name) { return classes.has(name); }
        }
      }
    },
    fx: {
      preset: 2,
      coverResolution: 1.2,
      particleLyrics: false,
      lyricCameraLock: false,
      lyricScale: 0.8,
      lyricOffsetX: 1,
      lyricOffsetY: 2,
      lyricOffsetZ: 3,
      lyricTiltX: 4,
      lyricTiltY: 5
    },
    orbit: { userRadius: 1, userPhi: 2, userTheta: 3, baselineRadius: 4, baselinePhi: 5, baselineTheta: 6 },
    uniforms: { uMinimalMode: { value: 0 } },
    applyCoverParticleResolution(value) { context.fx.coverResolution = value; },
    setPreset(value) { context.fx.preset = value; },
    syncFxUniforms() {},
    showToast() {},
    getDesktopWindowApi() {
      return {
        async setMinimalMode(enabled) {
          if (state.fail) throw new Error('expected failure');
          state.isMinimalMode = enabled;
        },
        async getState() { return { isMinimalMode: state.isMinimalMode }; }
      };
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, classes, state };
}

(async function checkMinimalMode() {
  const normal = createContext();
  await normal.context.setMinimalMode(true);
  assert(normal.classes.has('minimal-mode'));
  assert.strictEqual(normal.context.uniforms.uMinimalMode.value, 1);
  assert.strictEqual(normal.context.fx.preset, 5);
  assert.strictEqual(normal.context.fx.lyricScale, 0.8);
  assert.strictEqual(normal.context.fx.lyricCameraLock, false);
  assert.strictEqual(normal.context.fx.lyricOffsetY, 2);
  await normal.context.setMinimalMode(false);
  assert(!normal.classes.has('minimal-mode'));
  assert.strictEqual(normal.context.uniforms.uMinimalMode.value, 0);
  assert.strictEqual(normal.context.fx.preset, 2);
  assert.strictEqual(normal.context.fx.lyricScale, 0.8);
  assert.strictEqual(normal.context.fx.lyricOffsetY, 2);

  const failedEnter = createContext();
  failedEnter.state.fail = true;
  await failedEnter.context.setMinimalMode(true);
  assert(!failedEnter.classes.has('minimal-mode'));
  assert.strictEqual(failedEnter.context.fx.preset, 2);

  const failedExit = createContext();
  await failedExit.context.setMinimalMode(true);
  failedExit.state.fail = true;
  await failedExit.context.setMinimalMode(false);
  assert(failedExit.classes.has('minimal-mode'));
  assert.strictEqual(failedExit.context.fx.preset, 5);

  console.log('minimal mode checks passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
