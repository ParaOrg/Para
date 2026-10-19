import * as z from 'zod/mini';

import { contributeClient, type ContributeClient } from './contribute-client';
import type { ContributionPayload } from './contribution-payload-schema';

/**
 * Why an upload or a delete did not go through.
 * - `offline`: no answer; the same request will be tried again.
 * - `day-cap`: 20 uploads in 24 hours; tried again later.
 * - `refused`: the database will never take this recording as it is.
 * - `blocked`: this phone may not upload.
 * - `check-failed`: the bot check was not passed; tried again on the next attempt.
 * - `unavailable`: this build has no database to upload to.
 */
export type UploadProblem =
  'offline' | 'day-cap' | 'refused' | 'blocked' | 'check-failed' | 'unavailable';

export class UploadError extends Error {
  readonly problem: UploadProblem;
  constructor(problem: UploadProblem, detail: string) {
    super(detail);
    this.name = 'UploadError';
    this.problem = problem;
  }
}

interface DatabaseError {
  code?: string;
  message: string;
}

/** Sorts an answer's error into what the page does next. Anything unknown is treated as no signal. */
export function problemOf(error: DatabaseError): UploadProblem {
  if (error.code === 'P0001') return error.message.startsWith('day_cap') ? 'day-cap' : 'refused';
  if (error.code === '42501') return 'blocked';
  if (error.code === '23514' || error.code === '22P02' || error.code === '22023') return 'refused';
  return 'offline';
}

async function requireClient(): Promise<ContributeClient> {
  const client = contributeClient();
  if (!client) throw new UploadError('unavailable', 'This page has no database to upload to.');
  try {
    return await client;
  } catch (error) {
    // The client's own code did not load: no signal, most likely.
    throw new UploadError('offline', `The upload code did not load: ${String(error)}`);
  }
}

/**
 * The phone's anonymous identity, signing in on first use. `captchaToken` is the
 * Turnstile answer, needed once Supabase asks for one.
 */
export async function ensureSignedIn(captchaToken?: string): Promise<string> {
  const client = await requireClient();
  const { data } = await client.auth.getSession();
  if (data.session) return data.session.user.id;
  const signedIn = await client.auth.signInAnonymously(
    captchaToken ? { options: { captchaToken } } : undefined,
  );
  if (signedIn.error || !signedIn.data.user) {
    const message = signedIn.error?.message ?? 'no user';
    const problem = /captcha/i.test(message) ? 'check-failed' : 'offline';
    throw new UploadError(problem, `Signing in failed: ${message}`);
  }
  return signedIn.data.user.id;
}

/** The phone's identity now, or null before its first upload. */
export async function currentIdentity(): Promise<string | null> {
  const client = await requireClient();
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

const saveAnswerSchema = z.enum(['saved', 'already saved']);

/**
 * Sends one recording. Safe to repeat: the database keys it by the id the phone
 * made, so a resend answers 'already saved' and stores nothing twice.
 */
export async function uploadContribution(
  payload: ContributionPayload,
): Promise<'saved' | 'already saved'> {
  const client = await requireClient();
  const { data, error } = await client.rpc('save_contribution', { recording: payload });
  if (error) throw new UploadError(problemOf(error), error.message);
  const answer = saveAnswerSchema.safeParse(data);
  if (!answer.success) throw new UploadError('offline', `Unexpected answer: ${String(data)}`);
  return answer.data;
}

/** The ids of this phone's own uploads still in ParaPo; row security answers no one else's. */
export async function uploadsStillThere(): Promise<Set<string>> {
  const client = await requireClient();
  const { data, error } = await client.from('contribution').select('id');
  if (error) throw new UploadError(problemOf(error), error.message);
  return new Set(
    z
      .array(z.object({ id: z.string() }))
      .parse(data)
      .map((row) => row.id),
  );
}

/**
 * Removes an uploaded recording from the database, with its points and hintos.
 * The phone's own copy is untouched. Removing one already gone is not an error.
 */
export async function removeUpload(contributionId: string): Promise<void> {
  const client = await requireClient();
  const { error } = await client.from('contribution').delete().eq('id', contributionId);
  if (error) throw new UploadError(problemOf(error), error.message);
}
