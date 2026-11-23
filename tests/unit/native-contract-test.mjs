// The page and the Android app talk in names: the plugins', the keys each side writes, the ride's
// phases and the kinds of tap. The page holds them in one place (native-bridge/native-contract.ts);
// the Java holds them as string literals. This reads the Java sources for every one of them, so a
// rename on either side fails here and not on a phone.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/native-contract-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  fixLineSchema,
  fixLogSchema,
  NATIVE_RIDE_PHASES,
  nativeRideSchema,
  NO_ACCURACY_M,
  PLUGIN_NAMES,
  RIDE_CUT_OFF_TROUBLES,
  RIDE_EVENT_NAME,
  RIDE_FIX_EVENT_NAME,
  RIDE_FIX_PROBLEM_CODES,
  RIDE_FIX_PROBLEM_EVENT_NAME,
  RIDE_GAP_REASONS,
  RIDE_MODES,
  RIDE_PHASES,
  rideNowSchema,
  rideStateSchema,
} from '../../src/features/contribute/native-bridge/native-contract.ts';

const JAVA = 'android/app/src/main/java/ph/para/contributor';
const java = (name) => readFileSync(`${JAVA}/${name}.java`, 'utf8');
/** A source of the ride's rules (ride/), plain Java. */
const rule = (name) => readFileSync(`${JAVA}/ride/${name}.java`, 'utf8');

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Asserts `source` (named `file`) matches `pattern`, saying what was looked for. */
function assertHas(source, file, pattern, what) {
  assert.match(source, pattern, `${file} no longer has ${what}`);
}

test('each plugin is registered under the name the page asks for', () => {
  const declared = {
    [PLUGIN_NAMES.ride]: java('RidePlugin'),
    [PLUGIN_NAMES.fixLog]: java('FixLogPlugin'),
    [PLUGIN_NAMES.nativePermissions]: java('NativePermissionsPlugin'),
    [PLUGIN_NAMES.shareImage]: java('ShareImagePlugin'),
  };
  assert.deepEqual(Object.keys(declared).sort(), Object.values(PLUGIN_NAMES).sort());
  for (const [name, source] of Object.entries(declared)) {
    assertHas(
      source,
      name,
      new RegExp(`@CapacitorPlugin\\(\\s*name\\s*=\\s*"${escape(name)}"`),
      `@CapacitorPlugin(name = "${name}")`,
    );
  }
});

test('RidePlugin.setState reads every key of the ride state the page sends', () => {
  const source = java('RidePlugin');
  for (const key of Object.keys(rideStateSchema.shape)) {
    assertHas(
      source,
      'RidePlugin.java',
      new RegExp(`call\\.get\\w+\\("${key}"`),
      `call.get…("${key}")`,
    );
  }
});

test('RideState names each phase the page sends', () => {
  const source = java('RideState');
  for (const phase of RIDE_PHASES) {
    assertHas(
      source,
      'RideState.java',
      new RegExp(`static final String \\w+ = "${phase}";`),
      `the phase "${phase}"`,
    );
  }
});

test("the ride's rules name every phase, mode, gap and cut-off the page reads", () => {
  const source = rule('Ride');
  const named = [
    ...NATIVE_RIDE_PHASES,
    ...RIDE_MODES,
    ...RIDE_GAP_REASONS,
    ...RIDE_CUT_OFF_TROUBLES,
  ];
  for (const name of named) {
    assertHas(
      source,
      'ride/Ride.java',
      new RegExp(`public static final String \\w+ = "${name}";`),
      `"${name}"`,
    );
  }
});

test('RidePlugin.now gives the ride by every key the page reads', () => {
  const plugin = java('RidePlugin');
  assertHas(plugin, 'RidePlugin.java', /public void now\(PluginCall call\)/, 'now(PluginCall)');
  for (const key of Object.keys(rideNowSchema.shape)) {
    assertHas(
      plugin,
      'RidePlugin.java',
      new RegExp(`result\\.put\\("${key}"`),
      `result.put("${key}")`,
    );
  }
  const json = java('RideJson');
  const keys = [...Object.keys(nativeRideSchema.shape), 'time', 'to', 'from', 'reason'];
  for (const key of keys) {
    assertHas(json, 'RideJson.java', new RegExp(`\\.put\\("${key}"`), `.put("${key}")`);
  }
  // What the page tells is read by the same keys.
  for (const key of ['time', 'to', 'from', 'reason']) {
    assertHas(json, 'RideJson.java', new RegExp(`\\.opt\\w+\\("${key}"`), `.opt…("${key}")`);
  }
  assertHas(
    plugin,
    'RidePlugin.java',
    new RegExp(`notifyListeners\\("${RIDE_EVENT_NAME}"`),
    `notifyListeners("${RIDE_EVENT_NAME}")`,
  );
});

