import fetch from 'node-fetch';
import github from '@actions/github';
import core from '@actions/core';

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
  return Array.from(new Set(issues))
}

const run = async () => {
  const releaseVersions = await getUnreleasedVersions();
  const releaseNextVersion = 'Release Next';
  const currentStandardRelease = getCurrentStandardRelease(releaseVersions) || releaseNextVersion;
  const actionBranch = process.env.GITHUB_REF_NAME;
  const releaseBranch = actionBranch.startsWith("release-") ?
    actionBranch : (await getBranch('release-candidate') || await getBranch(currentStandardRelease));
  const commits = github.context.payload.commits
  const issues = getIssuesFromCommits(commits)

  if (actionBranch === 'master' && !releaseBranch) {
    return await Promise.all(issues.map((issue) =>
      updateIssueFixVersion(issue, [{ add: { name: currentStandardRelease } }])
    ))
  }
  
  if (actionBranch === 'master' && !!releaseBranch) {
    /*
    Check if issue has fix version in case it was merged to RC first
    If not tag issue with release-next
    */
    return await Promise.all(issues.map(async (issue) => {
      const issueFixVersion = await getIssueFixVersion(issue);
      const hasCurrentFixVersion = issueFixVersion.some(({ name }) => name === currentStandardRelease)
      if (!hasCurrentFixVersion) {
        updateIssueFixVersion(issue, [{ add: { name: releaseNextVersion } }])
      }
    }));
  }

  /*
  if action branch is not master, it is release.
  Add standard release version and remove release next from issue if exists
  */
  return await Promise.all(issues.map(async (issue) => {
    const issueFixVersion = await getIssueFixVersion(issue);
    const hasReleaseNextVersion = issueFixVersion.some(({ name }) => name === releaseNextVersion)
    const fixVersionsUpdate = [{ add: { name: currentStandardRelease } }]
    if (hasReleaseNextVersion) {
      fixVersionsUpdate.push({ remove: { name: releaseNextVersion } })
    }
    updateIssueFixVersion(issue, fixVersionsUpdate);
  }));
};

run();
