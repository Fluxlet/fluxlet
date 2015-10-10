/*eslint-env jasmine */
/*eslint-disable no-unused-vars */

import fluxlet, { extend } from 'src/fluxlet'

function spyCreator(type) {
  return fn => jasmine.createSpy(type, fn).and.callThrough()
}

const actionSpy = spyCreator('action')
const calculationSpy = spyCreator('calculation')
const sideEffectSpy = spyCreator('side effect')
const validatorSpy = spyCreator('validator')
const whenSpy = spyCreator('when')

function allLogging(val, ...overrides) {
  return extend({
    register: val,
    dispatch: val,
    call: val,
    args: val,
    state: val,
    timing: val
  }, ...overrides)
}

describe('Fluxlet', () => {

  it('can be created without an id', () => {
    const f = fluxlet()
    expect(f.debug.id()).toBeUndefined()
  })

  it('can be created with an id', () => {
    const f = fluxlet("flux-name")
    expect(f.debug.id()).toEqual("flux-name")
  })

  it('can retrieve an existing instance by id', () => {
    const e = fluxlet("existing-fluxlet")
    const f = fluxlet("existing-fluxlet")
    expect(f).toEqual(e)
  })

  it('can be removed by id and will be anonymised', () => {
    const f = fluxlet("removed-fluxlet")
    f.remove()
    const n = fluxlet("removed-fluxlet")

    expect(n).not.toEqual(f)
    expect(f.debug.id()).toBeUndefined()
  })

  describe('urlParams', () => {
    it('extracts fluxlet prefixed params from the URL', () => {
      const opts = {
        params: ["fluxlet.foo=ignored","fluxlet.x.foo=x-foo","fluxlet.foo=all-foo&fluxlet.y.bar=y-only&fluxlet.foobar=all-foobar"]
      }

      const fx = fluxlet("x", opts)
      const fy = fluxlet("y", opts)

      expect(fx.debug.urlParams()).toEqual({
        foo: "x-foo",
        foobar: "all-foobar"
      })
      expect(fy.debug.urlParams()).toEqual({
        foo: "all-foo",
        bar: "y-only",
        foobar: "all-foobar"
      })
    })
  })

  describe('logging configuration via URL', () => {
    it('can set all levels for all fluxlets', () => {
      const opts = {
        params: ["fluxlet.log=all"]
      }

      const fa = fluxlet("a", opts)
      const fb = fluxlet("b", opts)

      expect(fa.debug.logging()).toEqual(allLogging(true))
      expect(fb.debug.logging()).toEqual(allLogging(true))
    })

    it('can set all levels for a specific fluxlet by id', () => {
      const opts = {
        params: ["fluxlet.c.log=all"]
      }

      const fc = fluxlet("c", opts)
      const fd = fluxlet("d", opts)

      expect(fc.debug.logging()).toEqual(allLogging(true))
      expect(fd.debug.logging()).toEqual(allLogging(false))
    })

    it('can set specific levels for all fluxlets', () => {
      const opts = {
        params: ["fluxlet.log=dispatch,call"]
      }

      const fe = fluxlet("e", opts)
      const ff = fluxlet("f", opts)

      expect(fe.debug.logging()).toEqual(allLogging(false, { dispatch: true, call: true }))
      expect(ff.debug.logging()).toEqual(allLogging(false, { dispatch: true, call: true }))
    })

    it('can set specific levels for a fluxlet by id', () => {
      const opts = {
        params: ["fluxlet.g.log=dispatch,call"]
      }

      const fg = fluxlet("g", opts)
      const fh = fluxlet("h", opts)

      expect(fg.debug.logging()).toEqual(allLogging(false, { dispatch: true, call: true }))
      expect(fh.debug.logging()).toEqual(allLogging(false))
    })
  })
})