test('NativePermissionsPlugin answers the battery dialog and says whether Para is unrestricted', () => {
  const source = java('NativePermissionsPlugin');
  assertHas(
    source,
    'NativePermissionsPlugin.java',
    /public void askBatteryUnrestricted\(PluginCall call\)/,
    'askBatteryUnrestricted(PluginCall)',
  );
  assertHas(
    source,
    'NativePermissionsPlugin.java',
    /result\.put\("isUnrestricted"/,
    'result.put("isUnrestricted")',
  );
  assertHas(
    source,
    'NativePermissionsPlugin.java',
    /state\.put\("isBatteryUnrestricted"/,
    'state.put("isBatteryUnrestricted")',
  );
  assertHas(
    readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8'),
    'AndroidManifest.xml',
    /android\.permission\.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/,
    'REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  );
});

test('RidePlugin.setState stops a service left running for a ride that is not recording', () => {
  // Its foreground notification cannot be cancelled while it runs: a ride over would stay on show.
  assertHas(
    java('RidePlugin'),
    'RidePlugin.java',
    /!RideState\.RECORDING\.equals\(phase\) && RideService\.isRunning\(\)\)\s*\{[\s\S]*?RideService\.stop\(getContext\(\)\)/,
    'setState: RideService.stop for a phase not RECORDING',
  );
});

test('FixLog writes each key of a fix line and of the log the page reads', () => {
  const source = java('FixLog');
  for (const key of [...Object.keys(fixLineSchema.shape), ...Object.keys(fixLogSchema.shape)]) {
    assertHas(source, 'FixLog.java', new RegExp(`\\.put\\("${key}"`), `.put("${key}")`);
  }
});

test('the notification reads a fix line by the keys FixLog writes', () => {
  const source = java('RideNotification');
  for (const key of Object.keys(fixLineSchema.shape)) {
    assertHas(
      source,
      'RideNotification.java',
      new RegExp(`fix\\.(get|opt)\\w+\\("${key}"`),
      `fix.get…("${key}")`,
    );
  }
});

test('a fix with no accuracy gets the same accuracy on both sides', () => {
  assert.equal(NO_ACCURACY_M, 1_000);
  const source = java('RideNotification');
  const declared = source.match(/static final double NO_ACCURACY_M = ([\d_.]+);/);
  assert.ok(declared, 'RideNotification.java no longer declares NO_ACCURACY_M');
  assert.equal(Number(declared[1].replaceAll('_', '')), NO_ACCURACY_M);
  assertHas(
    source,
    'RideNotification.java',
    /fix\.optDouble\("accuracyM", NO_ACCURACY_M\)/,
    'its use for a fix with no accuracy',
  );
});

test("the ride's service hands the page its fixes and its problems by the names the page hears", () => {
  const plugin = java('RidePlugin');
  assertHas(plugin, 'RidePlugin.java', new RegExp(`"${RIDE_FIX_EVENT_NAME}"`), RIDE_FIX_EVENT_NAME);
  assertHas(
    plugin,
    'RidePlugin.java',
    new RegExp(`"${RIDE_FIX_PROBLEM_EVENT_NAME}"`),
    RIDE_FIX_PROBLEM_EVENT_NAME,
  );
  // A live fix has the keys of a fix line, as FixLog writes them.
  for (const key of Object.keys(fixLineSchema.shape)) {
    assertHas(plugin, 'RidePlugin.java', new RegExp(`fix\\.put\\("${key}"`), `fix.put("${key}")`);
  }
  const service = java('RideService');
  for (const code of RIDE_FIX_PROBLEM_CODES) {
    assertHas(
      service,
      'RideService.java',
      new RegExp(`tellFixProblem\\("${code}"`),
      `the problem "${code}"`,
    );
  }
  for (const method of ['startRecording', 'stopRecording']) {
    assertHas(plugin, 'RidePlugin.java', new RegExp(`public void ${method}\\(PluginCall`), method);
  }
});

test('the ride records in a service that outlives the app, of type location', () => {
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
  const service = manifest.match(/<service[^>]*android:name="\.RideService"[^>]*\/>/)?.[0] ?? '';
  assert.match(service, /android:foregroundServiceType="location"/);
  assert.match(service, /android:stopWithTask="false"/);
  assert.match(service, /android:exported="false"/);
  assert.match(manifest, /android\.permission\.FOREGROUND_SERVICE_LOCATION/);
});

test("the app's plugins hand the page JSON as parsed arrays, never JSArray.from of a string", () => {
  // JSArray.from takes an array: given a JSON string it answers null, and the page reads nothing
  // (the notification's taps were never applied that way).
  for (const name of ['RidePlugin', 'FixLogPlugin', 'NativePermissionsPlugin']) {
    assert.doesNotMatch(java(name), /JSArray\.from\([^)]*toString\(\)/, `${name}.java`);
  }
  assert.doesNotMatch(java('RideJson'), /JSArray\.from\(/, 'RideJson.java');
});
