// TODO
// - [ ] split state and description
// 
// features
// - [x] basic equals
// - [x] comparison reviewRequests.length:>3
// - [ ] negation: NOT
// - [ ] AND, OR
// - [ ] parens
// - [ ] wild card repo:thing*


function parse(query) {
    let remaining = query.split(' ')
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
            case 'AND': break
            case 'OR': break
            default:
                parsed.push(parseExpression(expression))
                break
        }
    }

    return parsed
}

function parseExpression(expression) {
    const state = { consumed: '', remaining: expression }

    const attribute = consumeWhile(/^[a-zA-Z0-9_\.]*/g, state)
    const operator = consumeWhile(':', state)
    const subOperator = consumeOneOf([
        s => consumeWhile('>', s),
        s => consumeWhile('<', s)
    ], state)
    const value = consumeWhile(/^[a-zA-Z0-9_]*/g, state)

    return { type: 'filter', attribute, operator: operator + subOperator, value }
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

