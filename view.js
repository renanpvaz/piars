function render(changes) {
  if ('tabs' in changes || 'selected' in changes)
    renderMany('.tabs__container', Object.values(state.tabs), renderTab)

  if ('selected' in changes && state.selected === 'config') renderConfig()

  if ('notifications' in changes)
    renderMany('.results', state.notifications, renderNotification)

  if ('filter' in changes) renderSearch(document.querySelector('.search'))

  if (state.accessToken) hideInstructions()

  document
    .querySelector('.content')
    .classList.toggle('content--config', state.selected === 'config')

  renderTitle()
}

function hideInstructions() {
  const container = document.querySelector('.instructions')
  if (container) container.style.display = 'none'
}

function renderSearch(container) {
  const { type, expression } = state.filter

  container.className = `search search--${type}`

  const input = container.firstElementChild

  input.className = `searchbar`
  input.type = 'search'
  input.placeholder = 'query or javascript expression'
  input.value = expression
  input.oninput = () => {
    update({ query: { ...state.query, [state.selected]: input.value } })
    runCurrentFilter()
  }

  return container
}

function renderTab(tab) {
  const button = document.createElement('button')

  button.className = 'tab-button'
  button.textContent = tab.name
  button.classList.toggle('tab-button--selected', tab.name === state.selected)
  button.onclick = () => {
    update({ selected: tab.name })
    if (tab.type == 'pulls') runCurrentFilter()
  }

  return button
}

function renderNotification(pr) {
  const prItem = document.createElement('a')
  prItem.className = 'pr'

  prItem.classList.toggle(
    'pr--open',
    pr.state === 'OPEN' && pr.reviewDecision === 'REVIEW_REQUIRED' && !pr.draft,
  )
  prItem.classList.toggle('pr--merged', pr.state === 'MERGED')
  prItem.classList.toggle('pr--approved', pr.reviewDecision === 'APPROVED')
  prItem.classList.toggle('pr--draft', pr.draft)
  prItem.classList.toggle('pr--closed', pr.state === 'CLOSED')
  prItem.classList.toggle(
    'pr--reviewed',
    pr.unread && pr.reviewDecision === 'APPROVED',
  )

  prItem.textContent = pr.title
  prItem.href = pr.url
  prItem.target = '_blank'

  const details = document.createElement('span')

  details.className = 'pr__details'
  details.innerHTML = `author: ${pr.author} &nbsp; ${pr.changedFiles} file(s) changed &nbsp; ${pr.age}d old • ${pr.reviewDecision}`

  prItem.appendChild(details)

  return prItem
}

function renderConfig() {
  const container =
    document.querySelector('.config') || document.createElement('div')
  const input = document.createElement('textarea')

  input.className = 'config'
  input.value = JSON.stringify(state.settings, null, 2)
  input.rows = 10
  input.onchange = () => {
    try {
      const newConfig = JSON.parse(input.value)
      update({ settings: newConfig })
      input.classList.remove('config--invalid')
    } catch {
      input.classList.add('config--invalid')
    }
  }

  container.appendChild(input)
  document.querySelector('.content').appendChild(container)

  return container
}

function renderMany(query, data, callback) {
  const children = data.map(callback)
  document.querySelector(query).replaceChildren(...children)
}

function renderTitle() {
  document.title = `piars | ${state.selected} (${state.notifications.length})`
}
