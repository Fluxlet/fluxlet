/*eslint-env mocha */
/*eslint-disable no-unused-vars */
import fluxlet from 'src/fluxlet'
import { gather, expose } from 'src/backdoor'

import chai, { expect } from 'chai'
import sinon, { match } from 'sinon'
import sinonChai from 'sinon-chai'

chai.use(sinonChai)

function spyCreator(type) {
  return fn => {
    fn.displayName = type
    return sinon.spy(fn)
  }
}

const actionSpy = spyCreator('action')
const calculationSpy = spyCreator('calculation')
const sideEffectSpy = spyCreator('side effect')
const whenSpy = spyCreator('when')

describe('Fluxlet', () => {

  it('can be created without an id', () => {
    const f = fluxlet()
    expect(f.id()).to.be.undefined
  })

  it('can be created with an id', () => {
    const f = fluxlet("flux-name")
    expect(f.id()).to.equal("flux-name")
  })

  it('can retrieve an existing instance by id', () => {
    const e = fluxlet("existing-fluxlet")
    const f = fluxlet("existing-fluxlet")
    expect(f).to.equal(e)
  })

  it('can be removed by id and will be anonymised', () => {
    const f = fluxlet("removed-fluxlet")
    f.remove()
    const n = fluxlet("removed-fluxlet")

    expect(n).not.to.equal(f)
    expect(f.id()).to.be.undefined
  })
})

