# 13: Nothing suggests Sakay when the contributor is plainly riding

Status: ready-for-agent
Type: the detection logic is ready; the prompt's look waits for the owner's design
Who: the owner
Source: the 2026-11-11 review, finding UX-07; follows ticket 07's option 3

## What happens today

- A recording starts on Lakad. It switches to Sakay only when the contributor taps the mode button (`recorder/recording-transitions.ts`, `switchedMode`).
- Hintos count only on Sakay (CONTEXT.md, Lakad / Sakay). A ride recorded on Lakad from start to end reaches the studio as a walk: no hintos, and its trail drawn as walked.
- Nothing in the recorder looks at the speed to suggest a switch. The only speed rule is the 140 km/h cut-off for bad fixes (`recorder/recording-limits.ts`).
- Ticket 07 left auto-detection for later: "it is a guess, it will be wrong at traffic and at stops, and it should only suggest a split for the contributor to confirm".

## Options

1. **A suggestion, never a switch.** After a sustained stretch on Lakad faster than walking (for example over 15 km/h for a minute), the recording offers "Switch to Sakay?". The contributor confirms or ignores it. A slow jeepney in traffic is never switched by itself. The switch keeps the time it was confirmed, as a tap does today.
2. **Switch back-dated.** As 1, but a yes places the switch where the speed rose, not where the contributor tapped.
3. **Nothing in the recorder.** The studio flags long fast stretches on Lakad when it reads a contribution.

## Recommendation

Option 1 first. It is the smallest change that keeps the contributor in charge, and its rule can be unit-tested from recorded fixes. Option 2 changes what a switch's time means for the studio, so it waits until real rides show that the confirm lag matters.

## Questions for the owner

- Should the recorder suggest Sakay at all?
- What should the suggestion look like, and what should it say? There is no Figma frame, and this ticket invents no look.
- In the app, should the ride card on the notification offer it too?

## Where the code is

`src/features/contribute/recorder/` (`recording-transitions.ts`, `recording-state.ts`); in the app, `android/.../ride/RideMachine.java` and `RideCard.java` if the ride card offers it.

## Answer

The owner (Q182, 2026-11-11): option 1, a suggestion that is never an automatic switch.

- After a sustained stretch on Lakad faster than walking, the recording offers "Switch to Sakay?".
- The contributor confirms or ignores it. Confirming switches at that moment, as a tap does today.
- Ignoring it changes nothing, and it is not asked again until the next sustained stretch.

Ready for an agent: the detection only. It is a pure function in `recorder/` over the recent accepted fixes and the current mode. It says when a suggestion is due, with unit tests from recorded fixes: a jeepney on EDSA, walking, and a slow jeepney in traffic. Its numbers (speed and how long) are constants beside it, starting from about 15 km/h for a minute.

**Waiting for the owner's design, and not to be invented:** the prompt itself, its place, words and buttons, and whether the app's ride card offers it. Until the frames come, nothing is shown: the detection is wired to nothing that draws. It is on the design-later list in `.scratch/contribute-apk/README.md`.
