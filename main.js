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
    if (e.key === 'ArrowRight') selectTab(+1)
    if (e.key === 'ArrowLeft') selectTab(-1)
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
      case 'filter_applied':
        const { filter, tab, value } = e.data
        update({
          filter,
          notifications: {
            ...state.notifications,
            [tab.name]: { ...state.notifications[tab.name], ...value },
          },
        })
        break

      case 'fetch_started':
        document.title = 'Polling for fresh PRs'
        break
    }
  }
})()
