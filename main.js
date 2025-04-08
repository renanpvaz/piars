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
      type: 'pulls',
      name: 'all',
    },
    needsReview: {
      type: 'pulls',
      name: 'needsReview',
    },
    dependabot: {
      type: 'pulls',
      name: 'dependabot',
    },
    stale: {
      type: 'pulls',
      name: 'stale',
    },
    big: {
      type: 'pulls',
      name: 'big',
    },
    config: {
      type: 'config',
      name: 'config',
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
  settings: {
    theme: 'light',
    debug: false,
    pollIntervalMili: 1000 * 30,
    wallpaperUrl: '',
  },
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
  console.log(changes)
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

function setToken(token) {
  state.accessToken = token
}

function startPolling() {
  pollNotifications(state.accessToken, (notifications) => {
    notifications.sort((a, b) => b.updatedAt - a.updatedAt)

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
