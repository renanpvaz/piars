async function fetchNotifications() {
  const url = `https://api.github.com/notifications?all=true`
  const cache = sessionStorage.getItem('notification_data')
  let data = cache && JSON.parse(cache)

  try {
    if (!data) {
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`)
      }

      data = await response.json()
      sessionStorage.setItem('notification_data', JSON.stringify(data))
    }

    return data
  } catch (error) {
    console.error('Error fetching data:', error)
    alert('Failed to fetch pull requests. Check the console for details.')
  }
}

async function fetchPullRequests(reposAndPRs) {
  const cached = sessionStorage.getItem('pr_data')

  if (cached) return JSON.parse(cached)

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

  const query = `
        query {
          ${queryParts.join('\n')}
        }
      `

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const data = await response.json()

    sessionStorage.setItem('pr_data', JSON.stringify(data))

    return data
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

async function enrichWithPullRequestData(notifications) {
  const prNotifications = notifications.filter(
    (n) => n.subject.type === 'PullRequest',
  )
  const pullRequests = prNotifications.map((n) => ({
    owner: n.repository.owner.login,
    repo: n.repository.name,
    number: +n.subject.url.split('/').pop(),
  }))

  const { data } = await fetchPullRequests(pullRequests)

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

function toEntry(notification, pullRequest) {
  return {
    title: notification.subject.title,
    url: `https:github.com/${notification.repository.full_name}/pull/${pullRequest.number}`,
    unread: notification.unread,
    updatedAt: notification.updatedAt,
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
  }
}
