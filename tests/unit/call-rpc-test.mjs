// How the contributor page calls a database function (src/features/contribute/api/call-rpc.ts):
// the answer or failure callRpc gives, the AccountError a page without a client gets, the one
// get_profile fetcher and the one "no answer" check for a failed Auth call. Then it pins every
// error a caller of those functions can see, word for word: the AccountError or UploadError kind
// and message each failure becomes, and the console.warn it logs, so a change to any of them
// fails here first.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/call-rpc-test.mjs
import { before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { hasProfileOf } from '../../src/features/contribute/api/account.ts';
import { accountClient } from '../../src/features/contribute/api/account-client.ts';
import {
  AccountError,
  accountProblemOf,
} from '../../src/features/contribute/api/account-problem.ts';
import { callRpc } from '../../src/features/contribute/api/call-rpc.ts';
import { CLAIM_TOKEN_KEY } from '../../src/features/contribute/api/claim-token.ts';
import { setContributeClient } from '../../src/features/contribute/api/contribute-client.ts';
import { deleteAccount } from '../../src/features/contribute/api/delete-account.ts';
import {
  aroundEarlierIdentity,
  finishPendingClaim,
} from '../../src/features/contribute/api/earlier-identity.ts';
import { fetchMyStats } from '../../src/features/contribute/api/fetch-my-stats.ts';
import { fetchProfile } from '../../src/features/contribute/api/fetch-profile.ts';
import { fetchStoredProfile } from '../../src/features/contribute/api/profile.ts';
import { saveProfile } from '../../src/features/contribute/api/sign-up.ts';
import { uploadContribution } from '../../src/features/contribute/api/upload-contribution.ts';
import {
  UploadError,
  isNoAnswer,
  signInProblemOf,
} from '../../src/features/contribute/api/upload-problem.ts';

// A stand-in for the contributor page's Supabase client, for checks of the database functions it
// calls (src/features/contribute/api/call-rpc.ts and its callers). `rpc(name, args)` answers with
// `answer(call)`, a { data, error, status } as supabase-js gives, and like supabase-js's builder
// it is awaited directly or after `.abortSignal(signal)`. Every call is kept in `calls` as
// { name, args, signal }. `session` is what auth.getSession() answers; signOut always succeeds.
function stubRpcClient(answer, { session = null } = {}) {
  const calls = [];
  const client = {
    calls,
    session,
    rpc(name, args) {
      const call = { name, args, signal: undefined };
      calls.push(call);
      const builder = {
        abortSignal(signal) {
          call.signal = signal;
          return builder;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => answer(call))
            .then(resolve, reject);
        },
      };
      return builder;
    },
    auth: {
      getSession: async () => ({ data: { session: client.session }, error: null }),
      signOut: async () => ({ error: null }),
    },
  };
  return client;
}

/** The answer supabase-js gives when the function answered. */
const answered = (data) => ({ data, error: null, status: 200 });

/** The answer supabase-js gives when the request never got one: status 0. */
const noAnswer = (message = 'TypeError: Failed to fetch') => ({
  data: null,
  error: { code: '', message, details: '', hint: '' },
  status: 0,
});

/** The answer supabase-js gives when the function refused. */
const refused = (status, code, message) => ({
  data: null,
  error: { code, message, details: '', hint: '' },
  status,
});

/**
 * Runs `run`, answering what it returned or threw, and console.warn's calls meanwhile as arrays
 * of arguments: { value, error, warns }.
 */
async function outcomeOf(run) {
  const original = console.warn;
  const warns = [];
  console.warn = (...args) => warns.push(args);
  try {
    return { value: await run(), error: undefined, warns };
  } catch (error) {
    return { value: undefined, error, warns };
  } finally {
    console.warn = original;
  }
}

test('an answer is the data, unchecked', async () => {
  const client = stubRpcClient(() => answered([{ name: 'Ana', phone: null }]));
  assert.deepEqual(await callRpc(client, 'get_profile'), {
    kind: 'answer',
    data: [{ name: 'Ana', phone: null }],
  });
});

test('no answer (status 0) is a failure that is offline', async () => {
  const client = stubRpcClient(() => noAnswer('TypeError: Failed to fetch'));
  assert.deepEqual(await callRpc(client, 'get_my_stats'), {
    kind: 'failure',
    isOffline: true,
    status: 0,
    code: '',
    message: 'TypeError: Failed to fetch',
  });
});

