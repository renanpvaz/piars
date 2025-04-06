function render(changes) {
  if ('tabs' in changes || 'selected' in changes)
    renderMany('.tabs', Object.values(state.tabs), renderTab)

  if ('notifications' in changes)
    renderMany('.results', state.notifications, renderNotification)

  if ('filter' in changes) renderSearch(document.querySelector('.search'))

  if (state.accessToken)
    document.querySelector('.instructions').style.display = 'none'

  renderTitle()
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
    runCurrentFilter()
  }

  return button
}

function renderNotification(pr) {
  const prItem = document.createElement('a')
  prItem.className = 'pr'

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

  const prState = document.createElement('sup')

  prState.className = 'pr__state'
  prState.textContent = `${pr.state !== 'MERGED' ? pr.reviewDecision : pr.state}`

  const details = document.createElement('span')

  details.className = 'pr__details'
  details.innerHTML = `author: ${pr.author} &nbsp; ${pr.changedFiles} file(s) changed &nbsp; ${pr.age}d old `

  prItem.appendChild(prState)
  prItem.appendChild(details)

  return prItem
}

function renderMany(query, data, callback) {
  const children = data.map(callback)
  document.querySelector(query).replaceChildren(...children)
}

function renderTitle() {
  document.title = `piars | ${state.selected} (${state.notifications.length})`
}
