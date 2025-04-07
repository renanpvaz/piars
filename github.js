async function fetchNotifications(token) {
  const url = `https://api.github.com/notifications?all=true`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    data = await response.json()

    return data
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

function buildPRQuery(reposAndPRs) {
  const queryParts = reposAndPRs.map(
    ({ owner, repo, number }, index) => `
        pr${index}: repository(owner: "${owner}", name: "${repo}") {
          pullRequest(number: ${number}) {
            number
            title
            url
            changedFiles
            author { login }
            isDraft
            createdAt
            reviewDecision
            reviewRequests(first: 10) {
                nodes {
                    asCodeOwner
                    requestedReviewer {
                        ... on User {
                            login
                        }
                        ... on Bot {
                            login
                        }
                        ... on Mannequin {
                            login
                        }
                        ... on Team {
                            name
                        }
                    }
                }

            }
            state
            repository {
              nameWithOwner
            }
          }
        }
      `,
  )

  return `
        query {
          ${queryParts.join('\n')}
        }
      `
}

async function fetchPullRequests(token, query) {
  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const data = await response.json()

    return data
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

async function enrichWithPullRequestData(token, notifications) {
  const prNotifications = notifications.filter(
    (n) => n.subject.type === 'PullRequest',
  )
  const pullRequests = prNotifications.map((n) => ({
    owner: n.repository.owner.login,
    repo: n.repository.name,
    number: +n.subject.url.split('/').pop(),
  }))

  const query = buildPRQuery(pullRequests)
  const { data } = await fetchPullRequests(token, query)

  const pullsPerRepo = Object.values(data).reduce((acc, { pullRequest }) => {
    if (!pullRequest) return acc

    const name = pullRequest.repository.nameWithOwner

    if (!(name in acc)) acc[name] = {}
    acc[name][pullRequest.number] = pullRequest

    return acc
  }, {})

  return prNotifications.map((n) => {
    const [org, repositoryName, _, pullNumber] = n.subject.url
      .replace('https://api.github.com/repos/', '')
      .split('/')
    const name = `${org}/${repositoryName}`
    const pullRequest = pullsPerRepo[name] && pullsPerRepo[name][pullNumber]

    return toEntry(n, pullRequest)
  })
}

function pollNotifications(accessToken, callback) {
  const cb = () => {
    fetchNotifications(accessToken)
      .then((notifications) =>
        enrichWithPullRequestData(accessToken, notifications),
      )
      .then(callback)
  }

  cb()
  setInterval(cb, 1000 * 30)
}

function toEntry(notification, pullRequest) {
  return {
    title: notification.subject.title,
    url: `https://github.com/${notification.repository.full_name}/pull/${pullRequest.number}`,
    unread: notification.unread,
    updatedAt: new Date(notification.updated_at).getTime(),
    reason: notification.reason,
    repository: notification.repository.name,
    repositoryFullName: notification.repository.full_name,
    reviewRequests: pullRequest.reviewRequests.nodes.map(
      (r) => r.requestedReviewer?.name || r.requestedReviewer.login,
    ),
    author: pullRequest.author.login,
    reviewDecision: pullRequest.reviewDecision,
    state: pullRequest.state,
    draft: pullRequest.isDraft,
    age: Math.floor(
      (Date.now() - new Date(pullRequest.createdAt)) / 1000 / 60 / 60 / 24,
    ),
    changedFiles: pullRequest.changedFiles,
  }
}
