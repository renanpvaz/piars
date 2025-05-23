function render(changes) {
  if ('tabs' in changes || 'selected' in changes)
    renderMany('.tabs__container', state.tabs, renderTab)

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

  const textarea = container.firstElementChild

  textarea.className = `searchbar`
  textarea.type = 'search'
  textarea.placeholder = 'query or javascript expression'
  textarea.value = expression
  textarea.oninput = () => {
    update({ query: { ...state.query, [state.selected]: textarea.value } })
    runCurrentFilter()
  }

  return container
}

function renderTab(tab) {
  const button = document.createElement('button')

  button.className = 'tab-button'
  button.textContent = tab
  button.classList.toggle('tab-button--selected', tab === state.selected)
  button.onclick = () => {
    update({ selected: tab })
    runCurrentFilter()
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

  details.className = 'pr__details'
  details.innerHTML = `
    <span>${humanizeProgress(pr.progress)} &nbsp; • &nbsp; ${pr.changedFiles} file(s) changed &nbsp; ${pr.age > 0 ? `${pr.age}d old` : ''}</span>
    <span>${elapsedTime(pr.updatedAt)} &nbsp;</span>`

  prItem.appendChild(bullet)
  prItem.appendChild(details)

  return prItem
}

function humanizeProgress(progress) {
  if (['OPEN', 'DRAFT', 'CLOSED', 'MERGED'].includes(progress[0])) {
    const [status] = progress
    return `${status[0]}${status.slice(1).toLowerCase()}`
  }

  const missingYour = progress.includes('REVIEWED_BY_ME')
    ? 'approval'
    : 'review'

  const missingTheir = progress.includes('REVIEWED_BY_THEM')
    ? 'approval'
    : 'review'

  if (
    progress.includes('APPROVED_BY_THEM') &&
    progress.includes('APPROVED_BY_ME')
  )
    return 'Missing additional approvals'
  if (progress.includes('APPROVED_BY_THEM'))
    return `Missing your ${missingYour}`
  if (progress.includes('APPROVED_BY_ME'))
    return `Missing their ${missingTheir}`

  if (progress.includes('REVIEWED_BY_THEM'))
    return `Missing your ${missingYour}`
  if (progress.includes('REVIEWED_BY_ME'))
    return `Missing their ${missingTheir}`
}

function elapsedTime(time) {
  const elapsed = Date.now() - time
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const startOfWeek = new Date().getDate() - new Date().getDay()

  if (weeks > 1) return `${weeks}w ago`
  if (days <= 28 && days > 1 && new Date(time).getDate() < startOfWeek)
    return 'last week'
  if (days === 1) return 'yesterday'
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  if (seconds > 1) return `${seconds}s ago`

  return 'just now'
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
