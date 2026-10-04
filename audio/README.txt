Sound effects go in this folder. Name each mp3 exactly as below (or change the file names in
audio.js). A sound with no file is just skipped, so you can add them one at a time.

  the three foot-step clips   single steps, played one after another while people are walking
                           (faster and louder the more of the crowd is walking). The file names
                           are listed under `footsteps` in audio.js; change them there if you
                           rename the files.
  person-talking-1.mp3     a person is pressed and says something (a different one is picked
  person-talking-2.mp3     at random each time, never the same twice in a row)
  person-talking-3.mp3
  click-pop-1.mp3          a person is pressed (random variant, same as above)
  click-pop-2.mp3
  click-pop-3.mp3
  ducks-quacking-1.mp3     the goose speaks or dives (random variant)
  ducks-quacking-2.mp3
  ducks-quacking-3.mp3
  feed-king-duck.mp3       the feeder is dropped in the pond
  eating.mp3               the goose eats (starts 0.7 seconds after the drop)
  cage-drop.mp3            the cages come down (starts 0.4 seconds after they appear)
  placed-in-cage.mp3       someone is locked in a cage
  death.mp3                someone is destroyed

You don't need all three variants: with only some of the files present it picks from the ones that
exist. To use more or fewer variants, change the number in variants('person-talking', 3) (and so
on) near the top of audio.js.

Press M in the game to mute and unmute. Add ?sfxlog to the address to see in the browser console
which sound plays when (and which files could not be found).

Gibberish speech (Animal Crossing style)
----------------------------------------
When a person says something, the game plays one short sound per letter of what they say, so it
sounds like a made-up language. Until you add recordings it uses a synthesised voice. To use your
own voice, record yourself saying each letter of the alphabet, trim each clip short (about a
tenth of a second to half a second), and save them in audio/voice/ as a.mp3, b.mp3 ... z.mp3
(watch out for a doubled .mp3.mp3 extension). Any letter you leave out borrows another. Each
person gets a slightly different pitch. The settings (volume, pitch range, timing, which letters
swap for others) are in the GIBBERISH block of audio.js. Set `enabled: false` there to use the
plain person-talking clips instead.
