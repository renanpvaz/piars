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

;(async function init() {
  update(loadPreviousState() || initialState)

  if (state.accessToken) {
    getWorker().postMessage({
      type: 'page_loaded',
      filters: Object.entries(state.query),
      accessToken: state.accessToken,
    })
  }

  getWorker().onmessage = (e) => {
    switch (e.data.type) {
      case 'filter_applied':
        const { filter, tab, value } = e.data
        update({
          filter,
          allNotifications: {
            ...state.allNotifications,
            [tab]: { ...state.allNotifications[tab], ...value },
          },
        })
        break

      case 'fetch_started':
        document.title = 'Polling for fresh PRs'
        break
    }
  }
})()
