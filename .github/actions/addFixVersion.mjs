import fetch from 'node-fetch';
import github from '@actions/github';
import core from '@actions/core';
// const github = require('@actions/github');
// const core = require('@actions/core')

const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
const JIRA_SERVER_URL = "https://academicmerit.atlassian.net"

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

const getReleaseVersions = async () => {
  const response = await fetch(`${JIRA_SERVER_URL}/rest/api/3/project/FY/versions`, {
    method: 'GET',
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
  core.setFailed(`Action failed to get project versions with error ${response.statusText}`)
}

const run = async () => {
  const branch = await getBranch('dev')
  console.log('branch', branch)

  const releaseVersions = await getReleaseVersions()
  console.log('release versions', releaseVersions)
};

run();