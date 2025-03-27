test('parses plain text search', parseQuery('thing'), {
  type: 'filter',
  operation: 'match',
  value: 'thing',
})

test('parses simple filters', parseQuery('repo:thing'), {
  type: 'filter',
  operation: 'equals',
  attribute: 'repo',
  value: 'thing',
})

test('parses comparison filter', parseQuery('count:>3'), {
  type: 'filter',
  attribute: 'count',
  operation: 'greaterThan',
  value: 3,
})

test('parses less than filter', parseQuery('count:<1'), {
  type: 'filter',
  attribute: 'count',
  operation: 'lessThan',
  value: 1,
})

test('parses wildcard at start', parseQuery('repo:*eact'), {
  type: 'filter',
  attribute: 'repo',
  operation: 'endsWith',
  value: 'eact',
})

test('parses wildcard at end', parseQuery('repo:lp*'), {
  type: 'filter',
  attribute: 'repo',
  operation: 'startsWith',
  value: 'lp',
})

test(
  'supports nested attributes',
  parseQuery('notification.pullRequest.title:cool'),
  {
    type: 'filter',
    attribute: 'notification.pullRequest.title',
    operation: 'equals',
    value: 'cool',
  },
)

test('supports snake case', parseQuery('pull_request:cool'), {
  type: 'filter',
  attribute: 'pull_request',
  operation: 'equals',
  value: 'cool',
})

test('supports NOT operand', parseQuery('NOT repo:react'), {
  type: 'filter',
  attribute: 'repo',
  operation: 'equals',
  value: 'react',
  negate: true,
})

test(
  'supports NOT followed by group',
  parseQuery('NOT (repo:react OR repo:vue)'),
  {
    type: 'group',
    negate: true,
    expression: {
      type: 'or',
      expressions: [
        {
          type: 'filter',
          attribute: 'repo',
          operation: 'equals',
          value: 'react',
        },
        {
          type: 'filter',
          attribute: 'repo',
          operation: 'equals',
          value: 'vue',
        },
      ],
    },
  },
)

test('supports OR operation', parseQuery('repo:one OR repo:two'), {
  type: 'or',
  expressions: [
    { type: 'filter', attribute: 'repo', operation: 'equals', value: 'one' },
    { type: 'filter', attribute: 'repo', operation: 'equals', value: 'two' },
  ],
})

test('parses groups of filters', parseQuery('(repo:test OR author:fulano)'), {
  type: 'group',
  expression: {
    type: 'or',
    expressions: [
      {
        type: 'filter',
        attribute: 'repo',
        operation: 'equals',
        value: 'test',
      },
      {
        type: 'filter',
        attribute: 'author',
        operation: 'equals',
        value: 'fulano',
      },
    ],
  },
})

test(
  'combines grouped expressions',
  parseQuery('test:1 OR (name:thing AND repo:test)'),
  {
    type: 'or',
    expressions: [
      {
        type: 'filter',
        attribute: 'test',
        operation: 'equals',
        value: 1,
      },
      {
        type: 'group',
        expression: {
          type: 'and',
          expressions: [
            {
              type: 'filter',
              attribute: 'name',
              operation: 'equals',
              value: 'thing',
            },
            {
              type: 'filter',
              attribute: 'repo',
              operation: 'equals',
              value: 'test',
            },
          ],
        },
      },
    ],
  },
)

test(
  'combines expressions starting with group',
  parseQuery('(name:thing AND repo:test) OR test:1'),
  {
    type: 'or',
    expressions: [
      {
        type: 'group',
        expression: {
          type: 'and',
          expressions: [
            {
              type: 'filter',
              attribute: 'name',
              operation: 'equals',
              value: 'thing',
            },
            {
              type: 'filter',
              attribute: 'repo',
              operation: 'equals',
              value: 'test',
            },
          ],
        },
      },
      {
        type: 'filter',
        attribute: 'test',
        operation: 'equals',
        value: 1,
      },
    ],
  },
)

test(
  'parses nested groups',
  parseQuery('(name:thing AND (repo:test OR repo:test2))'),
  {
    type: 'group',
    expression: {
      type: 'and',
      expressions: [
        {
          type: 'filter',
          attribute: 'name',
          operation: 'equals',
          value: 'thing',
        },
        {
          type: 'group',
          expression: {
            type: 'or',
            expressions: [
              {
                type: 'filter',
                attribute: 'repo',
                operation: 'equals',
                value: 'test',
              },
              {
                type: 'filter',
                attribute: 'repo',
                operation: 'equals',
                value: 'test2',
              },
            ],
          },
        },
      ],
    },
  },
)

test(
  'parses nested groups regardless of order',
  parseQuery('((repo:test OR repo:test2) AND name:thing)'),
  {
    type: 'group',
    expression: {
      type: 'and',
      expressions: [
        {
          type: 'group',
          expression: {
            type: 'or',
            expressions: [
              {
                type: 'filter',
                attribute: 'repo',
                value: 'test',
                operation: 'equals',
              },
              {
                type: 'filter',
                attribute: 'repo',
                value: 'test2',
                operation: 'equals',
              },
            ],
          },
        },
        {
          type: 'filter',
          attribute: 'name',
          value: 'thing',
          operation: 'equals',
        },
      ],
    },
  },
)

test('parses inclusion operator', parseQuery('myself IN reviewers'), {
  type: 'in',
  expressions: [
    {
      type: 'filter',
      operation: 'match',
      value: 'myself',
    },
    {
      type: 'filter',
      operation: 'match',
      value: 'reviewers',
    },
  ],
})

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
      .map((element, i) => {
        return deepCompare(element, right[i])
      })
      .find((element) => !element.equal)

    if (unequal) return unequal

    return pass
  }

  if (typeof left === 'object') {
    const keysLeft = Object.keys(left)

    if (keysLeft.length !== Object.keys(right).length)
      return { equal: false, left, right }

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
