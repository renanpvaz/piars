const state = {
  notifications: {},
}

function initializeState() {
  update({
    selected: config.accessToken ? config.tabs[0].name : 'config',
    tabs: initializeTabs(),
  })
}

function initializeTabs() {
  return Object.assign(
    ...config.tabs
      .concat({ name: 'config' })
      .map((tab) => ({ [tab.name]: { notifications: [] } })),
  )
}

function applyConfig() {
  update({ tabs: initializeTabs() })

  getWorker().postMessage({
    type: 'config_changed',
    tabs: config.tabs,
    notifications: state.notifications,
  })
}

function update(changes) {
  Object.assign(state, changes)
  render(changes)
}

function getNotifications(tab = state.selected) {
  return state.tabs[tab].notifications.map((id) => state.notifications[id])
}

function getSortedNotifications() {
  const notifications = getNotifications()
  notifications.sort((a, b) => b.updatedAt - a.updatedAt)
  return notifications
}

function selectTab(delta) {
  const next = Object.keys(state.tabs).indexOf(state.selected) + delta
  if (next in state.tabs) update({ selected: state.tabs[next] })
}
