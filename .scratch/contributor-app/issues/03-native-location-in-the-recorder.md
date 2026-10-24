# 03: Native location in the recorder

Status: blocked
Type: task
Who: a session
Blocked by: 02

- In the app, the recorder takes fixes from the background-location plugin (the spike's adapter, `native-location.ts`), started on Start and stopped on Stop, with the "ParaPo is recording" notice; on the web (dev, tests) `watchPosition` stays.
- **Fix rate:** set the plugin's interval to about one fix a second while recording; check it in the emulator ride while moving (the spike saw one per 4–5 s while still).
- **Permissions, in order, with a plain reason each:** notifications (13+), location, then "Allow all the time". A refusal says what still works (recording only with the screen on) and how to change it in Settings.
- **Battery restrictions:** detect makers known to kill background apps (Xiaomi, Oppo, Vivo, Samsung, Huawei, Realme) and show, once, how to allow "no restrictions" for ParaPo, with that maker's steps; a link to the app's battery settings.
- The fixes still go to IndexedDB fix by fix; resume after the app is killed and reopened works as today (Unfinished).
- The emulator screen-off ride (from the spike) runs in CI on app changes and must pass. `npm run check` passes.
