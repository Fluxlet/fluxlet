/*eslint-env mocha */
/*eslint-disable no-unused-vars */

import fluxlet from 'src/fluxlet'
import * as log from 'src/logging'

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

describe('Fluxlet', () => {

  let given

  const when = () => given.debug.dispatchers()

  beforeEach(() => {
    given = fluxlet()
  })

  describe('log', () => {
    let consoleSpy

    beforeEach(() => {
      consoleSpy = {
        log: spyCreator('console.log')(() => {}),
        group: spyCreator('console.group')(() => {}),
        groupCollapsed: spyCreator('console.groupCollapsed')(() => {}),
        groupEnd: spyCreator('console.groupEnd')(() => {})
      }

      log.setLogger(consoleSpy)
    })

    describe('registrations', () => {
      beforeEach(() => {
        given.hooks(log.registrations)
      })

      it('logs setting of initial state', () => {
        const s0 = { stage: 0}
        given.state(s0)
        expect(consoleSpy.log).to.have.been.calledWith('fluxlet:(anon) initial state', s0)
      })

      it('logs registration of an action', () => {
        given.actions({ anAction: () => s => s })
        expect(consoleSpy.log).to.have.been.calledWith('fluxlet:(anon) register action anAction')
      })

      it('logs registration of a calculation', () => {
        given.calculations({ aCalc: s => s })
        expect(consoleSpy.log).to.have.been.calledWith('fluxlet:(anon) register calculation aCalc')
      })

      it('logs registration of a side effect', () => {
        given.sideEffects({ aSideEffect: () => {} })
        expect(consoleSpy.log).to.have.been.calledWith('fluxlet:(anon) register sideEffect aSideEffect')
      })
    })

    describe('dispatches', () => {
      const s0 = { stage: 0 }
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }

      beforeEach(() => {
        given.hooks(log.dispatches)
      })

      it('logs the action name on dispatch', () => {
        given.actions({ anAction: (a, b) => s => s })

        when().anAction("A", "B")

        expect(consoleSpy.group).to.have.been.calledWith('fluxlet:(anon) dispatch anAction')
        expect(consoleSpy.log).to.have.been.calledWith('action args', ['A', 'B'])
        expect(consoleSpy.groupEnd).to.have.been.called
      })

      it('logs the start and final state', () => {
        given.state(s0)
        given.actions({ doSomething: () => s => s1 })
        given.calculations({ calcSomething: s => s2 })

        when().doSomething()

        expect(consoleSpy.log).to.have.been.calledWith('start state', s0)
        expect(consoleSpy.log).to.have.been.calledWith('final state', s2)
      })
    })

    describe('calculations', () => {
      const s0 = { stage: 0 }
      const s1 = { stage: 1 }

      beforeEach(() => {
        given.hooks(log.calculations)
        given.state(s0)
        given.actions({ doSomething: () => s => s1 })
      })

      it('logs the calculation name when called', () => {
        given.calculations({ aCalc: s => s })

        when().doSomething()

        expect(consoleSpy.log).to.have.been.calledWith('fluxlet:(anon) calculation aCalc')
      })

      it('supresses the logId prefix inside a dispatch group', () => {
        given.hooks(log.dispatches)
        given.calculations({ aCalc: s => s })

        when().doSomething()

        expect(consoleSpy.log).to.have.been.calledWith('calculation aCalc')
      })
    })

    describe('sideEffects', () => {
      const s0 = { stage: 0 }
      const s1 = { stage: 1 }

      beforeEach(() => {
        given.hooks(log.sideEffects)
        given.state(s0)
        given.actions({ doSomething: () => s => s1 })
      })

      it('logs the side effect name when called', () => {
        given.sideEffects({ aSideEffect: () => {} })

        when().doSomething()

        expect(consoleSpy.log).to.have.been.calledWith('fluxlet:(anon) sideEffect aSideEffect')
      })

      it('supresses the logId prefix inside a dispatch group', () => {
        given.hooks(log.dispatches)
        given.sideEffects({ aSideEffect: () => {} })

        when().doSomething()

        expect(consoleSpy.log).to.have.been.calledWith('sideEffect aSideEffect')
      })
    })
  })
})