test('a refusal is a failure with its status, code and message', async () => {
  const client = stubRpcClient(() => refused(400, 'P0001', 'day_cap: 20 a day'));
  assert.deepEqual(await callRpc(client, 'save_contribution', { recording: {} }), {
    kind: 'failure',
    isOffline: false,
    status: 400,
    code: 'P0001',
    message: 'day_cap: 20 a day',
  });
});

test('the arguments go to the function, and a signal only when one is given', async () => {
  const client = stubRpcClient(() => answered(null));
  const controller = new AbortController();
  await callRpc(client, 'set_profile', { name: 'Ana', phone: '+639171234567' });
  await callRpc(client, 'get_profile', undefined, controller.signal);
  assert.deepEqual(client.calls, [
    { name: 'set_profile', args: { name: 'Ana', phone: '+639171234567' }, signal: undefined },
    { name: 'get_profile', args: undefined, signal: controller.signal },
  ]);
});

// Before the describe below hands the page its stand-in: until then Node's page has no database.
test('a page with no database is unavailable, word for word', async () => {
  for (const run of [accountClient, fetchProfile]) {
    const { error } = await outcomeOf(run);
    assert.ok(error instanceof AccountError);
    assert.equal(error.problem, 'unavailable');
    assert.equal(error.message, 'UploadError: This page has no database to upload to.');
  }
});

test('get_profile: the first row, nulls kept, and no row is both null', async () => {
  const rows = [
    [[{ name: 'Ana', phone: '+639171234567' }], { name: 'Ana', phone: '+639171234567' }],
    [[{ name: null, phone: null }], { name: null, phone: null }],
    [[], { name: null, phone: null }],
  ];
  for (const [data, expected] of rows) {
    const client = stubRpcClient(() => answered(data));
    assert.deepEqual(await fetchStoredProfile(client), expected);
  }
});

test('get_profile: a signal given is applied to the request', async () => {
  const client = stubRpcClient(() => answered([]));
  const controller = new AbortController();
  await fetchStoredProfile(client, controller.signal);
  assert.equal(client.calls[0].signal, controller.signal);
});

test('get_profile: a row not in the form expected, or not an array, is not-accepting', async () => {
  for (const data of [
    { name: 'Ana', phone: null },
    [{ name: 5, phone: null }],
    [{ name: 'Ana' }],
  ]) {
    const client = stubRpcClient(() => answered(data));
    const { error, warns } = await outcomeOf(() => fetchStoredProfile(client));
    assert.ok(error instanceof AccountError);
    assert.equal(error.problem, 'not-accepting');
    assert.equal(error.message, 'The profile is not in the form expected.');
    assert.deepEqual(warns, []);
  }
});

test('isNoAnswer: a failed fetch, a retryable fetch error or status 0, and nothing else', () => {
  assert.equal(isNoAnswer({ name: 'TypeError' }), true);
  assert.equal(isNoAnswer({ name: 'AuthRetryableFetchError', status: 500 }), true);
  assert.equal(isNoAnswer({ name: 'AuthApiError', status: 0 }), true);
  assert.equal(isNoAnswer({ name: 'AuthApiError', status: 400 }), false);
  assert.equal(isNoAnswer({ name: 'AuthApiError' }), false);
});

test('both Auth sorters read no answer as offline and any other answer as not-accepting', () => {
  const lost = { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 };
  const other = { name: 'AuthApiError', message: 'Database error', status: 500 };
  assert.equal(accountProblemOf(lost), 'offline');
  assert.equal(signInProblemOf(lost), 'offline');
  assert.equal(accountProblemOf(other), 'not-accepting');
  assert.equal(signInProblemOf(other), 'not-accepting');
});

const ACCOUNT_ID = 'cccccccc-0000-4000-8000-000000000001';
const TOKEN = '00000000-0000-4000-8000-000000000001';
const ACCOUNT_SESSION = { user: { id: ACCOUNT_ID, email: 'ana@example.com', is_anonymous: false } };
const ANONYMOUS_SESSION = {
  user: { id: 'aaaaaaaa-0000-4000-8000-000000000002', is_anonymous: true },
};

const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: (key) => stored.delete(key),
};

