/*eslint-env mocha */
/*eslint-disable no-unused-vars */
import fluxlet from 'src/fluxlet'
import requirements from 'src/requirements'

import { expect } from 'chai'

describe('requirements', () => {

  let given

  const when = () => given.debug.dispatchers()
  const calculations = () => given.debug.calculations()
  const sideEffects = () => given.debug.sideEffects()

  beforeEach(() => {
    given = fluxlet()
      .hooks(requirements)
      .actions({ anyAction: () => s => s })
  })

  it('prevents a calculation from being registered if a required calculation has not been registered', () => {
    expect(() => {
      given.calculations({
        testCalcRequires: {
          requiresCalculations: "missingCalc",
          then: s => s
        }
      })
    }).to.throw(Error, "Calculation 'testCalcRequires' requires the calculation 'missingCalc' in fluxlet:(anon)")
  })

  it('allows a calculation to be registered if a required calculation has been registered', () => {
    given.calculations({ existingCalc: s => s })

    given.calculations({
      testCalcRequires: {
        requiresCalculations: "existingCalc",
        then: s => s
      }
    })

    expect(calculations().length).to.equal(2)
  })

  it('does not recognise required calculations in the same registration object', () => {
    expect(() => {
      given.calculations({
        siblingCalc: s => s,
        testCalcRequires: {
          requiresCalculations: "siblingCalc",
          then: s => s
        }
      })
    }).to.throw(Error, "Calculation 'testCalcRequires' requires the calculation 'siblingCalc' in fluxlet:(anon)")
  })

  it('prevents a side-effect from being registered if a required calculation has not been registered', () => {
    expect(() => {
      given.sideEffects({
        testSideEffectRequires: {
          requiresCalculations: "missingCalc",
          then: () => {}
        }
      })
    }).to.throw(Error, "Side effect 'testSideEffectRequires' requires the calculation 'missingCalc' in fluxlet:(anon)")
  })

  it('allows a side-effect to be registered if a required calculation has been registered', () => {
    given.calculations({ existingCalc: s => s })

    given.sideEffects({
      testSideEffectRequires: {
        requiresCalculations: "existingCalc",
        then: () => {}
      }
    })

    expect(calculations().length).to.equal(1)
    expect(sideEffects().length).to.equal(1)
  })

  it('prevents a side-effect from being registered if a required side effect has not been registered', () => {
    expect(() => {
      given.sideEffects({
        testSideEffectRequires: {
          requiresSideEffects: "missingSideEffect",
          then: () => {}
        }
      })
    }).to.throw(Error, "Side effect 'testSideEffectRequires' requires the side-effect 'missingSideEffect' in fluxlet:(anon)")
  })

  it('allows a side-effect to be registered if a required side effect has been registered', () => {
    given.sideEffects({ existingSideEffect: () => {} })

    given.sideEffects({
      testSideEffectRequires: {
        requiresSideEffects: "existingSideEffect",
        then: () => {}
      }
    })

    expect(sideEffects().length).to.equal(2)
  })

  it('does not recognise required side effects in the same registration object', () => {
    expect(() => {
      given.sideEffects({
        siblingSideEffect: s => s,
        testSideEffectRequires: {
          requiresSideEffects: "siblingSideEffect",
          then: () => {}
        }
      })
    }).to.throw(Error, "Side effect 'testSideEffectRequires' requires the side-effect 'siblingSideEffect' in fluxlet:(anon)")
  })
})
