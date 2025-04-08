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
  prItem.classList.add(...pr.progress.map((p) => `pr--${p.toLowerCase()}`))
  prItem.textContent = pr.title
  prItem.href = pr.url
  prItem.target = '_blank'

  const bullet = document.createElement('figure')
  bullet.className = 'pr__bullet'

  const details = document.createElement('span')
  const status =
    pr.state === 'MERGED' || pr.state === 'CLOSED'
      ? pr.state
      : pr.reviewDecision

  details.className = 'pr__details'
  details.innerHTML = `${status} &nbsp; • &nbsp; author: ${pr.author} &nbsp; ${pr.changedFiles} file(s) changed &nbsp; ${pr.age}d old`

  prItem.appendChild(bullet)
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
  document.title = `(${state.notifications.length}) ${state.selected}`
}
