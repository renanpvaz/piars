// TODO
// - [ ] split state and description
// 
// features
// - [x] basic equals
// - [ ] negation: NOT
// - [ ] AND, OR
// - [ ] parens
// - [ ] comparison reviewRequests.length:>3
// - [ ] comparison @self in reviewRequests
// - [ ] wild card repo:identity*

class QueryParser {
    constructor() {
        this.consumed = ''
        this.assigns = {}
        this.instructions = []
        this.state = 'initial'
    }

    symbol(...args) {
        this.instructions.push({ name: 'symbol', args })
        return this
    }

    chompWhile(...args) {
        this.instructions.push({ name: 'chompWhile', args })
        return this
    }

    keep(...args) {
        this.instructions.push({ name: 'keep', args })
        return this
    }

    drop(...args) {
        this.instructions.push({ name: 'drop', args })
        return this
    }

    run_keep(name, parser) {
        const result = parser.run(this.string)

        if (parser.state === 'done') {
            this.assigns[name] = result
            this.string = parser.string
        } else {
            this.problem(parser.problem)
        }

    }

    run_drop(parser) {
        parser.run(this.string)

        if (parser.state === 'done') {
            this.string = parser.string
        } else {
            this.problem(parser.problem)
        }
    }

    run_chompWhile(regex) {
        while (this.string.length) {
            if (this.string[0].match(regex)) this.consume(1)
            else break
        }

        return this
    }

    run_symbol(char) {
        if (this.string[0] === char) {
            this.consume(1)
        } else {
            this.problem('symbol')
        }

        return this
    }

    consume(n) {
        this.consumed += this.string.substring(0, n)
        this.string = this.string.substring(n)
    }

    problem(context) {
        this.state = 'halted'
        this.problem = `Expected ${context} at ${this.consumed}`
    }

    run(string) {
        this.string = string
        this.state = 'running'

        for (let instruction of this.instructions) {
            if (this.state !== 'running') break

            this[`run_${instruction.name}`](...instruction.args)
        }

        this.state = 'done'

        return this.consumed
    }
}

const P = () => new QueryParser()

const alphanum = P()
    .chompWhile(/^[a-zA-Z][a-zA-Z0-9_]*/g)

const basicFilter = P()
    .keep('attribute', alphanum)
    .drop(P().symbol(':'))
    .keep('value', alphanum)


