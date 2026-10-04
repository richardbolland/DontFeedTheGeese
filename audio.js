// Sound effects. The game (inside the Rive file) fires a trigger on the Stage view model at the
// moment each sound should play; this file listens for those triggers and plays the matching
// mp3 from the audio/ folder. A missing mp3 is simply skipped, so sounds can be added one at a
// time. To change which file a sound uses, or how loud it is, edit SOUNDS below.
//
// Browsers only allow sound after the player has interacted with the page, so nothing plays
// until the first click or tap. Press M to mute and unmute.

(function () {
  // The sounds. `file` is looked up in the audio/ folder. `volume` is 0 to 1. `loop` sounds play
  // continuously; the rest overlap if they are triggered again before they finish. `gap` is the
  // least time (milliseconds) between two plays of the same sound, so rapid clicking doesn't
  // turn into noise.
  var SOUNDS = {
    footsteps: { file: 'footsteps.mp3', volume: 0.4, loop: true },
    talk: { file: 'person-talking.mp3', volume: 0.7, gap: 150 },
    pop: { file: 'click-pop.mp3', volume: 0.7, gap: 60 },
    quack: { file: 'ducks-quacking.mp3', volume: 0.7, gap: 300 },
    feedKing: { file: 'feed-king-duck.mp3', volume: 0.8 },
    eating: { file: 'eating.mp3', volume: 0.8 },
    cageDrop: { file: 'cage-drop.mp3', volume: 0.8 },
    caged: { file: 'placed-in-cage.mp3', volume: 0.8, gap: 100 },
    death: { file: 'death.mp3', volume: 0.7, gap: 50 },
  };

  // Which sound each trigger plays. `delay` waits that many milliseconds first, for sounds that
  // belong a moment after the thing that triggers them (an animation that has to get going).
  var TRIGGERS = {
    sfxTalk: { sound: 'talk' }, // a person says something
    sfxPop: { sound: 'pop' }, // a person is pressed
    sfxQuack: { sound: 'quack' }, // the goose speaks or dives
    sfxFeedKing: { sound: 'feedKing' }, // the feeder is dropped in the pond
    sfxEating: { sound: 'eating', delay: 700 }, // the goose starts eating
    sfxCageDrop: { sound: 'cageDrop', delay: 400 }, // the cages come down
    sfxCaged: { sound: 'caged' }, // someone is locked in a cage
    sfxDeath: { sound: 'death' }, // someone is destroyed
  };

  // The footsteps follow how much of the crowd is walking (walkingShare, 0 to 1 on the Stage
  // view model): silent when nobody walks, at full `volume` when everybody does.
  var FOOTSTEPS = 'footsteps';

  var logging = new URLSearchParams(window.location.search).has('sfxlog');
  var muted = false;
  var unlocked = false;
  var players = {}; // sound name -> { audio, lastPlayed }
  var share = 0;

  function log() {
    if (logging) {
      console.log.apply(console, ['[sfx]'].concat([].slice.call(arguments)));
    }
  }

  // A missing or broken file is skipped without any fuss.
  function load(name) {
    var sound = SOUNDS[name];
    var audio = new Audio();
    audio.preload = 'auto';
    audio.loop = !!sound.loop;
    audio.addEventListener('error', function () {
      players[name].broken = true;
      log(name, 'could not be loaded:', sound.file);
    });
    audio.src = 'audio/' + sound.file;
    players[name] = { audio: audio, lastPlayed: 0, broken: false };
  }

  function play(name) {
    var player = players[name];
    var sound = SOUNDS[name];
    if (!player || player.broken || muted) {
      return;
    }
    var now = performance.now();
    if (sound.gap && now - player.lastPlayed < sound.gap) {
      return;
    }
    player.lastPlayed = now;
    log('play', name);
    // A copy, so the same sound can overlap with itself.
    var copy = player.audio.cloneNode();
    copy.volume = sound.volume;
    var promise = copy.play();
    if (promise && promise.catch) {
      promise.catch(function () {});
    }
  }

  function updateFootsteps() {
    var player = players[FOOTSTEPS];
    if (!player || player.broken) {
      return;
    }
    var audio = player.audio;
    var volume = muted || !unlocked ? 0 : SOUNDS[FOOTSTEPS].volume * share;
    audio.volume = Math.min(1, Math.max(0, volume));
    if (volume > 0.001) {
      if (audio.paused) {
        log('footsteps start');
        var promise = audio.play();
        if (promise && promise.catch) {
          promise.catch(function () {});
        }
      }
    } else if (!audio.paused) {
      audio.pause();
    }
  }

  // Called once the game has loaded, with the running Rive instance.
  function attach(game) {
    var vmi = game.viewModelInstance;
    if (!vmi) {
      console.warn('Sound effects: the Stage has no view model instance.');
      return;
    }

    Object.keys(SOUNDS).forEach(load);

    Object.keys(TRIGGERS).forEach(function (triggerName) {
      var trigger = vmi.trigger(triggerName);
      if (!trigger) {
        console.warn('Sound effects: the Stage has no ' + triggerName + ' trigger.');
        return;
      }
      var entry = TRIGGERS[triggerName];
      trigger.on(function () {
        if (entry.delay) {
          setTimeout(function () {
            play(entry.sound);
          }, entry.delay);
        } else {
          play(entry.sound);
        }
      });
    });

    var walking = vmi.number('walkingShare');
    function tick() {
      share = walking ? walking.value : 0;
      updateFootsteps();
      requestAnimationFrame(tick);
    }
    tick();
  }

  // Sound is allowed from the first press onwards.
  window.addEventListener(
    'pointerdown',
    function () {
      unlocked = true;
    },
    { once: true, capture: true }
  );

  window.addEventListener('keydown', function (event) {
    if (event.key === 'm' || event.key === 'M') {
      muted = !muted;
      log(muted ? 'muted' : 'unmuted');
    }
  });

  window.GameAudio = { attach: attach };
})();
