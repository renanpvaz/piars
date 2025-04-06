// TODO:
// - [x] typing filter
// - [x] filter missing review
// - [x] update title
// - [x] improve PR item
// - [ ] eval js in web worker
// - [ ] sorting
// - [ ] polling
// - [ ] tab number/browser notifications
// - [ ] add new tab
// - [/] mark done

const state = {}

state.tabs = {
  all: {
    name: 'all',
    filter: validateFilter(''),
  },
  needsReview: {
    name: 'needsReview',
    filter: validateFilter(
      'state !== "MERGED" && reviewDecision !== "APPROVED"',
    ),
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
  const { type, expression } = state.tabs[state.selected].filter
  const container = document.createElement('div')

  container.className = `search search--${type}`

  const input = document.createElement('input')

  input.className = `searchbar`
  input.type = 'search'
  input.placeholder = 'query or javascript expression'
  input.value = expression
  input.oninput = () => {
    const filter = validateFilter(input.value)

    updateTab({ filter })
    update({
      notifications: runFilter(filter, state.allNotifications),
    })

    renderMany('#results', state.notifications, renderNotification)
    container.className = `search search--${filter.type}`
  }

  container.appendChild(input)

  return container
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

    renderMany('#tabs', Object.values(state.tabs), renderTab)
    render('.search', renderSearch)
    renderMany('#results', state.notifications, renderNotification)
    renderTitle()
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

  const prState = document.createElement('sup')

  prState.className = 'pr__state'
  prState.textContent = `${pr.state !== 'MERGED' ? pr.reviewDecision : pr.state}`

  const details = document.createElement('span')

  details.className = 'pr__details'
  details.innerHTML = `author: ${pr.author} &nbsp; ${pr.changedFiles} file(s) changed &nbsp; ${pr.age}d old `

  prItem.appendChild(prState)
  prItem.appendChild(details)

  return prItem
}

function renderMany(query, data, renderOne) {
  const children = data.map(renderOne)
  document.querySelector(query).replaceChildren(...children)
}

function render(query, renderOne) {
  const newContainer = renderOne()
  document.querySelector(query).replaceWith(newContainer)
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
  return data.filter((element) => evalFilter(filter.expression, element).value)
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

function renderTitle() {
  document.title = `piars | ${state.selected} (${state.notifications.length})`
}

;(async function init() {
  renderMany('#tabs', Object.values(state.tabs), renderTab)
  render('.search', renderSearch)

  const notifications = await fetchNotifications().then(
    enrichWithPullRequestData,
  )

  notifications.sort((a, b) => a.updatedAt - b.updatedAt)

  update({ allNotifications: notifications, notifications })
  renderMany('#results', state.notifications, renderNotification)
  renderTitle()
})()
