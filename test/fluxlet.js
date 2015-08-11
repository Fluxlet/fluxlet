import fluxlet from '../src/fluxlet';

function spyCreator(type) {
    return fn => jasmine.createSpy(type, fn).and.callThrough();
}

const actionSpy = spyCreator('action');
const calculationSpy = spyCreator('calculation');
const whenSpy = spyCreator('when');

describe('Fluxlet', () => {

    it('can created without an id', () => {
        const f = fluxlet();
        expect(f.debug.id()).toBeUndefined();
    });

    it('can be created with an id', () => {
        const f = fluxlet("flux-name");
        expect(f.debug.id()).toEqual("flux-name");
    });

});

describe('Fluxlet', () => {

    let given;

    const dispatchers = () => given.debug.dispatchers();
    const calculations = () => given.debug.calculations();
    const when = dispatchers;
    const state = () => given.debug.state();

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

        describe('conditional', () => {

            it('are dispatched when true', () => {
                const testC = {
                    when: s => true,
                    then: actionSpy(() => s => s)
                };

                given.actions({ testC });

                when().testC();

                expect(testC.then).toHaveBeenCalled();
            });

            it('are not dispatched when false', () => {
                const testD = {
                    when: as => false,
                    then: actionSpy(() => s => s)
                };

                given.actions({ testD });

                when().testD();

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

        describe('as conditional', () => {

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
});
