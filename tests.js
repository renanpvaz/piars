test('parses simple filters', parse('repo:thing')[0], {
    type: 'filter',
    operator: ":",
    attribute: "repo",
    value: "thing"
})

test('parses comparison filter', parse('count:>3')[0], {
    type: 'filter',
    attribute: "count",
    operator: ":>",
    value: "3"
})

test('supports nested attributes', parse('notification.pullRequest.title:cool')[0], {
    type: 'filter',
    attribute: "notification.pullRequest.title",
    operator: ":",
    value: "cool"
})

test('supports snake case', parse('pull_request:cool')[0], {
    type: 'filter',
    attribute: "pull_request",
    operator: ":",
    value: "cool"
})

test('supports NOT operand', parse('NOT repo:react')[0], {
    type: 'not',
    expression: {
        type: 'filter',
        attribute: "repo",
        operator: ":",
        value: "react"
    }
})

test('parses multiple filters', parse('repo:test author:fulano').length, 2)

function test(name, actual, expected) {
    const { equal, left, right } = deepCompare(expected, actual)

    if (equal) {
        console.log(`[PASSED] ${name}`)
    } else {
        console.log(`[FAILED] ${name}`)
        console.table({ expected: left, actual: right })
    }
}


function deepCompare(left, right) {
    if (typeof left !== typeof right) return { equal: false, left, right }
    if (Array.isArray(left) !== Array.isArray(right)) return { equal: false, left, right }

    if (typeof left === 'object') {
        const keysLeft = Object.keys(left)

        if (keysLeft.length !== Object.keys(right).length) return { equal: false, left, right }

        for (let key of keysLeft) {
            const result = deepCompare(left[key], right[key])
            if (!result.equal) return result
        }

        return { equal: true, left, right }
    } else {
        const equal = left === right

        return { equal, left, right }
    }
}
