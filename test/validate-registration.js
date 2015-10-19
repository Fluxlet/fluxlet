/*eslint-env mocha */
/*eslint-disable no-unused-vars */
import fluxlet from 'src/fluxlet'
import validateRegistrations from 'src/validate-registrations'

import { expect } from 'chai'

describe('validate-registrations', () => {

  let given

  beforeEach(() => {
    given = fluxlet()
      .hooks(validateRegistrations)
  })


  it('allows an action function to be registered', () => {
    given.actions({ anAction: () => s => s })

    expect(given.has.action('anAction')).to.be.true
  })

  it('allows an action object with *then* function to be registered', () => {
    given.actions({ anAction: {
      then: () => s => s
    }})

    expect(given.has.action('anAction')).to.be.true
  })

  it('prevents an action object without a *then* function from being registered', () => {
    expect(() => {
      given.actions({ invalidAction: {} })

    }).to.throw(TypeError, "Action 'invalidAction' must be a function, or an object containing a 'then' function")
  })


  it('allows a calculation function to be registered', () => {
    given.calculations({ testCalcA: s => s })

    expect(given.has.calculation('testCalcA')).to.be.true
  })

  it('allows a calculation object with *then* function to be registered', () => {
    given.calculations({ testCalcA: {
      then: s => s
    }})

    expect(given.has.calculation('testCalcA')).to.be.true
  })

  it('prevents a calculation object without a *then* function from being registered', () => {
    expect(() => {
      given.calculations({ invalidCalc: {} })

    }).to.throw(Error, "Calculation 'invalidCalc' must be a function, or an object containing a 'then' function")
  })


  it('allows a side-effect function to be registered', () => {
    given.sideEffects({ testSideEffectA: () => {} })

    expect(given.has.sideEffect('testSideEffectA')).to.be.true
  })

  it('allows a side-effect object with *then* function to be registered', () => {
    given.sideEffects({ testSideEffectA: {
      then: () => {}
    }})

    expect(given.has.sideEffect('testSideEffectA')).to.be.true
  })

  it('prevents a side-effect object without a *then* function from being registered', () => {
    expect(() => {
      given.sideEffects({ invalidSideEffect: {} })

    }).to.throw(Error, "Side effect 'invalidSideEffect' must be a function, or an object containing a 'then' function")
  })
})
