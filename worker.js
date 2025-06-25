importScripts('github.js')

onmessage = (e) => {
  switch (e.data.type) {
    case 'page_loaded':
      postMessage({ type: 'fetch_started' })

      pollNotifications((notifications) => {
        e.data.filters.forEach(([tab, filter]) =>
          runFilter(tab, filter, notifications),
        )
      }, e.data.accessToken)
      return

    case 'filter_selected':
      return
  }
}

function runFilter(tab, filter, notifications) {
  const evaluatedFilter = validateFilter(filter)

  const payload = {
    type: 'filter_applied',
    tab,
    filter: evaluatedFilter,
    value: Object.fromEntries(
      Object.entries(notifications).filter(
        ([_key, element]) => evalFilter(filter, element).value,
      ),
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
    lastModified: '',
    data: [],
  },
) {
  let result = await fetchNotifications(
    accessToken,
    previousResult.lastModified,
  )

  result = result.type === 'success' ? result : previousResult

  const notifications = await enrichWithPullRequestData(
    accessToken,
    result.data,
  )

  callback(notifications)

  setTimeout(
    () => pollNotifications(callback, accessToken, result),
    1000 * result.pollInterval,
  )
}
