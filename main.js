let worker

function getWorker() {
  if (!window.Worker) return

  if (!worker) {
    worker = new Worker('worker.js')
  }

  return worker
}

;(async function init() {
  initializeConfig()
  initializeState()

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') shiftTab(+1)
    if (e.key === 'ArrowLeft') shiftTab(-1)
  })

  if (config.accessToken) {
    getWorker().postMessage({
      type: 'page_loaded',
      tabs: config.tabs,
      accessToken: config.accessToken,
    })
  }

  getWorker().onmessage = (e) => {
    switch (e.data.type) {
      case 'notifications_received':
        update({
          loading: false,
          notifications: {
            ...state.notifications,
            ...e.data.notifications,
          },
        })
        break
      case 'filter_applied':
        const { filter, tab, value } = e.data
        update({
          filter,
          tabs: {
            ...state.tabs,
            [tab.name]: {
              ...state.tabs[tab.name],
              notifications: value.map((n) => n.id),
            },
          },
        })
        break

      case 'fetch_started':
        document.title = 'Polling for fresh PRs'
        update({ loading: true })
        break
    }
  }
})()
