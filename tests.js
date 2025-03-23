test('parses simple filters', parseFilters('repo:thing')[0], {
    type: 'filter',
    operation: "equals",
    attribute: "repo",
    value: "thing"
})

test('parses comparison filter', parseFilters('count:>3')[0], {
    type: 'filter',
    attribute: "count",
    operation: "greaterThan",
    value: "3"
})

test('parses less than filter', parseFilters('count:<1')[0], {
    type: 'filter',
    attribute: "count",
    operation: "lessThan",
    value: "1"
})

test('parses wildcard at start', parseFilters('repo:*eact')[0], {
    type: 'filter',
    attribute: "repo",
    operation: "endsWith",
    value: "eact"
})

test('parses wildcard at end', parseFilters('repo:lp*')[0], {
    type: 'filter',
    attribute: "repo",
    operation: "startsWith",
    value: "lp"
})

test('parses array inclusion', parseFilters('reviewers:&myself')[0], {
    type: 'filter',
    attribute: "reviewers",
    operation: "includes",
    value: "myself"
})

test('supports nested attributes', parseFilters('notification.pullRequest.title:cool')[0], {
    type: 'filter',
    attribute: "notification.pullRequest.title",
    operation: "equals",
    value: "cool"
})

test('supports snake case', parseFilters('pull_request:cool')[0], {
    type: 'filter',
    attribute: "pull_request",
    operation: "equals",
    value: "cool"
})

test('supports NOT operand', parseFilters('NOT repo:react')[0], {
    type: 'not',
    expression: {
        type: 'filter',
        attribute: "repo",
        operation: "equals",
        value: "react"
    }
})

test('supports OR operation', parseFilters('repo:one OR repo:two'), [{
    type: 'or',
    expressions: [
        { type: 'filter', attribute: "repo", operation: "equals", value: "one" },
        { type: 'filter', attribute: "repo", operation: "equals", value: "two" }
    ]
}])

test('parses multiple filters', parseFilters('repo:test author:fulano').length, 2)

test('parses groups of filters', parseFilters('(repo:test OR author:fulano)')[0], {
    type: 'group',
    expressions: [{
        type: 'or',
        expressions: [
            { type: 'filter', attribute: "repo", operation: "equals", value: "test" },
            { type: 'filter', attribute: "author", operation: "equals", value: "fulano" }
        ]
    }]
})

test('combines grouped expressions', parseFilters('test:1 OR (name:thing AND repo:test)'), [
    {
        "type": "or",
        "expressions": [
            {
                "type": "filter",
                "attribute": "test",
                "operation": "equals",
                "value": "1"
            },
            {
                "type": "group",
                "expressions": [
                    {
                        "type": "filter",
                        "attribute": "name",
                        "operation": "equals",
                        "value": "thing"
                    },
                    {
                        "type": "filter",
                        "attribute": "repo",
                        "operation": "equals",
                        "value": "test"
                    }
                ]
            }
        ]
    }
])

test('parses nested groups', parseFilters('(name:thing AND (repo:test OR repo:test2))'), [
    {
        "type": "group",
        "expressions": [
            {
                "type": "filter",
                "attribute": "name",
                "operation": "equals",
                "value": "thing"
            },
            {
                "type": "group",
                "expressions": [
                    {
                        "type": "or",
                        "expressions": [
                            {
                                "type": "filter",
                                "attribute": "repo",
                                "operation": "equals",
                                "value": "test"
                            },
                            {
                                "type": "filter",
                                "attribute": "repo",
                                "operation": "equals",
                                "value": "test2"
                            }
                        ]
                    }
                ]
            }
        ]
    }
])


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
    const pass = { equal: true }
    const fail = { equal: false, left, right }

    if (typeof left !== typeof right) return fail

    if (Array.isArray(left)) {
        if (!Array.isArray(right)) return fail
        if (left.length !== right.length) return fail

        const unequal = left
            .map((element, i) => deepCompare(element, right[i]))
            .find(element => !element.equal)

        if (unequal) return unequal

        return pass
    }

    if (typeof left === 'object') {
        const keysLeft = Object.keys(left)

        if (keysLeft.length !== Object.keys(right).length) return { equal: false, left, right }

        for (let key of keysLeft) {
            const result = deepCompare(left[key], right[key])
            if (!result.equal) return result
        }

        return pass
    } else {
        const equal = left === right

        return { equal, left, right }
    }
}
