// TODO:
// - [ ] repo tabs
// - [x] filter dependabot only
// - [x] enrich with PR data
// - [ ] sort by stale first
// - [ ] sort by number of approvals
// - [ ] filter missing review
// - [ ] polling
// - [ ] tab number/browser notifications


async function fetchAssignedPRs() {
    const url = `https://api.github.com/notifications`;
    const cache = sessionStorage.getItem('notification_data')
    let data = cache && JSON.parse(cache)

    try {
        if (!data) {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.statusText}`);
            }

            data = await response.json();
            sessionStorage.setItem('notification_data', JSON.stringify(data))
        }

        displayResults(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to fetch pull requests. Check the console for details.');
    }
}

const displayResults = async notifications => {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (notifications.length === 0) {
        resultsDiv.innerHTML = '<p>No assigned pull requests found.</p>';
        return;
    }


    const filtered = notifications
        .filter(runFilters)
        .sort((a, b) => a.repository.name.localeCompare(b.repository.name))

    document.title = `Piars (${filtered.length})`

    const enriched = await enrichWithPullRequestData(filtered)

    enriched.forEach(notification => {
        const repoName = notification.repository.name

        if (!document.getElementById(repoName)) {
            const repo = document.createElement('h2')

            repo.id = repoName
            repo.textContent = repoName

            resultsDiv.append(repo)
        }

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
        prDiv.appendChild(link);

        resultsDiv.appendChild(prDiv);

    }, undefined);
}

const runFilters = (notification) =>
    filters.every(filter => {
        if (filter.enabled) {
            try {
                const [expression] = filter.expression.replace('\n', ';').split(';')
                const { repository, subject } = notification
                return !!eval(expression)
            } catch (e) {
                console.error(e)
                return true
            }
        }

        return true
    })

const renderFilters = () => {
    const filtersSection = document.getElementById('filters');

    filters.sort((a, b) => b.enabled - a.enabled).forEach(filter => {
        const button = document.createElement('button')

        button.className = 'filter'
        button.textContent = filter.name
        button.disabled = !filter.enabled

        filtersSection.append(button)
    })
}

const enrichWithPullRequestData = async (notifications) => {
    const pullRequests = notifications.map(n => ({
        owner: n.repository.owner.login,
        repo: n.repository.name,
        number: +n.subject.url.split('/').pop()
    }))


    const { data } = await fetchPullRequests(pullRequests)

    const pullsPerRepo = Object.values(data).reduce((acc, { pullRequest }) => {
        const name = pullRequest.repository.nameWithOwner

        if (!(name in acc)) acc[name] = {}
        acc[name][pullRequest.number] = pullRequest

        return acc
    }, {})

    const enriched = notifications.map(n => {
        if (n.subject.type === 'PullRequest') {
            const [org, repositoryName, _, pullNumber] = n.subject.url.replace("https://api.github.com/repos/", "").split('/')
            n.pullRequest = pullsPerRepo[`${org}/${repositoryName}`][pullNumber]
        }

        return n
    })

    console.log(enriched)

    return enriched
}

async function fetchPullRequests(reposAndPRs) {
    const cached = sessionStorage.getItem('pr_data')

    if (cached) return JSON.parse(cached)

    const queryParts = reposAndPRs.map(({ owner, repo, number }, index) => `
        pr${index}: repository(owner: "${owner}", name: "${repo}") {
          pullRequest(number: ${number}) {
            number
            title
            url
            assignees(first: 10) {
                nodes {
                    login
                }
            }
            author { login }
            closed
            isDraft
            merged
            reviewRequests(first: 10) {
                nodes {
                    asCodeOwner
                    requestedReviewer {
                        ... on User {
                            login
                        }
                        ... on Bot {
                            login
                        }
                        ... on Mannequin {
                            login
                        }
                        ... on Team {
                            name
                        }
                    }
                }

            }
            state
            repository {
              nameWithOwner
            }
          }
        }
      `);

    const query = `
        query {
          ${queryParts.join('\n')}
        }
      `;


    try {
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();

        sessionStorage.setItem('pr_data', JSON.stringify(data))

        return data

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

renderFilters()
fetchAssignedPRs()
