const state = {
  notifications: {},
}

let searchTimer

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
    accessToken: config.accessToken,
    notifications: state.notifications,
  })
}

function update(changes) {
  Object.assign(state, changes)
  render(changes)
}

function setQuery(query) {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    update({ query })
  }, 300)
}

function getNotifications(tab = state.selected) {
  return state.tabs[tab].notifications
    .map((id) => state.notifications[id])
    .filter((n) => n.title.match(new RegExp(state.query, 'i')))
}

function getSortedNotifications() {
  const notifications = getNotifications()
  notifications.sort((a, b) => b.updatedAt - a.updatedAt)
  return notifications
}

function selectTab(tab) {
  update({ selected: tab })
}

function shiftTab(delta) {
  const tabs = Object.keys(state.tabs)
  const next = tabs.indexOf(state.selected) + delta
  if (next in tabs) selectTab(tabs[next])
}