describe('Fluxlet', () => {

  let given
  const when = () => expose(given).dispatcher
  const state = () => expose(given).initialState

  beforeEach(() => {
    given = fluxlet()
      .hooks(gather)
  })

  describe('state', () => {

    it('returns fluxlet', () => {
      expect(given.state({})).to.equal(given)
    })

    it('sets the initial state', () => {
      const s = {}

      given.state(s)

      expect(state()).to.equal(s)
    })

    it('sets the initial state from a function', () => {
      const s = {}
      const f = () => s

      given.state(f)

      expect(state()).to.equal(s)
    })

    it('passes the existing state to the function', () => {
      const s = {}
      const f = spyCreator("state function")(v => v)

      given.state(s)
      given.state(f)

      expect(f).to.have.been.calledWith(s)
    })
  })

  describe('actions', () => {

    it('are wrapped with a dispatcher', () => {
      given.actions({ testA: () => s => s })

      expect(given.has.action('testA')).to.be.true
    })

    it('are dispatched', () => {
      const testB = actionSpy(() => s => s)
      given.actions({ testB })

      when().testB()

      expect(testB).to.have.been.called
    })

    it('can not be directly called from within another action', () => {
      given.actions({ testNest1: () => s => when().testNest2() })
      given.actions({ testNest2: () => s => s })

      expect(() => {
        when().testNest1()
      }).to.throw(Error, "Attempt to dispatch action 'testNest2' within action 'testNest1' in fluxlet:(anon)")
    })

    it('accepts multiple actions in an object', () => {
      given.actions({
        actionOne: () => s => s,
        actionTwo: () => s => s
      })

      expect(given.has.action('actionOne')).to.be.true
      expect(given.has.action('actionTwo')).to.be.true
    })

    it('accepts actions in multiple arguments', () => {
      given.actions(
        { actionOne: () => s => s },
        { actionTwo: () => s => s }
      )

      expect(given.has.action('actionOne')).to.be.true
      expect(given.has.action('actionTwo')).to.be.true
    })

    describe('conditional', () => {

      it('are dispatched when true', () => {
        const testC = {
          when: whenSpy(s => true),
          then: actionSpy(() => s => s)
        }

        given.actions({ testC })

        when().testC()

        expect(testC.when).to.have.been.called
        expect(testC.then).to.have.been.called
      })

      it('are not dispatched when false', () => {
        const testD = {
          when: whenSpy(s => false),
          then: actionSpy(() => s => s)
        }

        given.actions({ testD })

        when().testD()

        expect(testD.when).to.have.been.called
        expect(testD.then).not.to.have.been.called
      })

      it('when is passed state and args', () => {
        const testE = {
          when: whenSpy((s, a, b) => true),
          then: actionSpy((a, b) => s => s)
        }
        const initialState = { one: 1 }

        given.state(initialState)
        given.actions({ testE })

        when().testE(10, 'B')

        expect(testE.when).to.have.been.calledWith(initialState, 10, 'B')
        expect(testE.then).to.have.been.calledWith(10, 'B')
      })

    })

    it('must return a function', () => {
      const testE = actionSpy(() => { foo: "bar" })
      given.actions({ testE })

      expect(() => { when().testE() }).to.throw(Error)
    })
  })

  describe('calculation', () => {

    beforeEach(() => {
      given.actions({ anyAction: () => s => s })
    })

    it('can be a plain function', () => {
      given.calculations({ testCalcA: s => s })
      expect(given.has.calculation('testCalcA')).to.be.true
    })

    it('is called within any action dispatch', () => {
      const testCalcB = calculationSpy(s => s)

      given.calculations({ testCalcB })

      when().anyAction()

      expect(testCalcB).to.have.been.called
    })

    it('accepts multiple calculations in an object', () => {
      given.calculations({
        calcOne: s => s,
        calcTwo: s => s
      })

      expect(given.has.calculation('calcOne')).to.be.true
      expect(given.has.calculation('calcTwo')).to.be.true
    })

    it('accepts calculations in multiple arguments', () => {
      given.calculations(
        { calcOne: s => s },
        { calcTwo: s => s }
      )

      expect(given.has.calculation('calcOne')).to.be.true
      expect(given.has.calculation('calcTwo')).to.be.true
    })

    describe('as conditional', () => {

      it('is called when true', () => {
        const testCalcC = {
          when: whenSpy(s => true),
          then: calculationSpy(() => s => s)
        }

        given.calculations({ testCalcC })

        when().anyAction()

        expect(testCalcC.when).to.have.been.called
        expect(testCalcC.then).to.have.been.called
      })

      it('is not called when false', () => {
        const testCalcD = {
          when: whenSpy(s => false),
          then: calculationSpy(() => s => s)
        }

        given.calculations({ testCalcD })

        when().anyAction()

        expect(testCalcD.when).to.have.been.called
        expect(testCalcD.then).not.to.have.been.called
      })
    })
  })

  describe('side-effect', () => {

    beforeEach(() => {
      given.state({ value: 0 })
      given.actions({ doNothing: () => s => s })
      given.actions({ doSomething: () => ({ value }) => ({ value: value+1 }) })
    })

    it('can be a plain function', () => {
      given.sideEffects({ testSideEffectA: () => {} })

      expect(given.has.sideEffect('testSideEffectA')).to.be.true
    })

    it('is called after an action that changes state', () => {
      const testSideEffectB = sideEffectSpy(() => {})

      given.sideEffects({ testSideEffectB })

      when().doSomething()

      expect(testSideEffectB).to.have.been.called
    })

    it('is not called after an action that does not change state', () => {
      const testSideEffectC = sideEffectSpy(() => {})

      given.sideEffects({ testSideEffectC })

      when().doNothing()

      expect(testSideEffectC).not.to.have.been.called
    })

    it('accepts multiple side effects in an object', () => {
      given.sideEffects({
        sideEffectOne: s => {},
        sideEffectTwo: s => {}
      })

      expect(given.has.sideEffect('sideEffectOne')).to.be.true
      expect(given.has.sideEffect('sideEffectTwo')).to.be.true
    })

    it('accepts side effects in multiple arguments', () => {
      given.sideEffects(
        { sideEffectOne: s => {} },
        { sideEffectTwo: s => {} }
      )

      expect(given.has.sideEffect('sideEffectOne')).to.be.true
      expect(given.has.sideEffect('sideEffectTwo')).to.be.true
    })

    describe('as conditional', () => {

      it('is called when true', () => {
        const testSideEffectD = {
          when: whenSpy(s => true),
          then: sideEffectSpy(() => {})
        }

        given.sideEffects({ testSideEffectD })

        when().doSomething()

        expect(testSideEffectD.when).to.have.been.called
        expect(testSideEffectD.then).to.have.been.called
      })

      it('is not called when false', () => {
        const testSideEffectE = {
          when: whenSpy(s => false),
          then: sideEffectSpy(() => {})
        }

        given.sideEffects({ testSideEffectE })

        when().doSomething()

        expect(testSideEffectE.when).to.have.been.called
        expect(testSideEffectE.then).not.to.have.been.called
      })
    })
  })

  describe('init', () => {

    it('calls the given function passing all dispatchers', () => {
      given.actions({
        action1: () => s => s,
        action2: () => s => s
      })

      const f = spyCreator('init function')((dispatchers) => {})

      given.init(f)

      expect(f).to.have.been.calledWith({
        action1: match.any,
        action2: match.any
      })
    })
  })
})
