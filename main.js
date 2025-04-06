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
// - bugs
//   - [ ] tabs no wrap
//   - [ ] token input no feedback
//   - [ ] tab name with whitespace

const initialState = {
  allNotifications: [],
  tabs: {
    all: {
      name: 'all',
    },
    needsReview: {
      name: 'needsReview',
    },
    dependabot: {
      name: 'dependabot',
    },
    stale: {
      name: 'stale',
    },
    big: {
      name: 'big',
    },
    new: {
      name: '+',
    },
  },
  query: {
    needsReview: 'state !== "MERGED" && reviewDecision !== "APPROVED"',
    dependabot: 'title.startsWith("Bump")',
    stale: 'age > 7',
    big: 'changedFiles > 10',
  },
  selected: 'all',
  notifications: [],
}

const state = {}

let worker

function loadPreviousState() {
  let cachedState
  try {
    cachedState = JSON.parse(localStorage.getItem('piarsStateV1'))
  } catch {}

  return cachedState
}

function update(changes) {
  Object.assign(state, changes)
  render(changes)
  localStorage.setItem('piarsStateV1', JSON.stringify(state))
}

function updateTab(newState) {
  update({
    tabs: {
      ...state.tabs,
      [state.selected]: Object.assign(state.tabs[state.selected], newState),
    },
  })
}

function runCurrentFilter() {
  getWorker().postMessage({
    type: 'filter',
    value: state.allNotifications,
    filter: state.query[state.selected],
  })
}

function getWorker() {
  if (!window.Worker) return

  if (!worker) {
    worker = new Worker('worker.js')
  }

  return worker
}

function updateToken(token) {
  state.accessToken = token
}

function startPolling() {
  pollNotifications(state.accessToken, (notifications) => {
    notifications.sort((a, b) => a.updatedAt - b.updatedAt)

    update({ allNotifications: notifications })
    runCurrentFilter()
  })
}

;(async function init() {
  update(loadPreviousState() || initialState)

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
        update({ filter, notifications: value })
        break
    }
  }
})()
