const initialState = {
  version: '1',
  tabs: [
    'all',
    'needs review',
    'approved',
    'mine',
    'dependabot',
    'big',
    'config',
  ],
  query: {
    all: '',
    'needs review':
      'state === "OPEN" && reviewDecision !== "APPROVED" && author !== viewer',
    approved: 'reviewDecision === "APPROVED"',
    mine: 'author === viewer',
    dependabot: 'author === "dependabot"',
    big: 'changedFiles > 10',
  },
  selected: 'all',
  notifications: [],
  allNotifications: {},
  settings: {
    theme: 'light',
    debug: false,
    pollIntervalMili: 1000 * 30,
    wallpaperUrl: '',
  },
}

const state = {}

function getNotifications() {
  return state.selected in state.allNotifications
    ? Object.values(state.allNotifications[state.selected])
    : []
}
