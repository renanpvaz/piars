test('parses simple filters', deepEqual(parse('repo:thing')[0], {
    "attribute": "repo",
    "operator": ":",
    "value": "thing"
}))

test('parses comparison filter', deepEqual(parse('count:>3')[0], {
    "attribute": "count",
    "operator": ":>",
    "value": "3"
}))

test('parses multiple filters', parse('repo:test author:fulano').length === 2)

function test(name, assertion) {
    console.log(`${!!assertion ? '[PASSED]' : '[FAILED]'} ${name}`)
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
