import * as z from 'zod/mini';

import { requireClient } from './require-client';
import { answerError } from './upload-contribution';

/** One of the account's uploads, as the database holds it: whichever phone sent it. */
export interface AccountUpload {
  id: string;
  startedAt: number;
  stoppedAt: number;
  startPointName: string;
  endPointName: string;
  description: string;
}

const MAX_UPLOADS = 500;

const uploadRowsSchema = z.array(
  z.object({
    id: z.string(),
    started_at: z.string(),
    ended_at: z.string(),
    start_name: z.nullable(z.string()),
    end_name: z.nullable(z.string()),
    description: z.nullable(z.string()),
  }),
);

/**
 * Every upload the signed-in account owns, newest first; row security answers no one else's. It
 * keeps the newest MAX_UPLOADS: TODO paginate if an account ever sends more.
 */
export async function fetchAccountUploads(): Promise<AccountUpload[]> {
  const client = await requireClient();
  const { data, error, status } = await client
    .from('contribution')
    .select('id, started_at, ended_at, start_name, end_name, description')
    .order('started_at', { ascending: false })
    .limit(MAX_UPLOADS);
  if (error) throw answerError(error, status);
  return uploadRowsSchema.parse(data).map((row) => ({
    id: row.id,
    startedAt: Date.parse(row.started_at),
    stoppedAt: Date.parse(row.ended_at),
    startPointName: row.start_name ?? '',
    endPointName: row.end_name ?? '',
    description: row.description ?? '',
  }));
}
