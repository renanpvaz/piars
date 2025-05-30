importScripts('github.js')

onmessage = (e) => {
  switch (e.data.type) {
    case 'page_loaded':
      pollNotifications(e.data.accessToken)
      return

    case 'filter_selected':
      const filter = validateFilter(e.data.filter)
      const payload = {
        type: 'filter_applied',
        filter,
        value: e.data.value.filter(
          (element) => evalFilter(e.data.filter, element).value,
        ),
      }

      return postMessage(payload)
  }
}

function evalFilter(
  filter,
  {
    title,
    url,
    unread,
    updatedAt,
    reason,
    repository,
    repositoryFullName,
    reviewRequests,
    author,
    reviewDecision,
    state,
    draft,
    age,
    changedFiles,
    viewer,
  },
) {
  if (!filter)
    return {
      type: 'text',
      value: true,
      expression: '',
    }

  try {
    return {
      type: 'javascript',
      value: filter ? eval(filter) || false : true,
      expression: filter,
    }
  } catch (error) {
    return {
      type: 'text',
      value: title.includes(filter),
      expression: filter,
    }
  }
}

function validateFilter(filter) {
  return evalFilter(filter, {
    title: '',
    url: '',
    unread: false,
    updatedAt: '',
    reason: '',
    repository: '',
    repositoryFullName: '',
    reviewRequests: [],
    author: '',
    reviewDecision: '',
    state: '',
    draft: false,
    age: 0,
    changedFiles: 0,
  })
}

async function pollNotifications(accessToken) {
  postMessage({ type: 'fetch_started' })

  const { data, pollInterval } = await fetchNotifications(accessToken)
  const notifications = await enrichWithPullRequestData(accessToken, data)

  postMessage({
    type: 'data_received',
    notifications,
  })

  setTimeout(() => pollNotifications(accessToken), 1000 * pollInterval)
}