let nextAnswer = () => answered(null);
const client = stubRpcClient((call) => nextAnswer(call), { session: ACCOUNT_SESSION });
describe('every error a caller sees, word for word', () => {
  before(() => setContributeClient(client));

  beforeEach(() => {
    stored.clear();
    client.calls.length = 0;
    client.session = ACCOUNT_SESSION;
  });

  /** Answers every database call with `answer`, runs `run` and gives { value, error, warns }. */
  function whenAnswered(answer, run) {
    nextAnswer = () => answer;
    return outcomeOf(run);
  }

  function assertError(error, ErrorClass, problem, message) {
    assert.ok(error instanceof ErrorClass, `expected ${ErrorClass.name}, got ${String(error)}`);
    assert.equal(error.problem, problem);
    assert.equal(error.message, message);
  }

  // get_profile, as the Profile screen asks it: throws.

  test('fetchProfile: no answer is offline, with no warning', async () => {
    const { error, warns } = await whenAnswered(
      noAnswer('TypeError: Failed to fetch'),
      fetchProfile,
    );
    assertError(error, AccountError, 'offline', 'TypeError: Failed to fetch');
    assert.deepEqual(warns, []);
  });

  test('fetchProfile: a refusal is not-accepting, and warned with its status', async () => {
    const { error, warns } = await whenAnswered(refused(500, 'XX000', 'boom'), fetchProfile);
    assertError(error, AccountError, 'not-accepting', 'boom');
    assert.deepEqual(warns, [['Para did not give the profile (HTTP 500):', 'boom']]);
  });

  test('fetchProfile: a row not in the form expected is not-accepting', async () => {
    const { error } = await whenAnswered(answered({ name: 'Ana' }), fetchProfile);
    assertError(error, AccountError, 'not-accepting', 'The profile is not in the form expected.');
  });

  test('fetchProfile: a stored row, with nothing stored read as empty', async () => {
    const { value } = await whenAnswered(answered([{ name: 'Ana', phone: null }]), fetchProfile);
    assert.deepEqual(value, { name: 'Ana', phone: '' });
    const none = await whenAnswered(answered([]), fetchProfile);
    assert.deepEqual(none.value, { name: '', phone: '' });
  });

  // get_profile, as the account check asks it: unknown is taken as stored.

  test('hasProfileOf: no answer is unknown, taken as stored, with no warning', async () => {
    const { value, warns } = await whenAnswered(noAnswer(), () => hasProfileOf(client));
    assert.equal(value, true);
    assert.deepEqual(warns, []);
  });

  test('hasProfileOf: a refusal is unknown, taken as stored, and warned with its status', async () => {
    const { value, warns } = await whenAnswered(refused(404, 'PGRST202', 'no get_profile'), () =>
      hasProfileOf(client),
    );
    assert.equal(value, true);
    assert.deepEqual(warns, [['Para did not give the profile (HTTP 404):', 'no get_profile']]);
  });

  test('hasProfileOf: an answer not in the form expected is unknown, taken as stored', async () => {
    const { value, warns } = await whenAnswered(answered('nope'), () => hasProfileOf(client));
    assert.equal(value, true);
    assert.deepEqual(warns, []);
  });

  test('hasProfileOf: a row with no name, or no row, is no profile', async () => {
    for (const data of [[{ name: null, phone: null }], [{ name: '', phone: null }], []]) {
      const { value } = await whenAnswered(answered(data), () => hasProfileOf(client));
      assert.equal(value, false);
    }
  });

  // get_my_stats.

  test('fetchMyStats: no answer is offline', async () => {
    const { error, warns } = await whenAnswered(noAnswer('TypeError: Load failed'), fetchMyStats);
    assertError(error, AccountError, 'offline', 'TypeError: Load failed');
    assert.deepEqual(warns, []);
  });

  test('fetchMyStats: no get_my_stats yet (404 or PGRST202) is unavailable, with no warning', async () => {
    for (const answer of [refused(404, '', 'Not Found'), refused(400, 'PGRST202', 'Not Found')]) {
      const { error, warns } = await whenAnswered(answer, fetchMyStats);
      assertError(error, AccountError, 'unavailable', 'Not Found');
      assert.deepEqual(warns, []);
    }
  });

  test('fetchMyStats: any other refusal is not-accepting, and warned with its status', async () => {
    const { error, warns } = await whenAnswered(refused(500, 'XX000', 'boom'), fetchMyStats);
    assertError(error, AccountError, 'not-accepting', 'boom');
    assert.deepEqual(warns, [['Para did not give the stats (HTTP 500):', 'boom']]);
  });

  test('fetchMyStats: an answer not in the form expected is not-accepting', async () => {
    for (const data of [[], [{ rides: 1 }], 'nope']) {
      const { error } = await whenAnswered(answered(data), fetchMyStats);
      assertError(error, AccountError, 'not-accepting', 'The stats are not in the form expected.');
    }
  });

  // begin_claim, asked before a password sign-in on an anonymous phone.

  const signIn = async () => ({ error: null });

  test('begin_claim: no answer is offline, and the sign-in is not tried', async () => {
    client.session = ANONYMOUS_SESSION;
    let isTried = false;
    const { error } = await whenAnswered(noAnswer('TypeError: Failed to fetch'), () =>
      aroundEarlierIdentity(client, async () => {
        isTried = true;
        return { error: null };
      }),
    );
    assertError(error, AccountError, 'offline', 'TypeError: Failed to fetch');
    assert.equal(isTried, false);
  });

  test('begin_claim: 42501 signs in without a claim, warned', async () => {
    client.session = ANONYMOUS_SESSION;
    const { error, warns } = await whenAnswered(refused(403, '42501', 'not_anonymous'), () =>
      aroundEarlierIdentity(client, signIn),
    );
    assert.equal(error, undefined);
    assert.deepEqual(warns, [
      ['Para did not begin a claim (not_anonymous); signing in without one.'],
    ]);
    assert.equal(stored.get(CLAIM_TOKEN_KEY), undefined);
  });

  test('begin_claim: any other refusal is not-accepting, and warned with its status', async () => {
    client.session = ANONYMOUS_SESSION;
    const { error, warns } = await whenAnswered(refused(500, 'XX000', 'boom'), () =>
      aroundEarlierIdentity(client, signIn),
    );
    assertError(error, AccountError, 'not-accepting', 'boom');
    assert.deepEqual(warns, [['Para did not begin the claim (HTTP 500):', 'boom']]);
  });

  test('begin_claim: an answer that is not a token is not-accepting, and warned with it', async () => {
    client.session = ANONYMOUS_SESSION;
    const { error, warns } = await whenAnswered(answered('nope'), () =>
      aroundEarlierIdentity(client, signIn),
    );
    assertError(error, AccountError, 'not-accepting', 'begin_claim answered with no token');
    assert.deepEqual(warns, [['Para gave an unexpected answer to begin_claim:', 'nope']]);
  });

  // finish_claim: never throws; its answer decides whether the kept token stays.

  function keepClaim() {
    stored.set(
      CLAIM_TOKEN_KEY,
      JSON.stringify({ token: TOKEN, wasTried: false, accountId: ACCOUNT_ID }),
    );
  }

  test('finish_claim: the token goes with the request, and its answer is how many moved', async () => {
    keepClaim();
    const { value } = await whenAnswered(answered(3), () => finishPendingClaim(client));
    assert.equal(value, 3);
    assert.deepEqual(client.calls, [
      { name: 'finish_claim', args: { token: TOKEN }, signal: undefined },
    ]);
    assert.equal(stored.get(CLAIM_TOKEN_KEY), undefined);
  });

  test('finish_claim: no answer keeps the token, marked as tried', async () => {
    keepClaim();
    const { value } = await whenAnswered(noAnswer(), () => finishPendingClaim(client));
    assert.equal(value, 0);
    assert.equal(JSON.parse(stored.get(CLAIM_TOKEN_KEY)).wasTried, true);
  });

  test('finish_claim: an expired token is dropped', async () => {
    keepClaim();
    const { value } = await whenAnswered(refused(400, 'P0001', 'token_expired'), () =>
      finishPendingClaim(client),
    );
    assert.equal(value, 0);
    assert.equal(stored.get(CLAIM_TOKEN_KEY), undefined);
  });

  test('finish_claim: an answer that is not a count keeps the token, warned with it', async () => {
    keepClaim();
    const { value, warns } = await whenAnswered(answered('nope'), () => finishPendingClaim(client));
    assert.equal(value, 0);
    assert.deepEqual(warns, [['Para gave an unexpected answer to finish_claim:', 'nope']]);
    assert.notEqual(stored.get(CLAIM_TOKEN_KEY), undefined);
  });

  // set_profile.

  const PROFILE = { name: 'Ana', phone: '+639171234567' };

  test('set_profile: no answer is offline', async () => {
    const { error, warns } = await whenAnswered(noAnswer('TypeError: Failed to fetch'), () =>
      saveProfile(PROFILE),
    );
    assertError(error, AccountError, 'offline', 'TypeError: Failed to fetch');
    assert.deepEqual(warns, []);
  });

  test('set_profile: a refusal is profile-not-saved, and warned with its status', async () => {
    const { error, warns } = await whenAnswered(refused(400, '23514', 'bad phone'), () =>
      saveProfile(PROFILE),
    );
    assertError(error, AccountError, 'profile-not-saved', 'bad phone');
    assert.deepEqual(warns, [['Para did not take the profile (HTTP 400):', 'bad phone']]);
  });

  test('set_profile: the name and number go to the function', async () => {
    const { value } = await whenAnswered(answered(null), () => saveProfile(PROFILE));
    assert.deepEqual(client.calls, [{ name: 'set_profile', args: PROFILE, signal: undefined }]);
    assert.deepEqual(value, { id: ACCOUNT_ID, email: 'ana@example.com', hasProfile: true });
  });

  // delete_my_account.

  const deleteAll = () => deleteAccount({ deleteUploads: true });

  test('delete_my_account: with no account signed in it is not asked', async () => {
    client.session = null;
    const { error } = await whenAnswered(answered(null), deleteAll);
    assertError(error, AccountError, 'not-deletable', 'No account is signed in.');
    assert.deepEqual(client.calls, []);
  });

  test('delete_my_account: no answer is offline', async () => {
    const { error, warns } = await whenAnswered(noAnswer('TypeError: Failed to fetch'), deleteAll);
    assertError(error, AccountError, 'offline', 'TypeError: Failed to fetch');
    assert.deepEqual(warns, []);
    assert.deepEqual(client.calls[0].args, { delete_uploads: true });
  });

  test('delete_my_account: 42501 and owns_map_rows are not-deletable, with no warning', async () => {
    for (const answer of [
      refused(403, '42501', 'not_an_account'),
      refused(400, 'P0001', 'owns_map_rows: 3 routes'),
    ]) {
      const { error, warns } = await whenAnswered(answer, deleteAll);
      assertError(error, AccountError, 'not-deletable', answer.error.message);
      assert.deepEqual(warns, []);
    }
  });

  test('delete_my_account: any other refusal is not-accepting, and warned with its status', async () => {
    const { error, warns } = await whenAnswered(refused(500, 'XX000', 'boom'), deleteAll);
    assertError(error, AccountError, 'not-accepting', 'boom');
    assert.deepEqual(warns, [['Para did not delete the account (HTTP 500):', 'boom']]);
  });

  // save_contribution, through answerError.

  const PAYLOAD = { id: 'r1' };

  test('save_contribution: no answer is offline', async () => {
    const { error, warns } = await whenAnswered(noAnswer('TypeError: Failed to fetch'), () =>
      uploadContribution(PAYLOAD),
    );
    assertError(error, UploadError, 'offline', 'TypeError: Failed to fetch');
    assert.deepEqual(warns, []);
  });

  test('save_contribution: each refusal the page knows is its own kind, with no warning', async () => {
    const cases = [
      [refused(400, 'P0001', 'day_cap: 20 a day'), 'day-cap'],
      [refused(400, 'P0001', 'too_short'), 'refused'],
      [refused(403, '42501', 'blocked'), 'blocked'],
      [refused(400, '23514', 'check'), 'refused'],
      [refused(400, '22P02', 'bad json'), 'refused'],
      [refused(400, '22023', 'bad value'), 'refused'],
    ];
    for (const [answer, problem] of cases) {
      const { error, warns } = await whenAnswered(answer, () => uploadContribution(PAYLOAD));
      assertError(error, UploadError, problem, answer.error.message);
      assert.deepEqual(warns, []);
    }
  });

  test('save_contribution: a refusal the page does not know is not-accepting, warned', async () => {
    const { error, warns } = await whenAnswered(refused(500, 'XX000', 'boom'), () =>
      uploadContribution(PAYLOAD),
    );
    assertError(error, UploadError, 'not-accepting', 'boom');
    assert.deepEqual(warns, [['Para did not accept the request (HTTP 500):', 'boom']]);
  });

  test('save_contribution: an answer it does not know is not-accepting, warned with it', async () => {
    const { error, warns } = await whenAnswered(answered('maybe'), () =>
      uploadContribution(PAYLOAD),
    );
    assertError(error, UploadError, 'not-accepting', 'Unexpected answer: maybe');
    assert.deepEqual(warns, [['Para gave an unexpected answer to an upload:', 'maybe']]);
  });

  test('save_contribution: the recording goes to the function, and its answer comes back', async () => {
    const { value } = await whenAnswered(answered('already saved'), () =>
      uploadContribution(PAYLOAD),
    );
    assert.equal(value, 'already saved');
    assert.deepEqual(client.calls, [
      { name: 'save_contribution', args: { recording: PAYLOAD }, signal: undefined },
    ]);
  });
});
