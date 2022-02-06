const run = async () => {
  console.log(process.env.GITHUB_REF_NAME)
  console.log(process.env.GITHUB_API_URL)
  const response = await fetch(`${process.env.GITHUB_API_URL}/repos/tomipaul/CollegeBoard/branches`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/vnd.github.v3+json'
    },
  })
  console.log('response', response)
};

run();