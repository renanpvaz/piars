// TODO:
// - [ ] typing filter
// - [ ] filter missing review
// - [ ] polling
// - [ ] tab number/browser notifications

const state = {}

state.tabs = {
  all: {
    name: 'all',
  },
  needsReview: {
    name: 'needsReview',
    filter: 'state !== "MERGED" && reviewDecision !== "APPROVED"',
  },
  reviewRequested: {
    name: 'reviewRequested',
    filter: 'reviewRequests.includes("renanpvaz")',
  },
  dependabot: {
    name: 'dependabot',
    filter: 'title.startsWith("Bump")',
  },
  stale: {
    name: 'stale',
    filter: 'age > 7',
  },
  big: {
    name: 'big',
    filter: 'changedFiles > 10',
  },
  new: {
    name: '+',
  },
}

state.selected = 'all'

const tabsSection = document.querySelector('#tabs')
const searchSection = document.querySelector('#search')
const pullRequestSection = document.querySelector('#results')

function update(newState) {
  Object.assign(state, newState)
  console.log({ ...state })
}

function updateTab(newState) {
  update({
    tabs: {
      ...state.tabs,
      [state.selected]: Object.assign(state.tabs[state.selected], newState),
    },
  })
}

function renderSearch() {
  const input = document.createElement('input')

  input.type = 'search'
  input.placeholder = 'search here'
  input.value = state.tabs[state.selected].filter
  input.oninput = () => {
    updateTab({ filter: input.value })
  }

  return input
}

function renderTab(tab) {
  const button = document.createElement('button')

  button.className = 'tab-button'
  button.textContent = tab.name
  button.classList.toggle('tab-button--selected', tab.name === state.selected)
  button.onclick = () => {
    update({
      selected: tab.name,
      notifications: runFilter(tab.filter, state.allNotifications),
    })

    render(Object.values(state.tabs), tabsSection, renderTab)
    render([{}], searchSection, renderSearch)
    render(state.notifications, pullRequestSection, renderNotification)
  }

  return button
}

function renderNotification(pr) {
  // TODO: return more than one and flatmap
  // OR group by repo
  // if (!document.getElementById(repoName)) {
  //     const repo = document.createElement('h2')

  //     repo.id = repoName
  //     repo.textContent = repoName

  //     resultsDiv.append(repo)
  // }

  const prDiv = document.createElement('div')
  prDiv.className = 'pr'

  const title = document.createElement('div')
  title.className = 'pr-title'
  title.textContent = pr.title

  const link = document.createElement('a')
  link.href = pr.url
  link.textContent = 'View on GitHub'
  link.target = '_blank'

  prDiv.appendChild(title)
  prDiv.appendChild(link)

  return prDiv
}

function render(data, container, renderOne) {
  const children = data.map(renderOne)
  container.replaceChildren(...children)
}

;(async function init() {
  const notifications = await fetchNotifications().then(
    enrichWithPullRequestData,
  )

  update({ allNotifications: notifications, notifications })
  render(Object.values(state.tabs), tabsSection, renderTab)
  render([{}], searchSection, renderSearch)
  render(state.notifications, pullRequestSection, renderNotification)
})()
