async function fetchNotifications(token) {
  const url = 'https://api.github.com/notifications?all=true'

  const result = await fetchSafe(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    cache: 'no-cache',
  })

  if (result.type !== 'success') return result

  return {
    type: 'success',
    pollInterval: result.response.headers.get('X-Poll-Interval'),
    data: result.data,
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

async function fetchPullRequests(query, token) {
  const result = await fetchSafe('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    cache: 'no-cache',
  })

  return result.type === 'success'
    ? { type: 'success', data: result.data.data }
    : result
}

async function enrichWithPullRequestData(notifications, token) {
  const prNotifications = notifications.filter(
    (n) => n.subject.type === 'PullRequest',
  )
  const pullRequestParams = prNotifications.map((n) => ({
    owner: n.repository.owner.login,
    repo: n.repository.name,
    number: +n.subject.url.split('/').pop(),
  }))

  const query = buildPRQuery(pullRequestParams)
  const result = await fetchPullRequests(query, token)

  if (result.type === 'error') {
    console.warn('github.enrichWithPullRequestData.error')
    return { notifications: [] }
  }

  const { viewer, ...pullRequests } = result.data

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

  const enriched = Object.fromEntries(
    prNotifications.map((notification) => {
      const [org, repositoryName, _, pullNumber] = notification.subject.url
        .replace('https://api.github.com/repos/', '')
        .split('/')
      const name = `${org}/${repositoryName}`
      const pullRequest = pullsPerRepo[name] && pullsPerRepo[name][pullNumber]
      const entry = toEntry(notification, pullRequest, viewer)

      entry.id = `${name}/${pullRequest.number}`

      return [entry.id, entry]
    }),
  )

  return { notifications: enriched }
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

async function fetchSafe(input, init) {
  try {
    const response = await fetch(input, init)

    if (!response.ok) {
      console.warn('github.fetch.bad_status', response.status, response.error)
      return {
        type: 'error',
        error: 'bad_status',
      }
    }

    const data = await response.json()

    return { type: 'success', response, data }
  } catch (error) {
    console.warn('github.fetch.error', error)
    return {
      type: 'error',
      error,
    }
  }
}
