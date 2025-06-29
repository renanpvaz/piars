const state = {
  notifications: {},
}

function applyConfig() {
  update({
    selected: config.accessToken ? config.tabs[0].name : 'config',
    tabs: config.tabs.map((tab) => tab.name).concat('config'),
  })
}

function update(changes) {
  Object.assign(state, changes)
  render(changes)
}

function getNotifications(tab = state.selected) {
  return tab in state.notifications
    ? Object.values(state.notifications[tab])
    : []
}

function getSortedNotifications() {
  const notifications = getNotifications()
  notifications.sort((a, b) => b.updatedAt - a.updatedAt)
  return notifications
}

function selectTab(delta) {
  const next = state.tabs.indexOf(state.selected) + delta
  if (next in state.tabs) update({ selected: state.tabs[next] })
}
