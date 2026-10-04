Sound effects go in this folder. Name each mp3 exactly as below (or change the file names in
audio.js). A sound with no file is just skipped, so you can add them one at a time.

  footsteps.mp3            loops quietly while people are walking; fades out as they stop
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
