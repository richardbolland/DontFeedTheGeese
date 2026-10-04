// Loads the game (a single .riv file) and keeps it filling the browser window.
// All of the game itself lives inside the Rive file.

(function () {
  var canvas = document.getElementById('game');
  var loader = document.getElementById('loader');

  // The game is laid out for a stage at least this big (in CSS pixels). On smaller windows,
  // such as phones, the whole scene is scaled down to fit so it never gets cramped; on
  // anything bigger it's shown at normal size and the stage simply grows.
  var MIN_STAGE_WIDTH = 900;
  var MIN_STAGE_HEIGHT = 560;

  function sceneScale() {
    return Math.min(1, window.innerWidth / MIN_STAGE_WIDTH, window.innerHeight / MIN_STAGE_HEIGHT);
  }

  function makeLayout() {
    // The Stage is built with layouts, so it resizes to the canvas rather than being stretched.
    return new rive.Layout({ fit: rive.Fit.Layout, layoutScaleFactor: sceneScale() });
  }

  // Size the drawing surface to the window up front. A canvas starts at 300 x 150, and the
  // game would otherwise start up at that size before it's resized.
  function sizeCanvasToWindow() {
    var ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  }
  sizeCanvasToWindow();

  // Serve the runtime's WebAssembly from this site rather than a CDN.
  rive.RuntimeLoader.setWasmUrl('vendor/rive.wasm');
  rive.RuntimeLoader.setWasmFallbackUrl(null);

  var game = new rive.Rive({
    src: 'dont-feed-the-geese.riv',
    canvas: canvas,
    artboard: 'Stage',
    stateMachine: 'State Machine 1',
    autoplay: true,
    autoBind: true, // bind the Stage's default view model instance
    layout: makeLayout(),
    onLoad: function () {
      loaded = true;
      resize();
      loader.hidden = true;
      enableDevMode();
    },
    onLoadError: function (error) {
      console.error('Could not load the game:', error);
      loader.textContent = "Sorry, the game couldn't load.";
    },
  });

  // Dev mode: opening the page with ?dev in the address skips straight to the end of the game
  // (the last feeder is fed to the goose), so the ending can be tested without finding everyone.
  function enableDevMode() {
    if (!new URLSearchParams(window.location.search).has('dev')) {
      return;
    }
    var flag = game.viewModelInstance && game.viewModelInstance.boolean('devSkipToEnd');
    if (flag) {
      flag.value = true;
    } else {
      console.warn('Dev mode: the Stage has no devSkipToEnd property.');
    }
  }

  // Keep the drawing surface matched to the canvas (and to the screen's pixel density)
  // so the game stays sharp at any window size, on any device, and keep the scene scale up
  // to date as the window changes shape.
  var appliedScale = sceneScale();
  var loaded = false; // resizing before the file has loaded would hit a renderer that isn't ready

  function resize() {
    if (!loaded) {
      return;
    }
    var scale = sceneScale();
    if (Math.abs(scale - appliedScale) > 0.001) {
      appliedScale = scale;
      game.layout = makeLayout();
    }
    game.resizeDrawingSurfaceToCanvas();
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resize).observe(canvas);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  // Moving the window between screens of different pixel density changes devicePixelRatio.
  window
    .matchMedia('(resolution: ' + window.devicePixelRatio + 'dppx)')
    .addEventListener('change', resize);
})();
