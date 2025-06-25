async function fetchNotifications(token, lastModified = '') {
  const url = `https://api.github.com/notifications?all=true`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'If-Modified-Since': lastModified,
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    data = await response.json()

    return {
      type: 'success',
      pollInterval: response.headers.get('X-Poll-Interval'),
      lastModified: response.headers.get('Last-Modified'),
      data,
    }
  } catch (error) {
    console.error('Error fetching data:', error)
    return {
      type: 'error',
      error,
    }
  }
}

function buildPRQuery(reposAndPRs) {
  const queryParts = reposAndPRs.map(
    ({ owner, repo, number }, index) => `
        pr${index}: repository(owner: "${owner}", name: "${repo}") {
          pullRequest(number: ${number}) {
            isReadByViewer
            number
            title
            url
            changedFiles
            author { login }
            isDraft
            createdAt
            updatedAt
            reviewDecision
            latestReviews(last: 10) {
                nodes {
                    author {
                        login
                    }
                    state
                }
            }
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
          viewer {
              login
          }
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
  const pullRequestParams = prNotifications.map((n) => ({
    owner: n.repository.owner.login,
    repo: n.repository.name,
    number: +n.subject.url.split('/').pop(),
  }))

  const query = buildPRQuery(pullRequestParams)
  const { data } = await fetchPullRequests(token, query)
  const { viewer, ...pullRequests } = data

  const pullsPerRepo = Object.values(pullRequests).reduce(
    (acc, { pullRequest }) => {
      if (!pullRequest) return acc

      const name = pullRequest.repository.nameWithOwner

      if (!(name in acc)) acc[name] = {}
      acc[name][pullRequest.number] = pullRequest

      return acc
    },
    {},
  )

  return Object.fromEntries(
    prNotifications.map((n) => {
      const [org, repositoryName, _, pullNumber] = n.subject.url
        .replace('https://api.github.com/repos/', '')
        .split('/')
      const name = `${org}/${repositoryName}`
      const pullRequest = pullsPerRepo[name] && pullsPerRepo[name][pullNumber]

      return [`${name}/${pullRequest.number}`, toEntry(n, pullRequest, viewer)]
    }),
  )
}

function toEntry(notification, pullRequest, viewer) {
  return {
    title: notification.subject.title,
    url: `https://github.com/${notification.repository.full_name}/pull/${pullRequest.number}`,
    unread: notification.unread,
    updatedAt: new Date(pullRequest.updatedAt).getTime(),
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
    progress: progress(viewer, pullRequest),
    viewer: viewer.login,
  }
}

// DRAFT
// | OPEN (no reviews)
// | REVIEWED_BY_THEM
// | REVIEWED_BY_ME
// | REVIEWED
// | APPROVED_BY_THEM
// | APPROVED_BY_ME
// | APPROVED
// | MERGED
// | CLOSED
function progress(viewer, pr) {
  if (pr.isDraft) return ['DRAFT']
  if (['CLOSED', 'MERGED'].includes(pr.state)) return [pr.state]
  if (pr.reviewDecision === 'APPROVED') return ['APPROVED']
  if (viewer === pr.author) return ['OPEN']

  // TODO:
  // max 10 reviews
  const myReview = pr.latestReviews.nodes.find(
    (r) => r.author.login === viewer.login,
  )
  const status = []

  if (myReview && myReview.state === 'APPROVED') status.push('APPROVED_BY_ME')
  else if (myReview) status.push('REVIEWED_BY_ME')

  const remainingReviews = pr.latestReviews.nodes.filter(
    (r) => r.author.login !== viewer.login,
  )

  const anyApproval = remainingReviews.find((r) => r.state === 'APPROVED')

  if (anyApproval) status.push('APPROVED_BY_THEM')
  else if (remainingReviews.length) status.push('REVIEWED_BY_THEM')

  if (status.length) return status

  return ['OPEN']
}
