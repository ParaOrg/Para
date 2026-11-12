// The first step of the contributor app's release, before anything is built or the signing key
// is touched: refuses a tag that should not go out. A wrong tag that became "latest" would make
// every later, real release look older to the phones, so the checks come first:
//
//   - the tagged commit is a commit of main;
//   - CI's two summary checks passed for that commit;
//   - the version is one step after the last release: its next patch, minor or major.
//
// The nightly "Publish map" commits change only public/data/ and run no CI, and a release is
// often tagged the day after, with one of them on main's tip. So the CI result read is that of
// the nearest commit under them: the release's own.
//
// The same tag run again is the same release. The first release may carry any version.
//
//   GITHUB_REPOSITORY=ParaOrg/Para GITHUB_REF_NAME=app-v1.2.3 GITHUB_SHA=... GITHUB_TOKEN=... \
//     node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs scripts/publish/release-guard.mjs
import { pathToFileURL } from 'node:url';

import { versionCodeOf } from '../../src/features/contribute/app-update/version-code.ts';

/** CI's summary checks (ci.yml): each passes only when everything under it did. */
export const REQUIRED_CHECKS = ['Build and the public map', 'The editor'];

/** How far back the release's own commit is looked for under the nightly publishes. */
const MAX_COMMITS_BACK = 30;

/** Whether a commit changed the published map's files and nothing else, as a nightly publish does. */
const isDataOnly = (files) => files.length > 0 && files.every((f) => f.startsWith('public/data/'));

/** Whether CI's result for a commit has to be read off the commit under it. */
const speaksThroughParent = ({ files, checks }) =>
  isDataOnly(files) && !REQUIRED_CHECKS.some((name) => name in checks);

/**
 * The CI results that speak for a tagged commit. `commits` are the tagged commit and those under
 * it, newest first, each with the files it changed and its checks' conclusions by name. A commit
 * that changed only public/data/ and ran no CI is stepped over; the first that is not, speaks.
 * None found: no result at all.
 */
export function checksFor(commits) {
  return commits.find((commit) => !speaksThroughParent(commit))?.checks ?? {};
}

const TAG = /^app-v(\d+\.\d+\.\d+)$/;
/** A release tag's version, or null for any other tag (test-latest among them). */
const versionOf = (tag) => {
  const version = TAG.exec(tag)?.[1];
  return version !== undefined && versionCodeOf(version) !== null ? version : null;
};

/** The versions one step after `version`: its next patch, its next minor, its next major. */
const nextSteps = (version) => {
  const [major, minor, patch] = version.split('.').map(Number);
  return [`${major}.${minor}.${patch + 1}`, `${major}.${minor + 1}.0`, `${major + 1}.0.0`];
};

/**
 * Why `tag` may not go out as a release, in one sentence for the owner, or null when it may.
 * `isOnMain`: the tagged commit is a commit of main. `checks`: each check's conclusion for that
 * commit, by name. `released`: the tags of the releases already published, this one among them
 * when its run is repeated.
 */
export function releaseRefusal({ tag, isOnMain, checks, released }) {
  const version = versionOf(tag);
  if (version === null) {
    return `The tag ${tag} is not app-v<major up to 2100>.<minor up to 999>.<patch up to 999>.`;
  }
  if (!isOnMain) {
    return `The tag ${tag} is not on main. A release is tagged on a commit of main, after staging was merged into it. Delete the tag and tag main's release commit.`;
  }
  for (const name of REQUIRED_CHECKS) {
    const conclusion = checks[name];
    if (conclusion === undefined) {
      return `"${name}" has not run for the commit ${tag} is on. Wait for main's CI to finish, then run this workflow again.`;
    }
    if (conclusion !== 'success') {
      return `"${name}" did not pass (${conclusion}) for the commit ${tag} is on. Wait for it, or fix main, before tagging.`;
    }
  }
  const earlier = released
    .filter((other) => other !== tag)
    .map(versionOf)
    .filter((other) => other !== null);
  if (earlier.length === 0) return null;
  const codeOf = (other) => versionCodeOf(other) ?? 0;
  const last = earlier.reduce((a, b) => (codeOf(b) > codeOf(a) ? b : a));
  if (codeOf(version) <= codeOf(last)) {
    return `${version} is not newer than the last release, ${last}. The phones would never see it. Delete the tag and use a newer version.`;
  }
  const steps = nextSteps(last);
  if (!steps.includes(version)) {
    return `${version} is not one step after ${last}. The next release is ${steps[0]}, ${steps[1]} or ${steps[2]}: a jump would make every later release look older to the phones. Delete the tag and use one of those.`;
  }
  return null;
}

/** GitHub's answer for a path of this repository, or null for a 404. */
async function gitHub(path, { repository, token }) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${path} answered ${response.status}`);
  return response.json();
}

/** The tagged commit and those under it, newest first, as far back as checksFor has to read. */
async function commitsFrom(sha, repo) {
  const commits = [];
  for (let at = sha; at && commits.length < MAX_COMMITS_BACK;) {
    const [commit, runs] = await Promise.all([
      gitHub(`/commits/${at}`, repo),
      gitHub(`/commits/${at}/check-runs?filter=latest&per_page=100`, repo),
    ]);
    const read = {
      files: (commit?.files ?? []).map((file) => file.filename),
      checks: Object.fromEntries(
        (runs?.check_runs ?? []).map((run) => [run.name, run.conclusion ?? run.status]),
      ),
    };
    commits.push(read);
    if (!speaksThroughParent(read)) break;
    at = commit?.parents?.[0]?.sha;
  }
  return commits;
}

async function main() {
  const env = process.env;
  const repo = { repository: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN };
  const sha = env.GITHUB_SHA;
  // main compared with the tagged commit: `ahead` or `identical` when the commit is in main.
  const compared = await gitHub(`/compare/${sha}...main`, repo);
  const releases = (await gitHub('/releases?per_page=100', repo)) ?? [];
  const refusal = releaseRefusal({
    tag: env.GITHUB_REF_NAME,
    isOnMain: compared?.status === 'ahead' || compared?.status === 'identical',
    checks: checksFor(await commitsFrom(sha, repo)),
    released: releases
      .filter((release) => !release.draft && !release.prerelease)
      .map((release) => release.tag_name),
  });
  if (refusal) {
    console.log(`::error::Not releasing. ${refusal}`);
    process.exit(1);
  }
  console.log(`${env.GITHUB_REF_NAME} may go out: on main, CI green, one step after the last.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
