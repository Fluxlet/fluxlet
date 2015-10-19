/*eslint-env mocha */
/*eslint-disable no-unused-vars */
import fluxlet from 'src/fluxlet'
import dedupe from 'src/dedupe'

import { expect } from 'chai'

describe('dedupe', () => {

  let given

  beforeEach(() => {
    given = fluxlet()
      .hooks(dedupe)
  })

  it('prevents registration of existing actions', () => {
    given.actions({ existingAction: () => s => s })

    expect(() => {
      given.actions({ existingAction: () => s => s })
    }).to.throw(Error, "Attempt to add an existing action 'existingAction' to fluxlet:(anon)")
  })

  it('prevents registration of existing calculations', () => {
    given.calculations({ existingCalc: s => s })

    expect(() => {
      given.calculations({ existingCalc: s => s })
    }).to.throw(Error, "Attempt to add an existing calculation 'existingCalc' to fluxlet:(anon)")
  })

  it('prevents registration of existing side effects', () => {
    given.sideEffects({ existingSideEffect: () => {} })

    expect(() => {
      given.sideEffects({ existingSideEffect: () => {} })
    }).to.throw(Error, "Attempt to add an existing side-effect 'existingSideEffect' to fluxlet:(anon)")
  })

})
