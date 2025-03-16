test('parses simple filters', parse('repo:thing')[0], {
    operator: ":",
    attribute: "repo",
    value: "thing"
})

test('parses comparison filter', parse('count:>3')[0], {
    attribute: "count",
    operator: ":>",
    value: "3"
})

test('supports nested attributes', parse('notification.pullRequest.title:cool')[0], {
    attribute: "notification.pullRequest.title",
    operator: ":",
    value: "cool"
})

test('supports snake case', parse('pull_request:cool')[0], {
    attribute: "pull_request",
    operator: ":",
    value: "cool"
})

test('parses multiple filters', parse('repo:test author:fulano').length, 2)

function test(name, actual, expected) {
    const passed = deepEqual(expected, actual)

    if (passed) {
        console.log(`[PASSED] ${name}`)
    } else {
        console.log(`[FAILED] ${name}`)
        console.table({ expected, actual })
    }
}


function deepEqual(left, right) {
    if (typeof left !== typeof right) return false
    if (Array.isArray(left) !== Array.isArray(right)) return false

    if (typeof left === 'object') {
        const keysLeft = Object.keys(left)

        if (keysLeft.length !== Object.keys(right).length) return false

        for (let key of keysLeft) {
            if (!deepEqual(left[key], right[key])) return false
        }

        return true
    } else {
        return left === right
    }
}
