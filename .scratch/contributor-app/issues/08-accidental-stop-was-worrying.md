# 08: An accidental pause was worrying

Status: resolved
Type: design question
Who: the owner, then a session
Source: the owner's phone test of the app, 2026-10-26, feedback (c)

The owner paused by accident and was worried. Today Stop is a full-width red bar at the bottom of the recording screen (`tracking-button.tsx`). It ends nothing for good: the screen becomes "Recording stopped" with Resume and Save, and the paused time is left out. But nothing on the screen says the data is safe, and the bar is easy to hit with a thumb while the phone moves.

## What the design must answer

- Should stopping ask first, or stay one tap and be easy to undo? Which fits a person on a moving jeepney?
- What does the stopped screen say so the person knows nothing is lost and Resume carries on? (The copy is the owner's.)
- Is the bar too big, too close to the other buttons, or the wrong colour for "pause"? Red means "end" elsewhere on the page.
- Should the button be named Pause while Resume is right there, with End/Save a separate action?
- A pause while the screen is off or the app is in the background: anything on the "ParaPo is recording" notice?

## Not decided here

No UI is proposed. Behaviour today (Stop pauses, Resume continues, Save ends) is correct and stays until the design arrives.

## Answer

Stop became Pause, which ends nothing: paused, the ride waits for Resume or Finish, and the map frosts over so the pause shows at a glance (#631). The ride's notification carries the same buttons: Pause while recording, Resume and Finish while paused (#632, #638).
