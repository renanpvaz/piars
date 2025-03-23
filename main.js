// TODO:
// - [ ] typing filter
// - [ ] sort by stale first
// - [ ] filter missing review
// - [ ] polling
// - [ ] tab number/browser notifications

const state = {}

state.tabs = {
    all: {
        name: 'all',
        search: '',
        filters: []
    },
    dependabot: {
        name: 'dependabot',
        search: 'subject.title:Bump*',
        filters: parseFilters('subject.title:Bump*')
    },
    notifications: {
        name: 'notifications',
        search: 'repository.name:notifications',
        filters: parseFilters('repository.name:notifications')
    },
    new: {
        name: '+',
        search: ''
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
    update({ tabs: { ...state.tabs, [state.selected]: Object.assign(state.tabs[state.selected], newState) } })
}

function renderSearch() {
    const input = document.createElement('input')

    input.type = 'search'
    input.placeholder = 'search here'
    input.value = state.tabs[state.selected].search
    input.oninput = () => {
        updateTab({ search: input.value, filters: parseFilters(input.value) })
    }

    return input
}

function renderTab(tab) {
    const button = document.createElement('button')

    button.className = 'tab-button'
    button.textContent = tab.name
    button.classList.toggle('tab-button--selected', tab.name === state.selected)
    button.onclick = () => {
        update({ selected: tab.name, notifications: runFilters(tab.filters, state.allNotifications) })

        render(Object.values(state.tabs), tabsSection, renderTab)
        render([{}], searchSection, renderSearch)
        render(state.notifications, pullRequestSection, renderNotification)
    }

    return button
}

function renderNotification(notification) {
    const repoName = notification.repository.name

    // TODO: return more than one and flatmap
    // OR group by repo
    // if (!document.getElementById(repoName)) {
    //     const repo = document.createElement('h2')

    //     repo.id = repoName
    //     repo.textContent = repoName

    //     resultsDiv.append(repo)
    // }

    const prDiv = document.createElement('div');
    prDiv.className = 'pr';

    const title = document.createElement('div');
    title.className = 'pr-title';
    title.textContent = notification.subject.title;

    const link = document.createElement('a');
    link.href = notification.subject.url;
    link.textContent = 'View on GitHub';
    link.target = '_blank';

    prDiv.appendChild(title);
    prDiv.appendChild(link)

    return prDiv
}

function render(data, container, renderOne) {
    const children = data.map(renderOne)
    container.replaceChildren(...children)
}

(async function init() {
    const notifications = await (fetchNotifications().then(enrichWithPullRequestData))

    update({ allNotifications: notifications, notifications })
    render(Object.values(state.tabs), tabsSection, renderTab)
    render([{}], searchSection, renderSearch)
    render(state.notifications, pullRequestSection, renderNotification)
})()
