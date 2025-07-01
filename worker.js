importScripts('github.js')

let pollTimer

onmessage = (e) => {
  switch (e.data.type) {
    case 'page_loaded':
      postMessage({ type: 'fetch_started' })
      startPolling(e.data.tabs, e.data.accessToken)
      return

    case 'config_changed':
      e.data.tabs.forEach((tab) => runFilter(tab, e.data.notifications))
      startPolling(e.data.tabs, e.data.accessToken)
      return
  }
}

function startPolling(tabs, accessToken) {
  if (pollTimer) clearTimeout(pollTimer)

  pollTimer = pollNotifications((notifications) => {
    postMessage({ type: 'notifications_received', notifications })
    tabs.forEach((tab) => runFilter(tab, notifications))
  }, accessToken)
}

function runFilter(tab, notifications) {
  const evaluatedFilter = validateFilter(tab.query)

  const payload = {
    type: 'filter_applied',
    tab,
    filter: evaluatedFilter,
    value: Object.values(notifications).filter(
      (notification) => evalFilter(tab.query, notification).value,
    ),
  }

  return postMessage(payload)
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

async function pollNotifications(
  callback,
  accessToken,
  previousResult = {
    type: 'success',
    pollInterval: 60,
    data: [],
  },
) {
  let result = await fetchNotifications(accessToken)

  result = result.type === 'success' ? result : previousResult

  const { notifications } = await enrichWithPullRequestData(
    result.data,
    accessToken,
  )

  callback(notifications)

  return setTimeout(
    () => pollNotifications(callback, accessToken, result),
    1000 * result.pollInterval,
  )
}
