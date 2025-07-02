const config = {}
const initialConfig = {
    accessToken: '',
    tabs: [
        { name: 'all' },
        { name: 'needs review', query: 'state === "OPEN" && reviewDecision !== "APPROVED" && author !== viewer' },
        { name: 'approved', query: 'reviewDecision === "APPROVED"', },
        { name: 'mine', query: 'author === viewer', },
        { name: 'dependabot', query: 'author === "dependabot"', },
        { name: 'big', query: 'changedFiles > 10' }
    ]
}

const cacheKey = 'piars-config'


function initializeConfig() {
    let cachedConfig

    try {
        cachedConfig = JSON.parse(localStorage.getItem(cacheKey))
    } catch { }

    updateConfig(Object.assign(initialConfig, cachedConfig))
}


function updateConfig(changes) {
    Object.assign(config, changes)
    localStorage.setItem(cacheKey, JSON.stringify(config))
}

function readConfig(value) {
    try {
        const newConfig = JSON.parse(value)
        updateConfig(newConfig)
        return true
    } catch {
        return false
    }
}

function showConfig() {
    return JSON.stringify(config, null, 2)
}
