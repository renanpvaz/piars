const initialState = {
  version: '1',
  allNotifications: [],
  tabs: [
    'all',
    'needs review',
    'approved',
    'mine',
    'dependabot',
    'big',
    'config',
  ],
  query: {
    all: '',
    'needs review':
      'state === "OPEN" && reviewDecision !== "APPROVED" && author !== viewer',
    approved: 'reviewDecision === "APPROVED"',
    mine: 'author === viewer',
    dependabot: 'author === "dependabot"',
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

  if (!cachedState) return

  // TODO figure out what to cache
  const { accessToken } = cachedState

  return Object.assign(initialState, {
    accessToken,
  })
}

function update(changes) {
  Object.assign(state, changes)
  render(changes)
  localStorage.setItem('piarsStateV1', JSON.stringify(state))
}

function runCurrentFilter() {
  const filter = state.query[state.selected]
  if (filter != null) {
    getWorker().postMessage({
      type: 'filter_selected',
      value: state.allNotifications,
      filter,
    })
  }
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
  getWorker().postMessage({
    type: 'page_loaded',
    accessToken: state.accessToken,
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
      case 'filter_applied':
        const { filter, value } = e.data
        update({ filter, notifications: value })
        break

      case 'fetch_started':
        document.title = 'Polling for fresh PRs'
        break

      case 'data_received':
        const { notifications } = e.data

        notifications.sort((a, b) => b.updatedAt - a.updatedAt)
        update({ allNotifications: notifications })
        runCurrentFilter()
        break
    }
  }
})()
