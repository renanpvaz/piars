// TODO:
// - [x] typing filter
// - [x] filter missing review
// - [ ] update title
// - [ ] improve PR item
// - [ ] sorting
// - [ ] polling
// - [ ] tab number/browser notifications
// - [ ] add new tab

const state = {}

state.tabs = {
  all: {
    name: 'all',
  },
  needsReview: {
    name: 'needsReview',
    filter: validateFilter(
      'state !== "MERGED" && reviewDecision !== "APPROVED"',
    ),
  },
  reviewRequested: {
    name: 'reviewRequested',
    filter: validateFilter('reviewRequests.includes("renanpvaz")'),
  },
  dependabot: {
    name: 'dependabot',
    filter: validateFilter('title.startsWith("Bump")'),
  },
  stale: {
    name: 'stale',
    filter: validateFilter('age > 7'),
  },
  big: {
    name: 'big',
    filter: validateFilter('changedFiles > 10'),
  },
  new: {
    name: '+',
  },
}

state.selected = 'all'

const tabsSection = document.querySelector('#tabs')
const searchSection = document.querySelector('#search')
const pullRequestSection = document.querySelector('#results')

function update(newState) {
  Object.assign(state, newState)
  console.log({ ...state })
}

function updateTab(newState) {
  update({
    tabs: {
      ...state.tabs,
      [state.selected]: Object.assign(state.tabs[state.selected], newState),
    },
  })
}

function renderSearch() {
  const input = document.createElement('input')
  const { status, expression } = state.tabs[state.selected].filter || {
    status: 'invalid',
  }

  input.className = 'search'
  input.classList.toggle('search--invalid', status === 'invalid')
  input.type = 'search'
  input.placeholder = 'search here'
  input.value = expression
  input.oninput = () => {
    const filter = validateFilter(input.value)

    updateTab({ filter })
    update({
      notifications: runFilter(filter, state.allNotifications),
    })

    render(state.notifications, pullRequestSection, renderNotification)
    input.classList.toggle('search--invalid', filter.status === 'invalid')
  }

  return input
}

function renderTab(tab) {
  const button = document.createElement('button')

  button.className = 'tab-button'
  button.textContent = tab.name
  button.classList.toggle('tab-button--selected', tab.name === state.selected)
  button.onclick = () => {
    update({
      selected: tab.name,
      notifications: runFilter(tab.filter, state.allNotifications),
    })

    render(Object.values(state.tabs), tabsSection, renderTab)
    render([{}], searchSection, renderSearch)
    render(state.notifications, pullRequestSection, renderNotification)
  }

  return button
}

function renderNotification(pr) {
  const prItem = document.createElement('a')
  prItem.className = 'pr'

  prItem.classList.toggle('pr--merged', pr.state === 'MERGED')
  prItem.classList.toggle('pr--approved', pr.reviewDecision === 'APPROVED')
  prItem.classList.toggle('pr--draft', pr.draft)
  prItem.classList.toggle('pr--closed', pr.state === 'CLOSED')
  prItem.classList.toggle(
    'pr--reviewed',
    pr.unread && pr.reviewDecision === 'APPROVED',
  )

  prItem.textContent = pr.title
  prItem.href = pr.url
  prItem.target = '_blank'

  const details = document.createElement('span')

  details.className = 'pr__details'
  details.innerHTML = `author: ${pr.author} &nbsp; ${pr.changedFiles} file(s) changed &nbsp; ${pr.age}d old `

  prItem.appendChild(details)

  return prItem
}

function render(data, container, renderOne) {
  const children = data.map(renderOne)
  container.replaceChildren(...children)
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

function runFilter(filter, data) {
  return data.filter((element) => {
    return (
      filter.status === 'valid' && evalFilter(filter.expression, element).value
    )
  })
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
  },
) {
  try {
    return {
      status: 'valid',
      value: filter ? eval(filter) || false : true,
      expression: filter,
    }
  } catch (error) {
    return { status: 'invalid', value: error, expression: filter }
  }
}

;(async function init() {
  const notifications = await fetchNotifications().then(
    enrichWithPullRequestData,
  )

  update({ allNotifications: notifications, notifications })
  render(Object.values(state.tabs), tabsSection, renderTab)
  render([{}], searchSection, renderSearch)
  render(state.notifications, pullRequestSection, renderNotification)
})()
