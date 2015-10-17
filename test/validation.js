/*eslint-env mocha */
/*eslint-disable no-unused-vars */

import fluxlet from 'src/fluxlet'
import validation from 'src/validation'

import chai, { expect } from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

chai.use(sinonChai)

function spyCreator(type) {
  return fn => {
    fn.displayName = type
    return sinon.spy(fn)
  }
}

const validatorSpy = spyCreator('validator')

describe('Fluxlet', () => {

  let given

  const dispatchers = () => given.debug.dispatchers()
  const when = dispatchers

  beforeEach(() => {
    given = fluxlet()
  })

  describe('validator', () => {

    it('is called to validate initial state', () => {
      const s = {}
      const v = validatorSpy(s => {})

      given.hooks(validation(v))
      given.state(s)

      expect(v).to.have.been.calledWith(s)
    })

    it('is called to validate state returned from an action', () => {
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }
      const v = validatorSpy(s => {})

      given.hooks(validation(v))
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s2 })

      when().testValidatorAction()

      expect(v).to.have.been.calledTwice
      expect(v).to.have.been.calledWith(s2)
    })

    it('is not called after an action if state has not changed', () => {
      const s1 = { stage: 1 }
      const v = validatorSpy(s => {})

      given.hooks(validation(v))
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s })

      when().testValidatorAction()

      expect(v).to.have.been.calledOnce
    })

    it('is called to validate state returned from a calculation', () => {
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }
      const s3 = { stage: 3 }
      const v = validatorSpy(s => {})

      given.hooks(validation(v))
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s2 })
      given.calculations({ testValidatorCalc: s => s3 })

      when().testValidatorAction()

      expect(v).to.have.been.calledThrice
      expect(v).to.have.been.calledWith(s3)
    })

    it('is not called after a calculation if the calculation has not changed the state', () => {
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }
      const v = validatorSpy(s => {})

      given.hooks(validation(v))
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s2 })
      given.calculations({ testValidatorCalc: s => s })

      when().testValidatorAction()

      expect(v).to.have.been.calledTwice
    })

    it('should throw an error on invalid state', () => {
      const v = () => {
        throw "INVALID STATE"
      }

      given.hooks(validation(v))

      expect(() => {
        given.state({})
      }).to.throw("INVALID STATE")
    })
  })
})
