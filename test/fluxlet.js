import fluxlet from '../src/fluxlet';

function actionSpy(fn) {
    return jasmine.createSpy('action', fn).and.callThrough();
}

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

    let f;

    beforeEach(() => {
        f = fluxlet();
    });

    describe('state', () => {

        it('returns fluxlet', () => {
            expect(f.state({})).toBe(f);
        });

        it('sets the initial state', () => {
            const s = {};
            f.state(s);
            expect(f.debug.state()).toBe(s);
        });
    });

    describe('actions', () => {


        it('are wrapped with a dispatcher', () => {
            f.actions({ testA: () => s => s });
            expect(f.debug.dispatchers().testA).toBeDefined();
        });

        it('are dispatched', () => {
            const testB = actionSpy(() => s => s);
            f.actions({ testB });

            f.debug.dispatchers().testB();

            expect(testB).toHaveBeenCalled();
        });

        describe('conditional', () => {

            it('are dispatched when true', () => {
                const testC = {
                    when: s => true,
                    then: actionSpy(() => s => s)
                };

                f.actions({ testC });

                f.debug.dispatchers().testC();

                expect(testC.then).toHaveBeenCalled();
            });

            it('are not dispatched when false', () => {
                const testD = {
                    when: s => false,
                    then: actionSpy(() => s => s)
                };

                f.actions({ testD });

                f.debug.dispatchers().testD();

                expect(testD.then).not.toHaveBeenCalled();
            });
        });
    });
});
