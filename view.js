function render() {
  const content = document.querySelector('.content')
  const config = document.querySelector('.config')

  if (state.selected === 'config') {
    config.hidden = false
    content.hidden = true

    const input = document.querySelector('.config__input')
    input.value = showConfig()
  } else {
    content.hidden = false
    config.hidden = true
  }

  document
    .querySelector('.tabs__container')
    .replaceChildren(...Object.entries(state.tabs).map(renderTab))

  const notifications = getSortedNotifications()

  document.querySelector('.results').replaceChildren(
    ...(notifications.length
      ? notifications.map(renderNotification)
      : [
          Object.assign(document.createElement('span'), {
            textContent: state.loading
              ? 'Loading pull requests...'
              : 'No pull requests matching filters.',
          }),
        ]),
  )

  renderTitle()
}

function renderTab([tab, _]) {
  const button = document.createElement('button')

  button.className = 'tab-button'
  button.classList.toggle('tab-button--selected', tab === state.selected)
  button.onclick = () => {
    selectTab(tab)
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

function saveConfig(e) {
  e.preventDefault()

  const { configuration: input } = e.target

  if (readConfig(input.value)) {
    applyConfig()
    input.classList.remove('config--invalid')
  } else {
    input.classList.add('config--invalid')
  }
}

function updateFocus(delta) {
  const prs = [...document.querySelectorAll('.pr')]

  if (!prs.length) return

  if (
    !document.activeElement ||
    !document.activeElement.classList.contains('pr')
  ) {
    prs[0].focus({ focusVisible: true })
  }

  const index = prs.indexOf(document.activeElement)
  const next = prs[index + delta]

  if (next) next.focus({ focusVisible: true })
}

function focusSearch() {
  document.querySelector('.searchbar')?.focus({ focusVisible: true })
}

function renderTitle() {
  document.title = `(${getNotifications().length}) ${state.selected}`
}
