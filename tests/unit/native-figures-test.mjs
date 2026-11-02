// The app's ride notification says the recording card's Time and Distance while the page sleeps,
// worked out natively (RideNotification.java timeText and distanceText, RideState.java elapsedMs).
// They must say what the card says (common/format.ts timeFigure and distanceFigure, and the card's
// clock in recorder/recording-figures.ts). Those Java classes need Android to compile whole, so
// this lifts the methods out of the sources as they are written, compiles them with javac beside
// a small driver, and runs both sides on the same inputs.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/native-figures-test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { distanceFigure, timeFigure } from '../../src/features/contribute/common/format.ts';
import {
  liveFigures,
  pausedSecondsOf,
  summaryEnd,
} from '../../src/features/contribute/recorder/recording-figures.ts';
import { summarize } from '../../src/features/routes/model/ride-recording.ts';

const JAVA = 'android/app/src/main/java/ph/para/contributor';
const notificationSource = readFileSync(`${JAVA}/RideNotification.java`, 'utf8');
const stateSource = readFileSync(`${JAVA}/RideState.java`, 'utf8');
const pluginSource = readFileSync(`${JAVA}/RidePlugin.java`, 'utf8');
const receiverSource = readFileSync(`${JAVA}/RideActionReceiver.java`, 'utf8');

/** The method whose declaration starts with `signature`, through its closing brace. */
function javaMethod(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `no Java method ${signature}`);
  let depth = 0;
  for (let index = source.indexOf('{', start); index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`the Java method ${signature} never closes`);
}

/** The line in `source` matching `pattern`, as written. */
function javaLine(source, pattern) {
  const line = source.split('\n').find((text) => pattern.test(text));
  assert.ok(line, `no Java line matches ${pattern}`);
  return line.trim();
}

// RideState's fields, bare: elapsedMs reads them, and the driver sets them for each case.
const DRIVER = `
import java.util.Locale;

public class NativeFigures {
    ${javaLine(stateSource, /static final String FINISHED = /)}
    String phase;
    long startedAt;
    long pausedMs;
    long pausedSince;
    long finishedAt;

    ${javaMethod(stateSource, 'long elapsedMs(long now)')}

    ${javaMethod(notificationSource, 'static String timeText(long seconds)')}

    ${javaMethod(notificationSource, 'static String distanceText(double metres)')}

    public static void main(String[] args) throws Exception {
        java.io.BufferedReader in = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
        StringBuilder out = new StringBuilder();
        for (String line; (line = in.readLine()) != null;) {
            String[] part = line.split(" ");
            if (part[0].equals("time")) {
                out.append(timeText(Long.parseLong(part[1])));
            } else if (part[0].equals("distance")) {
                out.append(distanceText(Double.parseDouble(part[1])));
            } else {
                NativeFigures state = new NativeFigures();
                state.phase = part[1];
                state.startedAt = Long.parseLong(part[2]);
                state.pausedMs = Long.parseLong(part[3]);
                state.pausedSince = Long.parseLong(part[4]);
                state.finishedAt = Long.parseLong(part[5]);
                out.append(state.elapsedMs(Long.parseLong(part[6])));
            }
            out.append('\\n');
        }
        System.out.print(out);
    }
}
`;

let classes;
before(() => {
  classes = mkdtempSync(join(tmpdir(), 'native-figures-'));
  writeFileSync(join(classes, 'NativeFigures.java'), DRIVER);
  execFileSync('javac', ['-d', classes, join(classes, 'NativeFigures.java')]);
});
after(() => rmSync(classes, { recursive: true, force: true }));

