/*eslint-env mocha */
/*eslint-disable no-unused-vars */
import fluxlet from 'src/fluxlet'
import lockdown from 'src/lockdown'

import { expect } from 'chai'

describe('lockdown', () => {

  let given

  const when = () => given.debug.dispatchers()

  beforeEach(() => {
    given = fluxlet()
      .hooks(lockdown)
      .actions({ anyAction: () => s => s })
  })

  it('prevent state from being initialised after an action has been dispatched', () => {
    given.state({})

    when().anyAction()

    expect(() => {
      given.state({})
    }).to.throw(Error, "Attempt to set state of fluxlet:(anon) after the first action was dispatched")
  })

  it('prevents action registration after the first dispatch', () => {
    when().anyAction()

    expect(() => {
      given.actions({ testLateAction: () => s => s })
    }).to.throw(Error, "Attempt to add actions testLateAction to fluxlet:(anon) after the first action was dispatched")
  })

  it('prevents calculation registration after the first dispatch', () => {
    when().anyAction()

    expect(() => {
      given.calculations({ testLateCalc: s => s })
    }).to.throw(Error, "Attempt to add calculations testLateCalc to fluxlet:(anon) after the first action was dispatched")
  })

  it('prevents side effect registration after the first dispatch', () => {
    when().anyAction()

    expect(() => {
      given.sideEffects({ testLateSideEffect: s => {} })
    }).to.throw(Error, "Attempt to add side effects testLateSideEffect to fluxlet:(anon) after the first action was dispatched")
  })
})
