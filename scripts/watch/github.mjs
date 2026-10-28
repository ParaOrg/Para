// The few GitHub REST calls the watch makes, with the workflow's own GITHUB_TOKEN. It reads
// workflow runs and reads and writes issues, nothing else.

import { ALERT_LABEL } from './alerts.mjs';

const API = 'https://api.github.com';

/** A client for one repository (`owner/name`). */
export function gitHub({ repository, token }) {
  async function call(method, path, body) {
    const response = await fetch(`${API}/repos/${repository}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 404 && method === 'GET') return null;
    if (!response.ok) {
      throw new Error(
        `GitHub ${method} ${path} answered ${response.status}: ${await response.text()}`,
      );
    }
    return response.status === 204 ? null : response.json();
  }

  return {
    /** Recent runs of one workflow file, newest first, with `status` e.g. `success`. */
    async workflowRuns(file, status) {
      const answer = await call(
        'GET',
        `/actions/workflows/${file}/runs?status=${status}&per_page=30`,
      );
      return answer?.workflow_runs ?? [];
    },

    /** The `alert` issues, open and closed, most recently updated first. */
    async alertIssues() {
      const answer = await call(
        'GET',
        `/issues?labels=${ALERT_LABEL}&state=all&sort=updated&direction=desc&per_page=100`,
      );
      return (answer ?? [])
        .filter((item) => !item.pull_request)
        .map((item) => ({
          number: item.number,
          state: item.state,
          body: item.body ?? '',
          closedAt: item.closed_at,
        }));
    },

    /** Does what `planAlerts` decided. */
    async apply(action) {
      if (action.type === 'create') {
        await ensureLabel();
        const issue = await call('POST', '/issues', {
          title: action.title,
          body: action.body,
          labels: [ALERT_LABEL],
        });
        return issue.number;
      }
      if (action.type === 'reopen') {
        await call('PATCH', `/issues/${action.number}`, { state: 'open', body: action.body });
      }
      if (action.type === 'update') {
        await call('PATCH', `/issues/${action.number}`, { body: action.body });
      }
      if (action.comment) {
        await call('POST', `/issues/${action.number}/comments`, { body: action.comment });
      }
      if (action.type === 'close') {
        await call('PATCH', `/issues/${action.number}`, {
          state: 'closed',
          state_reason: 'completed',
        });
      }
      return action.number;
    },
  };

  async function ensureLabel() {
    if (await call('GET', `/labels/${ALERT_LABEL}`)) return;
    await call('POST', '/labels', {
      name: ALERT_LABEL,
      color: 'd73a4a',
      description: 'Something live is broken; opened and closed by the watch',
    });
  }
}
