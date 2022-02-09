import fetch from 'node-fetch';
import github from '@actions/github';
import core from '@actions/core';
// const github = require('@actions/github');
// const core = require('@actions/core')

const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
const JIRA_SERVER_URL = "https://academicmerit.atlassian.net/rest/api/3"

const requestJira = async (url, method, body = undefined) => {
  const response = await fetch(`${JIRA_SERVER_URL}${url}`, {
    method,
    body,
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`
      ).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  });
  if (response.ok) {
    return response.status !== 204 ? await response.json() : null;
  }
  core.setFailed(`Action failed for JIRA request ${url} with error ${response.statusText}`);
}

const getBranch = async (branch) => {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  try {
    const response = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch
    });
    return response
  } catch (err) {
    if (err.message === "Branch not found") {
      return undefined;
    }
    core.setFailed(`Action failed to get branch with error ${err}`);
  }
};

const getUnreleasedVersions = async () => {
  const response = await requestJira(
    '/project/FY/version?status=unreleased',
    'GET',
  );
  return response.values
}

const getIssueFixVersion = async (issueKey) => {
  const response = await requestJira(
    `/issue/${issueKey}?fields=fixVersions`,
    'GET',
  );
  core.info(response.fields)
  return response.fields.fixVersions
}

const updateIssueFixVersion = async (issueKey, fixVersions) => {
  const body =  JSON.stringify({
    update: { fixVersions }
  });
  const response = await requestJira(
    `/issue/${issueKey}`,
    'PUT',
    body,
  );
  return response
}

const getCurrentStandardRelease = (releases) => {
  const currentStandardRelease = releases.find(({ name }) => /^release.*.0$/i.test(name))
  return currentStandardRelease.name
}

const getIssuesFromCommits = (commits) => {
  const issues = [];
  commits.forEach(({ message }) => {
    const matches = message.match(/(FY|PREAP|TI)-\d+/ig);
    if (matches) {
      issues.push(...matches)
    }
  })
  return new Set(issues)
}

const run = async () => {
  const releaseVersions = await getUnreleasedVersions();
  const currentStandardRelease = getCurrentStandardRelease(releaseVersions);
  const actionBranch = process.env.GITHUB_REF_NAME;
  const releaseBranch = actionBranch.startsWith("release-") ?
    actionBranch : (await getBranch('release-candidate') || await getBranch(currentStandardRelease));
  const commits = github.context.payload.commits
  const issues = getIssuesFromCommits(commits)

  if (actionBranch === 'master' && !releaseBranch) {
    return issues.forEach((issue) =>
      updateIssueFixVersion(issue, [{ add: { name: currentStandardRelease } }])
    )
  }
  
  if (actionBranch === 'master' && !!releaseBranch) {
    /*
    Check if issue has fix version in case it was merged to RC first
    If not tag issue with release-next
    */
    return issues.forEach((issue) => {
      const issueFixVersion = getIssueFixVersion(issue)
      const hasCurrentFixVersion = issueFixVersion.some(({ name }) => name === currentStandardRelease)
      if (!hasCurrentFixVersion) {
        updateIssueFixVersion(issue, [{ add: { name: 'release-next' } }])
      }
    })
  }

  /*
  if branch is not master, it is release
  Remove release next from issue and add release version
  */
  return issues.forEach((issue) => {
    const issueFixVersion = getIssueFixVersion(issue)
    console.log('issue fix version', issueFixVersion)
    const hasReleaseNextVersion = issueFixVersion.some(({ name }) => name === 'release-next')
    if (hasReleaseNextVersion) {
      updateIssueFixVersion(
        issue,
        [
          { remove: { name: 'release-next' } },
          { add: { name: currentStandardRelease } }
        ]
      );
    }
  });
};

run();

// Test deployment
// (function test () {
//   console.log('Run successful');
// }());
