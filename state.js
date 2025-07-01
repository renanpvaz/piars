const state = {
  notifications: {},
}

function initializeState() {
  update({
    selected: config.accessToken ? config.tabs[0].name : 'config',
    tabs: Object.assign(
      { config: { notifications: [] } },
      ...config.tabs.map((tab) => ({ [tab.name]: { notifications: [] } })),
    ),
  })
}

function applyConfig() {
  update({
    tabs: config.tabs.map((tab) => tab.name).concat('config'),
  })
  getWorker().postMessage({
    type: 'config_changed',
    config,
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