describe('Fluxlet', () => {

  let given

  const dispatchers = () => given.debug.dispatchers()
  const calculations = () => given.debug.calculations()
  const sideEffects = () => given.debug.sideEffects()
  const when = dispatchers
  const state = () => given.debug.state()
  const validator = () => given.debug.validator()

  beforeEach(() => {
    given = fluxlet()
  })

  describe('state', () => {

    it('returns fluxlet', () => {
      expect(given.state({})).toBe(given)
    })

    it('sets the initial state', () => {
      const s = {}

      given.state(s)

      expect(state()).toBe(s)
    })

    it('sets the initial state from a function', () => {
      const s = {}
      const f = () => s

      given.state(f)

      expect(state()).toBe(s)
    })

    it('passes the existing state to the function', () => {
      const s = {}
      const f = spyCreator("state function")(v => v)

      given.state(s)
      given.state(f)

      expect(f).toHaveBeenCalledWith(s)
    })

    it('can not be set after an action has been dispatched', () => {
      given.state({})
      given.actions({ testAction: () => s => s })

      when().testAction()

      expect(() => {
        given.state({})
      }).toThrowError("Attempt to set state of fluxlet:(anon) after the first action was dispatched")
    })
  })

  describe('validator', () => {

    it('sets the validator function', () => {
      const f = () => {}

      given.validator(f)

      expect(validator()).toBe(f)
    })

    it('can not be set after state', () => {
      given.state({})

      expect(() => {
        given.validator(() => {})
      }).toThrowError("The state validator should be set before the initial state of the fluxlet is set")
    })

    it('is called to validate initial state', () => {
      const s = {}
      const v = validatorSpy(s => {})

      given.validator(v)
      given.state(s)

      expect(v).toHaveBeenCalledWith(s)
    })

    it('is called to validate state returned from an action', () => {
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }
      const v = validatorSpy(s => {})

      given.validator(v)
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s2 })

      when().testValidatorAction()

      expect(v.calls.count()).toBe(2)
      expect(v).toHaveBeenCalledWith(s2)
    })

    it('is not called after an action if state has not changed', () => {
      const s1 = { stage: 1 }
      const v = validatorSpy(s => {})

      given.validator(v)
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

      given.validator(v)
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

      given.validator(v)
      given.state(s1)
      given.actions({ testValidatorAction: () => s => s2 })
      given.calculations({ testValidatorCalc: s => s })

      when().testValidatorAction()

      expect(v.calls.count()).toBe(2)
    })

    it('should throw an error on invalid state', () => {
      given.validator(() => {
        throw "INVALID STATE"
      })

      expect(() => {
        given.state({})
      }).toThrow("INVALID STATE")
    })
  })

  describe('actions', () => {

    it('are wrapped with a dispatcher', () => {
      given.actions({ testA: () => s => s })
      expect(dispatchers().testA).toBeDefined()
    })

    it('are dispatched', () => {
      const testB = actionSpy(() => s => s)
      given.actions({ testB })

      when().testB()

      expect(testB).toHaveBeenCalled()
    })

    it('can not be directly called from within another action', () => {
      given.actions({ testNest1: () => s => when().testNest2() })
      given.actions({ testNest2: () => s => s })

      expect(() => {
        when().testNest1()
      }).toThrowError("Attempt to dispatch action 'testNest2' within action 'testNest1' in fluxlet:(anon)")
    })

    it('can not be registered after the first dispatch', () => {
      given.actions({ anyAction: () => s => s })
      when().anyAction()

      expect(() => {
        given.actions({ testLateAction: () => s => s })
      }).toThrowError("Attempt to add actions testLateAction to fluxlet:(anon) after the first action was dispatched")
    })

    it('can not override existing actions with the same name', () => {
      given.actions({ existingAction: () => s => s })

      expect(() => {
        given.actions({ existingAction: () => s => s })
      }).toThrowError("Attempt to add an existing action 'existingAction' to fluxlet:(anon)")
    })

    describe('conditional', () => {

      it('without a then function will fail to register', () => {
        expect(() => {
          given.actions({ invalidAction: {} })
        }).toThrowError("action 'invalidAction' must be a function, or an object containing a 'then' & optional 'when' function")
      })

      it('are dispatched when true', () => {
        const testC = {
          when: whenSpy(s => true),
          then: actionSpy(() => s => s)
        }

        given.actions({ testC })

        when().testC()

        expect(testC.when).toHaveBeenCalled()
        expect(testC.then).toHaveBeenCalled()
      })

      it('are not dispatched when false', () => {
        const testD = {
          when: whenSpy(s => false),
          then: actionSpy(() => s => s)
        }

        given.actions({ testD })

        when().testD()

        expect(testD.when).toHaveBeenCalled()
        expect(testD.then).not.toHaveBeenCalled()
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

        expect(testE.when).toHaveBeenCalledWith(initialState, 10, 'B')
        expect(testE.then).toHaveBeenCalledWith(10, 'B')
      })

    })

    it('must return a function', () => {
      const testE = actionSpy(() => { foo: "bar" })
      given.actions({ testE })

      expect(() => { when().testE() }).toThrowError()
    })
  })

  describe('calculation', () => {

    beforeEach(() => {
      given.actions({ anyAction: () => s => s })
    })

    it('can be a plain function', () => {
      given.calculations({ testCalcA: s => s })
      expect(calculations().length).toBe(1)
    })

    it('is called within any action dispatch', () => {
      const testCalcB = calculationSpy(s => s)

      given.calculations({ testCalcB })

      when().anyAction()

      expect(testCalcB).toHaveBeenCalled()
    })

    it('can not be registered after the first dispatch', () => {
      when().anyAction()

      expect(() => {
        given.calculations({ testLateCalc: s => s })
      }).toThrowError("Attempt to add calculations testLateCalc to fluxlet:(anon) after the first action was dispatched")
    })

    it('will fail to register if a required calculation has not been registered', () => {
      expect(() => {
        given.calculations({
          testCalcRequires: {
            requiresCalculations: "missingCalc",
            then: s => s
          }
        })
      }).toThrowError("Calculation 'testCalcRequires' requires the calculation 'missingCalc' in fluxlet:(anon)")
    })

    it('will register if a required calculation has been registered', () => {
      given.calculations({ existingCalc: s => s })

      given.calculations({
        testCalcRequires: {
          requiresCalculations: "existingCalc",
          then: s => s
        }
      })

      expect(calculations().length).toBe(2)
    })

    it('can not override existing calculations with the same name', () => {
      given.calculations({ existingCalc: s => s })

      expect(() => {
        given.calculations({ existingCalc: s => s })
      }).toThrowError("Attempt to add an existing calculation 'existingCalc' to fluxlet:(anon)")
    })

    describe('as conditional', () => {

      it('without a then function will fail to register', () => {
        expect(() => {
          given.calculations({ invalidCalc: {} })
        }).toThrowError("calculation 'invalidCalc' must be a function, or an object containing a 'then' & optional 'when' function")
      })

      it('is called when true', () => {
        const testCalcC = {
          when: whenSpy(s => true),
          then: calculationSpy(() => s => s)
        }

        given.calculations({ testCalcC })

        when().anyAction()

        expect(testCalcC.when).toHaveBeenCalled()
        expect(testCalcC.then).toHaveBeenCalled()
      })

      it('is not called when false', () => {
        const testCalcD = {
          when: whenSpy(s => false),
          then: calculationSpy(() => s => s)
        }

        given.calculations({ testCalcD })

        when().anyAction()

        expect(testCalcD.when).toHaveBeenCalled()
        expect(testCalcD.then).not.toHaveBeenCalled()
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
      expect(sideEffects().length).toBe(1)
    })

    it('is called after an action that changes state', () => {
      const testSideEffectB = sideEffectSpy(() => {})

      given.sideEffects({ testSideEffectB })

      when().doSomething()

      expect(testSideEffectB).toHaveBeenCalled()
    })

    it('is not called after an action that does not change state', () => {
      const testSideEffectC = sideEffectSpy(() => {})

      given.sideEffects({ testSideEffectC })

      when().doNothing()

      expect(testSideEffectC).not.toHaveBeenCalled()
    })

    it('will fail to register if a required calculation has not been registered', () => {
      expect(() => {
        given.sideEffects({
          testSideEffectRequires: {
            requiresCalculations: "missingCalc",
            then: () => {}
          }
        })
      }).toThrowError("Side effect 'testSideEffectRequires' requires the calculation 'missingCalc' in fluxlet:(anon)")
    })

    it('will register if a required calculation has been registered', () => {
      given.calculations({ existingCalc: s => s })

      given.sideEffects({
        testSideEffectRequires: {
          requiresCalculations: "existingCalc",
          then: () => {}
        }
      })

      expect(calculations().length).toBe(1)
      expect(sideEffects().length).toBe(1)
    })

    it('will fail to register if a required side effect has not been registered', () => {
      expect(() => {
        given.sideEffects({
          testSideEffectRequires: {
            requiresSideEffects: "missingSideEffect",
            then: () => {}
          }
        })
      }).toThrowError("Side effect 'testSideEffectRequires' requires the sideEffect 'missingSideEffect' in fluxlet:(anon)")
    })

    it('will register if a required side effect has been registered', () => {
      given.sideEffects({ existingSideEffect: () => {} })

      given.sideEffects({
        testSideEffectRequires: {
          requiresSideEffects: "existingSideEffect",
          then: () => {}
        }
      })

      expect(sideEffects().length).toBe(2)
    })

    it('can not override existing side effects with the same name', () => {
      given.sideEffects({ existingSideEffect: () => {} })

      expect(() => {
        given.sideEffects({ existingSideEffect: () => {} })
      }).toThrowError("Attempt to add an existing sideEffect 'existingSideEffect' to fluxlet:(anon)")
    })

    describe('as conditional', () => {

      it('without a then function will fail to register', () => {
        expect(() => {
          given.sideEffects({ invalidSideEffect: {} })
        }).toThrowError("sideEffect 'invalidSideEffect' must be a function, or an object containing a 'then' & optional 'when' function")
      })

      it('is called when true', () => {
        const testSideEffectD = {
          when: whenSpy(s => true),
          then: sideEffectSpy(() => {})
        }

        given.sideEffects({ testSideEffectD })

        when().doSomething()

        expect(testSideEffectD.when).toHaveBeenCalled()
        expect(testSideEffectD.then).toHaveBeenCalled()
      })

      it('is not called when false', () => {
        const testSideEffectE = {
          when: whenSpy(s => false),
          then: sideEffectSpy(() => {})
        }

        given.sideEffects({ testSideEffectE })

        when().doSomething()

        expect(testSideEffectE.when).toHaveBeenCalled()
        expect(testSideEffectE.then).not.toHaveBeenCalled()
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

      expect(f).toHaveBeenCalledWith({
        action1: jasmine.anything(),
        action2: jasmine.anything()
      })
    })
  })

  describe('logging', () => {
    let consoleSpy
    let timingHandle = "time not called"

    beforeEach(() => {
      consoleSpy = {
        log: spyCreator('console.log')(() => {}),
        time: spyCreator('console.time')((h) => { timingHandle = h }),
        timeEnd: spyCreator('console.timeEnd')(() => {})
      }

      given.debug.setConsole(consoleSpy)
    })

    describe('register', () => {
      beforeEach(() => {
        given.logging({ register: true })
      })

      it('logs registration of a validator', () => {
        given.validator(() => {})
        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) register validator:')
      })

      describe('with args', () => {
        it('logs registration of a validator', () => {
          given.logging({ args: true })
          const v = () => {}
          given.validator(v)
          expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) register validator:', [v])
        })
      })

      it('logs registration of an action', () => {
        given.actions({ anAction: () => s => s })
        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) register action:anAction')
      })

      it('logs registration of a calculation', () => {
        given.calculations({ aCalc: s => s })
        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) register calculation:aCalc')
      })

      it('logs registration of a side effect', () => {
        given.sideEffects({ aSideEffect: () => {} })
        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) register sideEffect:aSideEffect')
      })
    })

    describe('dispatch', () => {
      beforeEach(() => {
        given.logging({ dispatch: true })
        given.actions({ anAction: (a, b) => s => s })
      })

      it('logs the action name on dispatch', () => {
        when().anAction("A", "B")

        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) dispatch action:anAction')
        expect(consoleSpy.time).not.toHaveBeenCalled()
        expect(consoleSpy.timeEnd).not.toHaveBeenCalled()
      })

      describe('with args', () => {
        it('logs the action name and args on dispatch', () => {
          given.logging({ args: true })

          when().anAction("A", "B")

          expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) dispatch action:anAction', ['A', 'B'])
        })
      })

      describe('with timing', () => {
        it('logs the timing of the action', () => {
          given.logging({ timing: true })

          when().anAction()

          expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) dispatch action:anAction')
          expect(consoleSpy.time).toHaveBeenCalledWith(timingHandle)
          expect(consoleSpy.timeEnd).toHaveBeenCalledWith(timingHandle)
        })
      })
    })

    describe('call', () => {
      const s0 = { stage: 0 }
      const s1 = { stage: 1 }

      beforeEach(() => {
        given.logging({ call: true })
        given.state(s0)
        given.actions({ doSomething: () => s => s1 })
      })

      it('logs the calculation name when called', () => {
        given.calculations({ aCalc: s => s })

        when().doSomething()

        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) call calculation:aCalc')
        expect(consoleSpy.time).not.toHaveBeenCalled()
        expect(consoleSpy.timeEnd).not.toHaveBeenCalled()
      })

      it('logs the side effect name when called', () => {
        given.sideEffects({ aSideEffect: () => {} })

        when().doSomething()

        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) call sideEffect:aSideEffect')
        expect(consoleSpy.time).not.toHaveBeenCalled()
        expect(consoleSpy.timeEnd).not.toHaveBeenCalled()
      })

      describe('with args', () => {
        beforeEach(() => {
          given.logging({ args: true })
        })

        it('logs the calculation name with transient state when called', () => {
          given.calculations({ aCalc: s => s })

          when().doSomething()

          expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) call calculation:aCalc', [s1])
        })

        it('logs the side effect name with transient state when called', () => {
          given.sideEffects({ aSideEffect: () => {} })

          when().doSomething()

          expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) call sideEffect:aSideEffect', [s1])
        })
      })

      describe('with timing', () => {
        beforeEach(() => {
          given.logging({ timing: true })
        })

        it('logs the timing of the calculation', () => {
          given.calculations({ aCalc: s => s })

          when().doSomething()

          expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) call calculation:aCalc')
          expect(consoleSpy.time).toHaveBeenCalledWith(timingHandle)
          expect(consoleSpy.timeEnd).toHaveBeenCalledWith(timingHandle)
        })

        it('logs the timing of the side effect', () => {
          given.sideEffects({ aSideEffect: () => {} })

          when().doSomething()

          expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) call sideEffect:aSideEffect')
          expect(consoleSpy.time).toHaveBeenCalledWith(timingHandle)
          expect(consoleSpy.timeEnd).toHaveBeenCalledWith(timingHandle)
        })
      })
    })

    describe('state', () => {
      const s0 = { stage: 0 }
      const s1 = { stage: 1 }
      const s2 = { stage: 2 }

      beforeEach(() => {
        given.logging({ state: true })
        given.state(s0)
        given.actions({ doSomething: () => s => s1 })
        given.actions({ doNothing: () => s => s })
      })

      it('logs the starting state before dispatch', () => {
        given.calculations({ calcSomething: s => s2 })

        when().doSomething()

        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) state before:doSomething', [s0])
      })

      it('logs the new state before side effects when the state has changed', () => {
        given.calculations({ calcSomething: s => s2 })

        when().doSomething()

        expect(consoleSpy.log.calls.count()).toBe(2)
        expect(consoleSpy.log).toHaveBeenCalledWith('fluxlet:(anon) state after:doSomething', [s2])
      })

      it('does not log the after state if it has not changed', () => {
        when().doNothing()

        expect(consoleSpy.log.calls.count()).toBe(1)
      })
    })
  })

  describe('debug', () => {

    describe('live', () => {
      it('becomes true after the first dispatch', () => {
        given.actions({ anyAction: () => s => s })

        expect(given.debug.live()).toBe(false)

        when().anyAction()

        expect(given.debug.live()).toBe(true)
      })
    })

    describe('dispatching', () => {
      it('returns the name of the currently dispatching action', () => {
        given.actions({
          anAction: () => s => {
            expect(given.debug.dispatching()).toBe("anAction")
            return s
          }
        })

        when().anAction()
      })
    })
  })
})
