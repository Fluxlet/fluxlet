import fluxlet from '../src/fluxlet';

function spyCreator(type) {
    return fn => jasmine.createSpy(type, fn).and.callThrough();
}

const actionSpy = spyCreator('action');
const calculationSpy = spyCreator('calculation');
const sideEffectSpy = spyCreator('side effect');
const validatorSpy = spyCreator('validator');
const whenSpy = spyCreator('when');

describe('Fluxlet', () => {

    it('can be created without an id', () => {
        const f = fluxlet();
        expect(f.debug.id()).toBeUndefined();
    });

    it('can be created with an id', () => {
        const f = fluxlet("flux-name");
        expect(f.debug.id()).toEqual("flux-name");
    });

    it('can retrieve an existing instance by id', () => {
        const e = fluxlet("existing-fluxlet");
        const f = fluxlet("existing-fluxlet");
        expect(f).toEqual(e);
    });

    it('can be removed by id and will be anonymised', () => {
        const f = fluxlet("removed-fluxlet");
        f.remove();
        const n = fluxlet("removed-fluxlet");

        expect(n).not.toEqual(f);
        expect(f.debug.id()).toBeUndefined();
    });
});

describe('Fluxlet', () => {

    let given;

    const dispatchers = () => given.debug.dispatchers();
    const calculations = () => given.debug.calculations();
    const sideEffects = () => given.debug.sideEffects();
    const when = dispatchers;
    const state = () => given.debug.state();
    const validator = () => given.debug.validator();

    beforeEach(() => {
        given = fluxlet();
    });

    describe('state', () => {

        it('returns fluxlet', () => {
            expect(given.state({})).toBe(given);
        });

        it('sets the initial state', () => {
            const s = {};

            given.state(s);

            expect(state()).toBe(s);
        });

        it('sets the initial state from a function', () => {
            const s = {};
            const f = () => s;

            given.state(f);

            expect(state()).toBe(s);
        });

        it('passes the existing state to the function', () => {
            const s = {};
            const f = spyCreator("state function")(v => v);

            given.state(s);
            given.state(f);

            expect(f).toHaveBeenCalledWith(s);
        });

        it('can not be set after an action has been dispatched', () => {
            given.state({});
            given.actions({ testAction: () => s => s });

            when().testAction();

            expect(() => {
                given.state({});
            }).toThrow("Attempt to set state of fluxlet:(anon) after the first action was dispatched");
        });
    });

    describe('validator', () => {

        it('sets the validator function', () => {
            const f = () => {};

            given.validator(f);

            expect(validator()).toBe(f);
        });

        it('can not be set after state', () => {
            given.state({});

            expect(() => {
                given.validator(() => {});
            }).toThrow("The state validator should be set before the initial state of the fluxlet is set");
        });

        it('is called to validate initial state', () => {
            const s = {};
            const v = validatorSpy(s => {});

            given.validator(v);
            given.state(s);

            expect(v).toHaveBeenCalledWith(s);
        });

        it('is called to validate state returned from an action', () => {
            const s1 = { stage: 1 };
            const s2 = { stage: 2 };
            const v = validatorSpy(s => {});

            given.validator(v);
            given.state(s1);
            given.actions({ testValidatorAction: () => s => s2 });

            when().testValidatorAction();

            expect(v.calls.count()).toBe(2);
            expect(v).toHaveBeenCalledWith(s2);
        });

        it('is not called after an action if state has not changed', () => {
            const s1 = { stage: 1 };
            const v = validatorSpy(s => {});

            given.validator(v);
            given.state(s1);
            given.actions({ testValidatorAction: () => s => s });

            when().testValidatorAction();

            expect(v.calls.count()).toBe(1);
        });

        it('is called to validate state returned from a calculation', () => {
            const s1 = { stage: 1 };
            const s2 = { stage: 2 };
            const s3 = { stage: 3 };
            const v = validatorSpy(s => {});

            given.validator(v);
            given.state(s1);
            given.actions({ testValidatorAction: () => s => s2 });
            given.calculations({ testValidatorCalc: s => s3 });

            when().testValidatorAction();

            expect(v.calls.count()).toBe(3);
            expect(v).toHaveBeenCalledWith(s3);
        });

        it('is not called after a calculation if the calculation has not changed the state', () => {
            const s1 = { stage: 1 };
            const s2 = { stage: 2 };
            const v = validatorSpy(s => {});

            given.validator(v);
            given.state(s1);
            given.actions({ testValidatorAction: () => s => s2 });
            given.calculations({ testValidatorCalc: s => s });

            when().testValidatorAction();

            expect(v.calls.count()).toBe(2);
        });

        it('should throw an error on invalid state', () => {
            given.validator(() => {
                throw "INVALID STATE";
            });

            expect(() => {
                given.state({});
            }).toThrow("INVALID STATE");
        });
    });

    describe('actions', () => {

        it('are wrapped with a dispatcher', () => {
            given.actions({ testA: () => s => s });
            expect(dispatchers().testA).toBeDefined();
        });

        it('are dispatched', () => {
            const testB = actionSpy(() => s => s);
            given.actions({ testB });

            when().testB();

            expect(testB).toHaveBeenCalled();
        });

        it('can not be directly called from within another action', () => {
            given.actions({ testNest1: () => s => when().testNest2() });
            given.actions({ testNest2: () => s => s });

            expect(() => {
                when().testNest1();
            }).toThrow("Attempt to dispatch action 'testNest2' within action 'testNest1' in fluxlet:(anon)");
        });

        it('can not be registered after the first dispatch', () => {
            given.actions({ anyAction: () => s => s });
            when().anyAction();

            expect(() => {
                given.actions({ testLateAction: () => s => s });
            }).toThrow("Attempt to add actions testLateAction to fluxlet:(anon) after the first action was dispatched");
        });

        describe('conditional', () => {

            it('without a then function will fail to register', () => {
                expect(() => {
                    given.actions({ invalidAction: {} });
                }).toThrowError("action 'invalidAction' must be a function, or an object containing a 'then' & optional 'when' function")
            });

            it('are dispatched when true', () => {
                const testC = {
                    when: whenSpy(s => true),
                    then: actionSpy(() => s => s)
                };

                given.actions({ testC });

                when().testC();

                expect(testC.when).toHaveBeenCalled();
                expect(testC.then).toHaveBeenCalled();
            });

            it('are not dispatched when false', () => {
                const testD = {
                    when: whenSpy(s => false),
                    then: actionSpy(() => s => s)
                };

                given.actions({ testD });

                when().testD();

                expect(testD.when).toHaveBeenCalled();
                expect(testD.then).not.toHaveBeenCalled();
            });
        });

        it('must return a function', () => {
            const testE = actionSpy(() => { foo: "bar" });
            given.actions({ testE });

            expect(() => { when().testE() }).toThrowError();
        });
    });

    describe('calculation', () => {

        beforeEach(() => {
            given.actions({ anyAction: () => s => s });
        });

        it('can be a plain function', () => {
            given.calculations({ testCalcA: s => s });
            expect(calculations().length).toBe(1);
        });

        it('is called within any action dispatch', () => {
            const testCalcB = calculationSpy(s => s);

            given.calculations({ testCalcB });

            when().anyAction();

            expect(testCalcB).toHaveBeenCalled();
        });

        it('can not be registered after the first dispatch', () => {
            when().anyAction();

            expect(() => {
                given.calculations({ testLateCalc: s => s });
            }).toThrow("Attempt to add calculations testLateCalc to fluxlet:(anon) after the first action was dispatched");
        });

        it('will fail to register if a required calculation has not been registered', () => {
            expect(() => {
                given.calculations({
                    testCalcRequires: {
                        requiresCalculation: "missingCalc",
                        then: s => s
                    }
                });
            }).toThrow("Calculation 'testCalcRequires' requires the calculation 'missingCalc' in fluxlet:(anon)");
        });

        it('will register if a required calculation has been registered', () => {
            given.calculations({ existingCalc: s => s });

            given.calculations({
                testCalcRequires: {
                    requiresCalculation: "existingCalc",
                    then: s => s
                }
            });

            expect(calculations().length).toBe(2);
        });

        describe('as conditional', () => {

            it('without a then function will fail to register', () => {
                expect(() => {
                    given.calculations({ invalidCalc: {} });
                }).toThrowError("calculation 'invalidCalc' must be a function, or an object containing a 'then' & optional 'when' function")
            });

            it('is called when true', () => {
                const testCalcC = {
                    when: whenSpy(s => true),
                    then: calculationSpy(() => s => s)
                };

                given.calculations({ testCalcC });

                when().anyAction();

                expect(testCalcC.when).toHaveBeenCalled();
                expect(testCalcC.then).toHaveBeenCalled();
            });

            it('is not called when false', () => {
                const testCalcD = {
                    when: whenSpy(s => false),
                    then: calculationSpy(() => s => s)
                };

                given.calculations({ testCalcD });

                when().anyAction();

                expect(testCalcD.when).toHaveBeenCalled();
                expect(testCalcD.then).not.toHaveBeenCalled();
            });
        });
    });

    describe('side-effect', () => {

        beforeEach(() => {
            given.state({ value: 0 })
            given.actions({ doNothing: () => s => s });
            given.actions({ doSomething: () => ({ value }) => ({ value: value+1 }) });
        });

        it('can be a plain function', () => {
            given.sideEffects({ testSideEffectA: () => {} });
            expect(sideEffects().length).toBe(1);
        });

        it('is called after an action that changes state', () => {
            const testSideEffectB = sideEffectSpy(() => {});

            given.sideEffects({ testSideEffectB });

            when().doSomething();

            expect(testSideEffectB).toHaveBeenCalled();
        });

        it('is not called after an action that does not change state', () => {
            const testSideEffectC = sideEffectSpy(() => {});

            given.sideEffects({ testSideEffectC });

            when().doNothing();

            expect(testSideEffectC).not.toHaveBeenCalled();
        });

        it('will fail to register if a required calculation has not been registered', () => {
            expect(() => {
                given.sideEffects({
                    testSideEffectRequires: {
                        requiresCalculation: "missingCalc",
                        then: () => {}
                    }
                });
            }).toThrow("Side effect 'testSideEffectRequires' requires the calculation 'missingCalc' in fluxlet:(anon)");
        });

        it('will register if a required calculation has been registered', () => {
            given.calculations({ existingCalc: s => s });

            given.sideEffects({
                testSideEffectRequires: {
                    requiresCalculation: "existingCalc",
                    then: () => {}
                }
            });

            expect(calculations().length).toBe(1);
            expect(sideEffects().length).toBe(1);
        });

        it('will fail to register if a required side effect has not been registered', () => {
            expect(() => {
                given.sideEffects({
                    testSideEffectRequires: {
                        requiresSideEffects: "missingSideEffect",
                        then: () => {}
                    }
                });
            }).toThrow("Side effect 'testSideEffectRequires' requires the sideEffect 'missingSideEffect' in fluxlet:(anon)");
        });

        it('will register if a required side effect has been registered', () => {
            given.sideEffects({ existingSideEffect: () => {} });

            given.sideEffects({
                testSideEffectRequires: {
                    requiresSideEffects: "existingSideEffect",
                    then: () => {}
                }
            });

            expect(sideEffects().length).toBe(2);
        });

        describe('as conditional', () => {

            it('without a then function will fail to register', () => {
                expect(() => {
                    given.sideEffects({ invalidSideEffect: {} });
                }).toThrowError("sideEffect 'invalidSideEffect' must be a function, or an object containing a 'then' & optional 'when' function")
            });

            it('is called when true', () => {
                const testSideEffectD = {
                    when: whenSpy(s => true),
                    then: sideEffectSpy(() => {})
                };

                given.sideEffects({ testSideEffectD });

                when().doSomething();

                expect(testSideEffectD.when).toHaveBeenCalled();
                expect(testSideEffectD.then).toHaveBeenCalled();
            });

            it('is not called when false', () => {
                const testSideEffectE = {
                    when: whenSpy(s => false),
                    then: sideEffectSpy(() => {})
                };

                given.sideEffects({ testSideEffectE });

                when().doSomething();

                expect(testSideEffectE.when).toHaveBeenCalled();
                expect(testSideEffectE.then).not.toHaveBeenCalled();
            });
        });
    });

    describe('init', () => {

        it('calls the given function passing all dispatchers', () => {
            given.actions({
                action1: () => s => s,
                action2: () => s => s
            });

            const f = spyCreator('init function')((dispatchers) => {});

            given.init(f);

            expect(f).toHaveBeenCalledWith({
                action1: jasmine.anything(),
                action2: jasmine.anything()
            });
        });
    });
});
