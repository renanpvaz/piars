// TODO:
// - mvp
//   - [x] input github token
//   - [x] eval js in web worker
//   - [ ] view schema
//   - [ ] error messages?
// - ideas
//   - [ ] settings page: poll interval, theme, wallpaper, token
//   - [ ] browser notifications
//   - [ ] add new tab

const initialState = {
  allNotifications: [],
  tabs: {
    all: {
      name: 'all',
      query: '',
    },
    needsReview: {
      name: 'needsReview',
      query: 'state !== "MERGED" && reviewDecision !== "APPROVED"',
    },
    dependabot: {
      name: 'dependabot',
      query: 'title.startsWith("Bump")',
    },
    stale: {
      name: 'stale',
      query: 'age > 7',
    },
    big: {
      name: 'big',
      query: 'changedFiles > 10',
    },
    new: {
      name: '+',
    },
  },
  selected: 'all',
}

const state = loadPreviousState() || initialState
let worker

function loadPreviousState() {
  let cachedState
  try {
    cachedState = JSON.parse(localStorage.getItem('piarsState'))
  } catch {}

  return cachedState
}

function update(newState) {
  Object.assign(state, newState)
  localStorage.setItem('piarsState', JSON.stringify(state))
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
    updateTab({ query: input.value })
    runCurrentFilter()
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
    update({ selected: tab.name })
    renderMany('#tabs', Object.values(state.tabs), renderTab)
    runCurrentFilter()
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

function runCurrentFilter() {
  getWorker().postMessage({
    type: 'filter',
    value: state.allNotifications,
    filter: state.tabs[state.selected].query,
  })
}

function getWorker() {
  if (!window.Worker) return

  if (!worker) {
    worker = new Worker('worker.js')
  }

  return worker
}

function renderTitle() {
  document.title = `piars | ${state.selected} (${state.notifications.length})`
}

function updateToken(token) {
  state.accessToken = token
}

function updateNotifications(notifications) {
  update({ notifications })
  renderMany('#results', state.notifications, renderNotification)
  renderTitle()
}

function startPolling() {
  document.querySelector('.instructions').remove()
  pollNotifications(state.accessToken, (notifications) => {
    notifications.sort((a, b) => a.updatedAt - b.updatedAt)

    update({ allNotifications: notifications })
    runCurrentFilter()
  })
}

;(async function init() {
  renderMany('#tabs', Object.values(state.tabs), renderTab)

  if (state.accessToken) {
    startPolling()
  }

  if (state.allNotifications.length) {
    runCurrentFilter()
  }

  getWorker().onmessage = (e) => {
    switch (e.data.type) {
      case 'filter':
        const { filter, value } = e.data

        updateTab({ filter })
        updateNotifications(value)
        render('.search', renderSearch)

        break
    }
  }
})()
