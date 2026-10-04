// Sound effects. The game (inside the Rive file) fires a trigger on the Stage view model at the
// moment each sound should play; this file listens for those triggers and plays the matching
// mp3 from the audio/ folder. A missing mp3 is simply skipped, so sounds can be added one at a
// time. To change which file a sound uses, or how loud it is, edit SOUNDS below.
//
// Browsers only allow sound after the player has interacted with the page, so nothing plays
// until the first click or tap. Press M to mute and unmute.

(function () {
  // Every sound file lives in this folder (next to index.html). All the file names below are
  // relative to it.
  var AUDIO_FOLDER = 'audio/';

  // `files` is the list of mp3s (in the audio folder) a sound can play. With more than one, a
  // different one is picked at random each time (never the same one twice in a row). Files that
  // don't exist are skipped. For example variants('person-talking', 4) means person-talking-1.mp3
  // to person-talking-4.mp3.
  function variants(name, count) {
    var files = [];
    for (var i = 1; i <= count; i++) {
      files.push(name + '-' + i + '.mp3');
    }
    return files;
  }

  // The sounds. `volume` is 0 to 1. Sounds overlap if they are triggered again before they
  // finish. `gap` is the least time (milliseconds) between two plays of the same sound, so rapid
  // clicking doesn't turn into noise. The footsteps are single steps, played one after another
  // while people walk (see FOOTSTEPS below).
  var SOUNDS = {
    footsteps: {
      files: [
        '678714-kinniekindaceline-foot-step_IkGp9l2Y.mp3',
        '678714-kinniekindaceline-foot-step_Zy5zbIll.mp3',
        '678714-kinniekindaceline-foot-step_uSZi4qRN.mp3',
      ],
      volume: 0.6,
    },
    talk: { files: variants('person-talking', 3), volume: 0.7, gap: 150 },
    pop: { files: variants('click-pop', 3), volume: 0.7, gap: 60 },
    quack: { files: variants('ducks-quacking', 3), volume: 0.7, gap: 300 },
    feedKing: { files: ['feed-king-duck.mp3'], volume: 0.8 },
    eating: { files: ['eating.mp3'], volume: 0.8 },
    cageDrop: { files: ['cage-drop.mp3'], volume: 0.8 },
    caged: { files: ['placed-in-cage.mp3'], volume: 0.8, gap: 100 },
    death: { files: ['death.mp3'], volume: 0.7, gap: 50 },
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
  // view model): silent when nobody walks, and a step every `slowest` milliseconds at a quiet
  // volume when few do, up to a step every `fastest` milliseconds at full `volume` when everybody
  // does. Each step is a random one of the files, with a little randomness in the timing.
  var FOOTSTEPS = 'footsteps';
  var STEP_SLOWEST = 360;
  var STEP_FASTEST = 110;

  var logging = new URLSearchParams(window.location.search).has('sfxlog');
  var muted = false;
  var unlocked = false;
  var players = {}; // sound name -> { clips: [{ audio, broken, file }], lastPlayed, lastClip }
  var share = 0;

  function log() {
    if (logging) {
      console.log.apply(console, ['[sfx]'].concat([].slice.call(arguments)));
    }
  }

  // A missing or broken file is skipped without any fuss.
  function load(name) {
    var sound = SOUNDS[name];
    var player = { clips: [], lastPlayed: 0, lastClip: -1 };
    sound.files.forEach(function (file) {
      var clip = { audio: new Audio(), broken: false, file: file };
      clip.audio.preload = 'auto';
      clip.audio.addEventListener('error', function () {
        clip.broken = true;
        log(name, 'could not be loaded:', file);
      });
      clip.audio.src = AUDIO_FOLDER + file;
      player.clips.push(clip);
    });
    players[name] = player;
  }

  // The clips of a sound that loaded, as positions in its list.
  function working(player) {
    var found = [];
    player.clips.forEach(function (clip, index) {
      if (!clip.broken) {
        found.push(index);
      }
    });
    return found;
  }

  // Plays a random working clip of a sound, at `loudness` (0 to 1) times its volume.
  function play(name, loudness) {
    var player = players[name];
    var sound = SOUNDS[name];
    if (!player || muted) {
      return;
    }
    var options = working(player);
    if (options.length === 0) {
      return;
    }
    var now = performance.now();
    if (sound.gap && now - player.lastPlayed < sound.gap) {
      return;
    }
    player.lastPlayed = now;
    // A random clip, but not the one used last time.
    var pick = options[Math.floor(Math.random() * options.length)];
    if (options.length > 1 && pick === player.lastClip) {
      pick = options[(options.indexOf(pick) + 1) % options.length];
    }
    player.lastClip = pick;
    var clip = player.clips[pick];
    if (name !== FOOTSTEPS) {
      log('play', name, clip.file);
    }
    // A copy, so the same sound can overlap with itself.
    var copy = clip.audio.cloneNode();
    copy.volume = Math.min(1, sound.volume * (loudness === undefined ? 1 : loudness));
    var promise = copy.play();
    if (promise && promise.catch) {
      promise.catch(function () {});
    }
  }

  var nextStep = 0;

  // Called every frame: while people are walking, plays a step whenever one is due.
  function updateFootsteps() {
    if (muted || !unlocked || share < 0.04) {
      return;
    }
    var now = performance.now();
    if (now < nextStep) {
      return;
    }
    if (now - nextStep > 1000) {
      log('footsteps start'); // (the first step after a quiet spell)
    }
    play(FOOTSTEPS, share);
    var interval = STEP_SLOWEST + (STEP_FASTEST - STEP_SLOWEST) * share;
    nextStep = now + interval * (0.75 + Math.random() * 0.5);
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
