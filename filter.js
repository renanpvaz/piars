// TODO
// - [x] basic equals
// - [x] comparison reviewRequests.length:>3
// - [x] negation: NOT
// - [x] AND, OR
// - [x] parens
// - [x] wild card repo:thing*

function runFilters(filters, data) {
    return data.filter(item => filters.every(filter => runFilter(item, filter)))
}

function runFilter(item, filter) {
    switch (filter.type) {
        case 'filter':
            return compare(item, filter)
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
        case 'includes':
            return Array.isArray(value) && value.includes(filter.value)
    }
}

function includes(item, filter) {
    const value = access(item, filter.attribute)

    return Array.isArray(value) && value.includes(filter.value)
}

function access(data, path) {
    return path.split('.').reduce((acc, prop) => acc[prop], data)
}

function parseFilters(query) {
    return doParse(query.split(' '))
}

function doParse(expressions) {
    let remaining = expressions
    let expression
    const parsed = []

    while (expression = remaining.shift()) {
        switch (expression) {
            case 'NOT':
                parsed.push({
                    type: 'not',
                    expression: parseExpression(remaining.shift())
                })
                break
            case 'AND':
                // assumed by default
                break
            case 'OR': {
                const left = parsed.pop()

                parsed.push({
                    type: 'or',
                    expressions: [left, ...doParse(remaining)],
                })
                break
            }
            default:
                if (expression.startsWith('(')) {
                    remaining.unshift(expression.substring(1))
                    parsed.push({
                        type: 'group',
                        expressions: doParse(remaining)
                    })
                } else if (expression.endsWith(')')) {
                    expression = expression.slice(0, -1)
                    parsed.push(parseExpression(expression))

                    return parsed
                } else {
                    parsed.push(parseExpression(expression))
                }

                break
        }
    }

    return parsed
}

function parseExpression(expression) {
    const state = { consumed: '', remaining: expression }

    const attribute = consumeWhile(/^[a-zA-Z0-9_\.]*/g, state)

    consumeWhile(':', state)

    const subOperator = consumeOneOf([
        s => consumeWhile('>', s),
        s => consumeWhile('<', s),
        s => consumeWhile('&', s)
    ], state)

    const startWildcard = consumeWhile(/\*/g, state)

    const value = consumeWhile(/^[a-zA-Z0-9_]*/g, state)

    const endWildcard = consumeWhile(/\*/g, state)

    const operation = startWildcard
        ? 'endsWith' : endWildcard
            ? 'startsWith' : subOperator === '>'
                ? 'greaterThan' : subOperator === '<'
                    ? 'lessThan' : subOperator === '&'
                        ? 'includes' : 'equals'

    return { type: 'filter', attribute, operation, value }
}

function consumeOneOf(consumers, initialState) {
    let consumer

    while (consumer = consumers.shift()) {
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

