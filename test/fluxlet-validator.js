/*eslint-env jasmine */
/*eslint-disable no-unused-vars */

import fluxlet from 'src/fluxlet'
import validator from 'src/fluxlet-validator'

function spyCreator(type) {
  return fn => jasmine.createSpy(type, fn).and.callThrough()
}

const validatorSpy = spyCreator('validator')

describe('Fluxlet', () => {

  let given

  const dispatchers = () => given.debug.dispatchers()
  // const calculations = () => given.debug.calculations()
  // const sideEffects = () => given.debug.sideEffects()
  const when = dispatchers
  // const state = () => given.debug.state()
  // const validator = () => given.debug.validator()

  beforeEach(() => {
    given = fluxlet()
  })

  describe('validator', () => {

    it('is called to validate initial state', () => {
      const s = {}
      const v = validatorSpy(s => {})

      given.hooks(validator(v))
      given.state(s)

      expect(v).toHaveBeenCalledWith(s)
    })

    it('is called to validate state returned from an action', () => {
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }
      const v = validatorSpy(s => {})

      given.hooks(validator(v))
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s2 })

      when().testValidatorAction()

      expect(v.calls.count()).toBe(2)
      expect(v).toHaveBeenCalledWith(s2)
    })

    it('is not called after an action if state has not changed', () => {
      const s1 = { stage: 1 }
      const v = validatorSpy(s => {})

      given.hooks(validator(v))
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s })

      when().testValidatorAction()

      expect(v.calls.count()).toBe(1)
    })

    it('is called to validate state returned from a calculation', () => {
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }
      const s3 = { stage: 3 }
      const v = validatorSpy(s => {})

      given.hooks(validator(v))
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s2 })
      given.calculations({ testValidatorCalc: s => s3 })

      when().testValidatorAction()

      expect(v.calls.count()).toBe(3)
      expect(v).toHaveBeenCalledWith(s3)
    })

    it('is not called after a calculation if the calculation has not changed the state', () => {
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }
      const v = validatorSpy(s => {})

      given.hooks(validator(v))
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s2 })
      given.calculations({ testValidatorCalc: s => s })

      when().testValidatorAction()

      expect(v.calls.count()).toBe(2)
    })

    it('should throw an error on invalid state', () => {
      given.hooks(validator(() => {
        throw "INVALID STATE"
      }))

      expect(() => {
        given.state({})
      }).toThrow("INVALID STATE")
    })
  })
})
