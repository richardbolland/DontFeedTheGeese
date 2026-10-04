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

  // The sounds. `volume` is 0 to 1. Any sound can also have `volumeVariation` (a fraction, 0.3 =
  // up to 30% louder or quieter each time) and `pitchVariation` (semitones, 2 = up to two
  // semitones higher or lower each time), picked at random on every play. Sounds overlap if they
  // are triggered again before they finish. `gap` is the least time (milliseconds) between two plays of the same sound, so rapid
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
      volumeVariation: 0.35, // each step is up to 35% louder or quieter than the average
      pitchVariation: 2.5, // ...and up to 2.5 semitones higher or lower
    },
    talk: { files: variants('person-talking', 3), volume: 0.7, gap: 150 },
    pop: { files: variants('click-pop', 3), volume: 0.7, gap: 60 },
    quack: {
      files: variants('ducks-quacking', 3).concat(['ducks-quacking.wav']),
      volume: 0.7,
      gap: 300,
    },
    feedKing: { files: ['feed-king-duck.mp3'], volume: 0.8 },
    eating: { files: ['eating.mp3'], volume: 0.8 },
    cageDrop: { files: ['cage-drop.mp3'], volume: 0.8 },
    caged: { files: ['placed-in-cage.mp3'], volume: 0.8, gap: 100 },
    death: { files: ['death.mp3'], volume: 0.7, gap: 50 },
  };

  // Which sound each trigger plays. `delay` waits that many milliseconds first, for sounds that
  // belong a moment after the thing that triggers them (an animation that has to get going).
  var TRIGGERS = {
    sfxTalk: { sound: 'talk', speech: true }, // a person says something (see GIBBERISH)
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

  // Gibberish speech, like Animal Crossing: when a person says something, one short sound is played
  // for each letter of what they say, in time with the words, so the speech sounds like a made-up
  // language. Spaces are short gaps and full stops, commas and so on are longer ones.
  //
  // The letter sounds are recordings of the alphabet, one file per letter, in `folder`: a.mp3,
  // b.mp3, ... z.mp3 (record yourself saying each letter, trim each one short, export them).
  // Until you add them, a made-up synthesised voice is used instead, so it works straight away.
  // Each person's voice is a little different: `voice` (0 to 1, from the game) picks their pitch
  // between `pitchLow` and `pitchHigh` (1 is the recording's own pitch, higher is squeakier).
  // `swap` replaces the sound of a letter with another's (c and s often sound harsh).
  // Set `enabled` to false to use the plain person-talking clips instead.
  var GIBBERISH = {
    enabled: true,
    folder: AUDIO_FOLDER + 'voice/',
    extension: 'mp3',
    volume: 0.5,
    pitchLow: 0.85,
    pitchHigh: 1.7,
    shiftSemitones: 6, // everyone raised by this much (12 is a whole octave; 2 is one "tone")
    swap: { c: 'k', s: 'z' },
    msPerLetter: 60, // the usual time between letters...
    shortestMs: 38, // ...made quicker for long sentences, never faster than this
    longestSentenceMs: 1900, // and a sentence never takes longer than this
  };

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
    // A little randomness in loudness and pitch, so repeats don't sound identical.
    var volume = sound.volume * (loudness === undefined ? 1 : loudness);
    if (sound.volumeVariation) {
      volume *= 1 + (Math.random() * 2 - 1) * sound.volumeVariation;
    }
    copy.volume = Math.min(1, Math.max(0, volume));
    if (sound.pitchVariation) {
      var semitones = (Math.random() * 2 - 1) * sound.pitchVariation;
      copy.preservesPitch = false; // so changing the speed changes the pitch too
      copy.mozPreservesPitch = false;
      copy.webkitPreservesPitch = false;
      copy.playbackRate = Math.pow(2, semitones / 12);
    }
    var promise = copy.play();
    if (promise && promise.catch) {
      promise.catch(function () {});
    }
  }

  // ---- Gibberish speech ----

  var context = null; // the Web Audio context the letter sounds play through
  var letterSounds = {}; // letter -> decoded recording
  var letterCount = 0; // how many letter recordings loaded
  var speechTimers = []; // the letters still waiting to play for the sentence being spoken
  var LETTERS = 'abcdefghijklmnopqrstuvwxyz';

  function audioContext() {
    if (!context) {
      var Context = window.AudioContext || window.webkitAudioContext;
      if (Context) {
        context = new Context();
      }
    }
    if (context && context.state === 'suspended') {
      context.resume();
    }
    return context;
  }

  // Loads whichever of a.mp3 ... z.mp3 exist.
  function loadLetters() {
    var c = audioContext();
    if (!c) {
      return;
    }
    LETTERS.split('').forEach(function (letter) {
      fetch(GIBBERISH.folder + letter + '.' + GIBBERISH.extension)
        .then(function (response) {
          if (!response.ok) {
            throw new Error('missing');
          }
          return response.arrayBuffer();
        })
        .then(function (data) {
          return c.decodeAudioData(data);
        })
        .then(function (buffer) {
          letterSounds[letter] = buffer;
          letterCount += 1;
          log('voice letter loaded:', letter);
        })
        .catch(function () {});
    });
  }

  // Vowel sounds are made of two bands of frequencies ("formants"); every letter borrows one
  // vowel's so the synthesised voice has some variety.
  var FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700] };

  // A short made-up "voice" blip for a letter, used until there are recordings.
  function synthLetter(c, letter, pitch) {
    var index = LETTERS.indexOf(letter);
    var vowel = 'aeiou'.charAt(index % 5);
    var formants = FORMANTS[vowel];
    var now = c.currentTime;
    var note = 150 * pitch * (1 + (index % 7) * 0.07);
    var osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = note;
    var envelope = c.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(GIBBERISH.volume * 0.5, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    formants.forEach(function (frequency) {
      var band = c.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = frequency;
      band.Q.value = 5;
      osc.connect(band);
      band.connect(envelope);
    });
    envelope.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  function voiceLetter(c, letter, pitch) {
    var jitter = 0.94 + Math.random() * 0.12;
    if (letterCount === 0) {
      synthLetter(c, letter, pitch * jitter);
      return;
    }
    // Recordings: a letter with no file borrows another that loaded.
    var buffer = letterSounds[letter];
    if (!buffer) {
      var loaded = Object.keys(letterSounds);
      buffer = letterSounds[loaded[Math.floor(Math.random() * loaded.length)]];
    }
    var source = c.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch * jitter;
    var gain = c.createGain();
    gain.gain.value = GIBBERISH.volume;
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
  }

  function stopSpeaking() {
    speechTimers.forEach(clearTimeout);
    speechTimers = [];
  }

  // Plays `text` as gibberish. `voice` (0 to 1) is how squeaky the speaker is.
  function speak(text, voice) {
    var c = audioContext();
    if (!c || muted || !unlocked || !text) {
      return;
    }
    stopSpeaking();
    var pitch =
      (GIBBERISH.pitchLow + (GIBBERISH.pitchHigh - GIBBERISH.pitchLow) * (voice || 0)) *
      Math.pow(2, GIBBERISH.shiftSemitones / 12);

    // Turn the text into letters and pauses, measured in beats.
    var beats = [];
    var total = 0;
    text
      .toLowerCase()
      .split('')
      .forEach(function (character) {
        var letter = null;
        var length = 1;
        if (character >= 'a' && character <= 'z') {
          letter = GIBBERISH.swap[character] || character;
        } else if (character >= '0' && character <= '9') {
          letter = LETTERS.charAt(Math.floor(Math.random() * 26));
        } else if (character === ' ') {
          length = 1;
        } else if (character === '.' || character === ',' || character === '!' || character === '?' || character === ':') {
          length = 3;
        } else {
          return;
        }
        beats.push({ letter: letter, at: total });
        total += length;
      });
    if (total === 0) {
      return;
    }
    var beat = Math.max(GIBBERISH.shortestMs, Math.min(GIBBERISH.msPerLetter, GIBBERISH.longestSentenceMs / total));
    log('speak', text.length + ' characters, a letter every ' + Math.round(beat) + ' ms');
    beats.forEach(function (entry) {
      if (!entry.letter) {
        return;
      }
      speechTimers.push(
        setTimeout(function () {
          voiceLetter(c, entry.letter, pitch);
        }, entry.at * beat)
      );
    });
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

    var talkText = vmi.string('talkText');
    var talkVoice = vmi.number('talkVoice');
    if (GIBBERISH.enabled) {
      loadLetters();
    }

    Object.keys(TRIGGERS).forEach(function (triggerName) {
      var trigger = vmi.trigger(triggerName);
      if (!trigger) {
        console.warn('Sound effects: the Stage has no ' + triggerName + ' trigger.');
        return;
      }
      var entry = TRIGGERS[triggerName];
      trigger.on(function () {
        // A person speaking is voiced letter by letter instead of by a recording.
        if (entry.speech && GIBBERISH.enabled) {
          speak(talkText ? talkText.value : '', talkVoice ? talkVoice.value : 0);
          return;
        }
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
      stopSpeaking();
      log(muted ? 'muted' : 'unmuted');
    }
  });

  window.GameAudio = { attach: attach };
})();
