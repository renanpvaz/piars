// TODO
// - [ ] fix filter running

function runFilter(filter, data) {
  return data.filter(
    ({
      title,
      url,
      unread,
      updatedAt,
      reason,
      repository,
      repositoryFullName,
      reviewRequests,
      author,
      reviewDecision,
      state,
      draft,
      age,
      changedFiles,
    }) => {
      return filter ? eval(filter) || false : true
    },
  )
}
