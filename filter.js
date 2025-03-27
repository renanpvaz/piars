// TODO
// - [x] basic equals
// - [x] comparison reviewRequests.length:>3
// - [x] negation: NOT
// - [x] AND, OR
// - [x] parens
// - [x] wild card repo:thing*
// - [x] NOT group
// - [ ] fix filter running

function runFilters(filters, data) {
  return data.filter((item) =>
    filters.every((filter) => runFilter(item, filter)),
  )
}

function runFilter(item, filter) {
  switch (filter.type) {
    case 'not':
      return !runFilter(item, filter.expression)
    case 'filter':
      return compare(item, filter)
    case 'inclusion':
      const [{ value: target }, { value: property }] = filter.expressions
      const value = access(item, property)
      return Array.isArray(value) && value.includes(target)
  }
}

function compare(item, filter) {
  const value = access(item, filter.attribute)

  switch (filter.operation) {
    case 'equals':
      return value === filter.value
    case 'startsWith':
      return value.startsWith(filter.value)
    case 'endsWith':
      return value.endsWith(filter.value)
    case 'lessThan':
      return value < filter.value
    case 'greaterThan':
      return value > filter.value
  }
}

function access(data, path) {
  return path.split('.').reduce((acc, prop) => acc[prop], data)
}

function parseQuery(query) {
  return doParseQuery(query.split(' '))
}

function doParseQuery(tokens) {
  let token = tokens.shift()
  let negate = false
  let expr

  if (token === 'NOT') {
    negate = true
    token = tokens.shift()
  }

  if (token.startsWith('(')) {
    tokens.unshift(token.substring(1))

    expr = {
      type: 'group',
      expression: doParseQuery(tokens),
    }
  } else if (token.endsWith(')')) {
    return parseExpression(token.slice(0, -1))
  }

  expr = expr || parseExpression(token)

  if (negate) expr.negate = negate

  const [nextToken] = tokens

  if (['OR', 'IN', 'AND'].includes(nextToken)) {
    tokens.shift()
    return {
      type: nextToken.toLowerCase(),
      expressions: [expr, doParseQuery(tokens)],
    }
  } else if (!nextToken) {
    return { ...expr, ...(negate && { negate }) }
  }

  return {
    type: 'and',
    expressions: [expr, doParseQuery(tokens)],
  }
}

function parseExpression(expression) {
  const state = { consumed: '', remaining: expression }

  const term = consumeWhile(/^[a-zA-Z0-9_\.]*/g, state)
  const attributeFilter = !!consumeWhile(':', state)

  if (attributeFilter) {
    return { type: 'filter', attribute: term, ...parseAttributeFilter(state) }
  }

  return { type: 'filter', operation: 'match', value: term }
}

function parseAttributeFilter(state) {
  const subOperator = consumeOneOf(
    [(s) => consumeWhile('>', s), (s) => consumeWhile('<', s)],
    state,
  )

  const startWildcard = consumeWhile(/\*/g, state)

  const value = parseValue(state)

  const endWildcard = consumeWhile(/\*/g, state)

  const operation = startWildcard
    ? 'endsWith'
    : endWildcard
      ? 'startsWith'
      : subOperator === '>'
        ? 'greaterThan'
        : subOperator === '<'
          ? 'lessThan'
          : 'equals'

  return { value, operation }
}

function parseValue(state) {
  let value = consumeWhile(/^[a-zA-Z0-9_]*/g, state)

  if (value.match(/^\d+$/g)) {
    value = Number(value)
  } else if (['true', 'false'].includes(value)) {
    value = Boolean(value)
  }

  return value
}

function consumeOneOf(consumers, initialState) {
  let consumer

  while ((consumer = consumers.shift())) {
    const state = { ...initialState }
    const result = consumer(state)

    if (result.length) {
      Object.assign(initialState, state)
      return result
    }
  }

  return ''
}

function consumeWhile(regex, state) {
  state.consumed = ''

  while (state.remaining.length) {
    const match = state.remaining[0].match(regex)
    if (match && match[0]) {
      state.consumed += state.remaining[0]
      state.remaining = state.remaining.substring(1)
    } else break
  }

  return state.consumed
}
