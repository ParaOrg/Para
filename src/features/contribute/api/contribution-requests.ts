import * as z from 'zod/mini';

import { callRpc } from './call-rpc';
import type { ContributionPayload } from './contribution-payload-schema';
import { requireClient } from './require-client';
import { answerError } from './upload-contribution';
import { UploadError } from './upload-problem';

const saveAnswerSchema = z.enum(['saved', 'already saved']);

/**
 * Sends one recording. Safe to repeat: the database keys it by the id the phone
 * made, so a resend answers 'already saved' and stores nothing twice.
 */
export async function uploadContribution(
  payload: ContributionPayload,
): Promise<'saved' | 'already saved'> {
  const client = await requireClient();
  const result = await callRpc(client, 'save_contribution', { recording: payload });
  if (result.kind === 'failure') throw answerError(result, result.status);
  const answer = saveAnswerSchema.safeParse(result.data);
  if (!answer.success) {
    console.warn('Para gave an unexpected answer to an upload:', result.data);
    throw new UploadError('not-accepting', `Unexpected answer: ${String(result.data)}`);
  }
  return answer.data;
}

/** The ids of this phone's own uploads still in Para; row security answers no one else's. */
export async function uploadsStillThere(): Promise<Set<string>> {
  const client = await requireClient();
  const { data, error, status } = await client.from('contribution').select('id');
  if (error) throw answerError(error, status);
  return new Set(
    z
      .array(z.object({ id: z.string() }))
      .parse(data)
      .map((row) => row.id),
  );
}
