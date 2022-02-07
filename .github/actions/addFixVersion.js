const github = require('@actions/github');

const octokit = github.getOctokit(process.env.GITHUB_TOKEN)

const getBranch = async (branch) => {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
  try {
    const response = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch
    });
    return response
  } catch (e) {
    console.log(JSON.stringify(e))
  }
};

const run = async () => {
  // const response = await axios.request({
  //   baseURL: `${process.env.GITHUB_API_URL}`,
  //   url: '/repos/tomipaul/CollegeBoard/branches',
  //   method: 'GET',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     accept: 'application/vnd.github.v3+json'
  //   },
  // })
  const response = await getBranch('master')
  console.log('response', response)
};

run();