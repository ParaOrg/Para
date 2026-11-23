import type { Database } from '@/shared/types/database.types';

import type { ContributeClient } from './contribute-client';

/** The database functions this page calls. A name not listed here does not compile. */
export type RpcName =
  | 'begin_claim'
  | 'delete_my_account'
  | 'finish_claim'
  | 'get_my_stats'
  | 'get_my_uses'
  | 'get_profile'
  | 'save_contribution'
  | 'set_profile';

type RpcArgs<TName extends RpcName> = Database['public']['Functions'][TName]['Args'];

/** The function answered. `data` is unchecked: each caller validates it with its own schema. */
export interface RpcAnswer {
  kind: 'answer';
  data: unknown;
}

/** The function did not answer, or refused. `isOffline` is no answer at all (HTTP status 0). */
export interface RpcFailure {
  kind: 'failure';
  isOffline: boolean;
  status: number;
  code: string;
  message: string;
}

export type RpcResult = RpcAnswer | RpcFailure;

/**
 * Calls one database function. Never throws for a refusal or a lost connection: each caller sorts
 * the failure by its own rules. `signal` calls the request off; then it fails as offline.
 */
export async function callRpc<TName extends RpcName>(
  client: ContributeClient,
  name: TName,
  args?: RpcArgs<TName>,
  signal?: AbortSignal,
): Promise<RpcResult> {
  const asked = client.rpc(name, args);
  const { data, error, status } = await (signal ? asked.abortSignal(signal) : asked);
  if (!error) return { kind: 'answer', data };
  return {
    kind: 'failure',
    isOffline: status === 0,
    status,
    code: error.code,
    message: error.message,
  };
}
