function render(changes) {
  const content = document.querySelector('.content')
  const config = document.querySelector('.config')

  content.hidden = false
  config.hidden = true

  if ('selected' in changes && state.selected === 'config') {
    config.hidden = false
    content.hidden = true

    const input = document.querySelector('.config__input')
    input.value = showConfig()

    document.querySelector('.config__button').onclick = () => {
      if (readConfig(input.value)) {
        applyConfig()
        input.classList.remove('config--invalid')
      } else {
        input.classList.add('config--invalid')
      }
    }
  }

  document
    .querySelector('.tabs__container')
    .replaceChildren(...state.tabs.map(renderTab))

  const notifications = getSortedNotifications()

  if (notifications.length) {
    document
      .querySelector('.results')
      .replaceChildren(...notifications.map(renderNotification))
  }

  renderTitle()
}

function renderSearch(container) {
  container.className = `search`

  const textarea = container.firstElementChild

  textarea.className = `searchbar`
  textarea.type = 'search'
  textarea.placeholder = 'search for PRs'
  textarea.oninput = () => {}

  return container
}

function renderTab(tab) {
  const button = document.createElement('button')

  button.className = 'tab-button'
  button.classList.toggle('tab-button--selected', tab === state.selected)
  button.onclick = () => {
    update({ selected: tab })
  }

  const count = getNotifications(tab).length
  const counter = document.createElement('span')

  if (tab !== 'config') {
    counter.textContent = count ? `${count}`.padStart(2, '0') : '--'
    counter.className = 'tab-counter'
    button.appendChild(counter)
  }

  const content = document.createElement('span')

  content.textContent = tab
  button.appendChild(content)

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
  if (['OPEN', 'DRAFT', 'CLOSED', 'MERGED', 'APPROVED'].includes(progress[0])) {
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

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const startOfWeek = new Date().getDate() - new Date().getDay()

  if (weeks > 1) return `${weeks}w ago`
  if (days <= 28 && days > 1 && new Date(time).getDate() < startOfWeek)
    return 'last week'
  if (yesterday.toLocaleDateString() === new Date(time).toLocaleDateString())
    return 'yesterday'
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  if (seconds > 1) return `${seconds}s ago`

  return 'just now'
}

function renderConfig() {}

function renderTitle() {
  document.title = `(${getNotifications().length}) ${state.selected}`
}