/** Runs the driver once over all `lines`, its answers in the same order. */
const runJava = (lines) =>
  execFileSync('java', ['-cp', classes, 'NativeFigures'], {
    input: lines.join('\n') + '\n',
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
    .trimEnd()
    .split('\n');

const said = (figure) => `${figure.value} ${figure.unit}`;

// Time: the notification hands timeText whole seconds (elapsedMs / 1000); the card floors.

test('the notification hands timeText the clock in whole seconds', () => {
  assert.match(notificationSource, /timeText\(state\.elapsedMs\(now\) \/ 1000\)/);
});

const TIME_MS = [
  0, 999, 1_000, 1_500, 30_000, 59_000, 59_999, 60_000, 60_001, 89_999, 119_999, 120_000, 599_999,
  3_599_999, 3_600_000, 3_660_000, 5_400_000, 36_000_000, 86_400_000,
];

test(`timeText says what the card's Time says (${TIME_MS.length} clocks)`, () => {
  const native = runJava(TIME_MS.map((ms) => `time ${Math.trunc(ms / 1000)}`));
  TIME_MS.forEach((ms, index) => {
    assert.equal(native[index], said(timeFigure(ms / 1000)), `${ms} ms`);
  });
});

// Distance: whole metres under a kilometre, then kilometres to one decimal. The two sides round a
// kilometre figure apart where the metres end in 50 (1150 m: the card 1.1 km, the notification
// 1.2 km): the page's toFixed rounds the double 1.15, a hair under, and Java's %.1f rounds the
// decimal 1.15 half up. Those are kept apart below until the owner's choice lands (PR #659).

const SWEEP_TO_M = 20_000;
const endsIn50 = (metres) => metres >= 1000 && metres % 100 === 50;

const DISTANCE_EDGES = [-3, 0, 0.4, 0.5, 1.5, 2.5, 499.5, 999.4, 999.5, 1000.4, 1049.6, 12_345.6];

test(`distanceText says what the card's Distance says (${DISTANCE_EDGES.length} edges)`, () => {
  const native = runJava(DISTANCE_EDGES.map((metres) => `distance ${metres}`));
  DISTANCE_EDGES.forEach((metres, index) => {
    assert.equal(native[index], said(distanceFigure(metres)), `${metres} m`);
  });
});

test('distanceText says what the card says, every whole metre to 20 km but those ending in 50', () => {
  const metres = Array.from({ length: SWEEP_TO_M + 1 }, (_, index) => index).filter(
    (whole) => !endsIn50(whole),
  );
  const native = runJava(metres.map((whole) => `distance ${whole}`));
  metres.forEach((whole, index) => {
    assert.equal(native[index], said(distanceFigure(whole)), `${whole} m`);
  });
});

test(
  'distanceText says what the card says at metres ending in 50 (1150 m, 1450 m, ...)',
  { todo: "a known difference: awaits the owner's km rounding, PR #659" },
  () => {
    const metres = Array.from({ length: SWEEP_TO_M + 1 }, (_, index) => index).filter(endsIn50);
    const native = runJava(metres.map((whole) => `distance ${whole}`));
    const apart = metres.filter((whole, index) => native[index] !== said(distanceFigure(whole)));
    assert.deepEqual(apart, [], `${apart.length} of ${metres.length} differ`);
  },
);

// The clock: what the page tells RidePlugin.setState, turned into RideState as it turns it, and
// as a tap on the notification moves it, against the card's own clock for the same ride.

test('the state the clock reads is made from the page as RidePlugin and the taps make it', () => {
  assert.match(
    pluginSource,
    /state\.pausedMs = pausedSeconds == null \? 0 : Math\.round\(pausedSeconds \* 1000\);/,
  );
  assert.match(
    pluginSource,
    /state\.pausedSince = RideState\.PAUSED\.equals\(state\.phase\) && stoppedAt != null \? stoppedAt : 0;/,
  );
  assert.match(receiverSource, /state\.pausedSince = now;/);
  assert.match(receiverSource, /resumed\.pausedMs \+= now - resumed\.pausedSince;/);
  assert.match(receiverSource, /state\.finishedAt = now;/);
});

const T0 = Date.UTC(2026, 10, 2, 0, 0, 0);
const s = (seconds) => T0 + seconds * 1000;
const paused = (from, to) => ({ from: s(from), to: s(to), reasons: ['paused'] });

/** A ride as the page holds it: running, or stopped (paused) at `stoppedAt`. */
const ride = ({ gaps = [], stoppedAt = null }) => ({
  startedAt: T0,
  stoppedAt: stoppedAt === null ? null : s(stoppedAt),
  status: stoppedAt === null ? 'recording' : 'stopped',
  gaps,
});

/** RideState as RidePlugin.setState makes it from what the page tells it. */
const toldState = (recording, phase) => ({
  phase,
  startedAt: recording.startedAt,
  pausedMs: Math.round(pausedSecondsOf(recording) * 1000),
  pausedSince: phase === 'paused' && recording.stoppedAt !== null ? recording.stoppedAt : 0,
  finishedAt: 0,
});

const CLOCKS = {
  'no pause, recording': {
    page: ride({}),
    state: (page) => toldState(page, 'recording'),
    now: 125,
  },
  'one pause, resumed': {
    page: ride({ gaps: [paused(60, 90)] }),
    state: (page) => toldState(page, 'recording'),
    now: 200,
  },
  'a pause still running': {
    page: ride({ gaps: [paused(30, 45)], stoppedAt: 100 }),
    state: (page) => toldState(page, 'paused'),
    now: 400,
  },
  'several pauses, two touching and one inside another': {
    page: ride({
      gaps: [
        paused(10, 20),
        paused(20, 35),
        paused(100, 160),
        paused(110, 130),
        paused(300, 301.5),
      ],
    }),
    state: (page) => toldState(page, 'recording'),
    now: 3_725,
  },
  'a pause tapped on the notification': {
    // Recording, then Pause tapped at 250 s; the page, waking, stops the ride there.
    page: ride({ gaps: [paused(60, 90)], stoppedAt: 250 }),
    state: () => ({
      ...toldState(ride({ gaps: [paused(60, 90)] }), 'recording'),
      phase: 'paused',
      pausedSince: s(250),
    }),
    now: 900,
  },
  'a resume tapped on the notification': {
    // Paused by a tap at 250 s, resumed by a tap at 410 s; the page, waking, adds the pause.
    page: ride({ gaps: [paused(60, 90), paused(250, 410)] }),
    state: () => {
      const tapped = {
        ...toldState(ride({ gaps: [paused(60, 90)] }), 'recording'),
        phase: 'paused',
        pausedSince: s(250),
      };
      return {
        ...tapped,
        phase: 'recording',
        pausedMs: tapped.pausedMs + (s(410) - tapped.pausedSince),
        pausedSince: 0,
      };
    },
    now: 500,
  },
  'a finish tapped on the notification': {
    // Finish tapped at 640 s while recording; the page, waking, stops the ride there.
    page: ride({ gaps: [paused(60, 90)], stoppedAt: 640 }),
    state: () => ({
      ...toldState(ride({ gaps: [paused(60, 90)] }), 'recording'),
      phase: 'finished',
      finishedAt: s(640),
    }),
    now: 2_000,
  },
};

/** The card's clock in milliseconds, as useLiveFigures works it out with fixes coming in. */
function cardClockMs(recording, now) {
  const isRecording = recording.status === 'recording';
  const end = summaryEnd(recording, isRecording, now, now);
  const summary = summarize([], recording.gaps, recording.startedAt, end);
  return liveFigures(recording, summary, isRecording, now).elapsedSeconds * 1000;
}

test(`the notification's clock reads what the card's does (${Object.keys(CLOCKS).length} rides)`, () => {
  const cases = Object.entries(CLOCKS).map(([name, { page, state, now }]) => ({
    name,
    page,
    state: state(page),
    now: s(now),
  }));
  const native = runJava(
    cases.map(
      ({ state, now }) =>
        `elapsed ${state.phase} ${state.startedAt} ${state.pausedMs} ${state.pausedSince} ${state.finishedAt} ${now}`,
    ),
  );
  cases.forEach(({ name, page, now }, index) => {
    const nativeMs = Number(native[index]);
    const cardMs = cardClockMs(page, now);
    // pausedSeconds crosses as a double and is rounded to the millisecond.
    assert.ok(Math.abs(nativeMs - cardMs) < 1, `${name}: native ${nativeMs} ms, card ${cardMs} ms`);
    assert.equal(
      runJava([`time ${Math.trunc(nativeMs / 1000)}`])[0],
      said(timeFigure(cardMs / 1000)),
      name,
    );
  });
});
