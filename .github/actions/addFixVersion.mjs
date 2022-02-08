import fetch from 'node-fetch';
import github from '@actions/github';
import core from '@actions/core';
// const github = require('@actions/github');
// const core = require('@actions/core')

const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
const JIRA_SERVER_URL = "https://academicmerit.atlassian.net/rest/api/3"

const requestJira = async (url, method) => {
  const response = await fetch(`${JIRA_SERVER_URL}${url}`, {
    method,
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`
      ).toString('base64')}`,
      'Accept': 'application/json'
    }
  })
  if (response.ok) {
    return await response.json();
  }
  core.setFailed(`Action failed for JIRA request ${url} with error ${response.statusText}`)
}

const getBranch = async (branch) => {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
  try {
    const response = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch
    });
    return response
  } catch (err) {
    if (err.message === "Branch not found") {
      return undefined
    }
    core.setFailed(`Action failed to get branch with error ${err}`)
  }
};

const getUnreleasedVersions = async () => {
  const response = await requestJira(
    '/project/FY/version?status=unreleased',
    'GET',
  )
  return response.values
}

const getIssueFixVersion = async (issueKey) => {
  const response = await requestJira(
    `/issue/${issueKey}?fields=fixVersions`,
    'GET',
  )
  return response.fields.fixVersions
}

const getCurrentStandardRelease = (releases) => {
  const currentStandardRelease = releases.find(({ name }) => /^release.*.0$/.test(name))
  return currentStandardRelease.name
}

const run = async () => {
  // const branch = await getBranch('dev')
  // console.log('branch', branch)
  const event = github.context
  console.log('event', event.payload.commits)
  console.log(event.payload.commits.length)

  const releaseVersions = await getUnreleasedVersions()
  console.log('release versions', releaseVersions)

  const currentStandardRelease = getCurrentStandardRelease(releaseVersions)
  console.log('currentStandardRelease', currentStandardRelease)

  const issue = await getIssueFixVersion('FY-23471')
  console.log('issue', issue)
};

run();