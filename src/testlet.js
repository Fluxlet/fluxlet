// # Testlet

// A **given**/**when**/**then** style testing framework for fluxlets.
//
// Example of usage inside a Jasmine test case:
//
//     given
//         .fluxlet()
//         .validator(validateState)
//         .state(initialState)
//         .actions({ setWords })
//         .calculations({ countWords });
//
//     when().setWords("Hello World");
//
//     then(state => {
//         expect(state.words).toBe("Hello World");
//         expect(state.count).toBe(2);
//     });
//
// Although in reality, you'd probably do most of the *given* calls in a *beforeEach*.
//

import fluxlet from "./fluxlet";
import { deepFreeze } from "./utils";

import { extend } from "jquery";
const deepExtend = extend.bind(undefined, true);

// Holds the fluxlet created by *given.fluxlet()*
var instance;

// Holds the state gathered from a special side effect registered by *given.fluxlet()*
var gathered;

// ## Given

// This simply acts a namespace for *given* clauses, to make the tests read nicely.
export var given = {

    // Create a fluxlet for testing against
    fluxlet() {
        instance = fluxlet()
            // Register a side effect that gathers the state and end states that are passed
            // to the side effects after the action and calculation fns have been called in a dispatch.
            .sideEffects({
                gatherState: (state, prev) => {
                    gathered = { state, prev };
                }
            });

        return this;
    },

    // Set the state validator function, this should be called before setting the initial state
    validator(validator) {
        instance.validator(validator);
        return this;
    },

    // Set the initial state.
    // Generally called in a beforeEach with the default state, but may also be called in
    // individual test cases to override parts of the default state.
    state(overridingState) {
        instance.state(state => deepFreeze(deepExtend({}, state, overridingState)));
        const state = instance.debug.state();
        gathered = { state, prev: state };
        return this;
    },

    // Register actions for testing
    actions(namedActions) {
        instance.actions(namedActions);
        return this;
    },

    // Register calculations for testing
    calculations(namedCalculations) {
        instance.calculations(namedCalculations);
        return this;
    },

    // Register side effects for testing
    sideEffects(namedSideEffects) {
        instance.sideEffects(namedSideEffects);
        return this;
    },

    // Adjust logging levels
    logging(categories) {
        instance.logging(categories);
        return this;
    }
};

// ## When

// Returns all dispatchers from the fluxlet for calling within the test, eg:
//
//     when().someAction("foo");
//
export function when() {
    return instance.debug.dispatchers();
}

// ## Then

// Call a fn passing the new and previous state, in which assertions can be performed about the expected state, eg:
//
//     then(state => {
//         expect(state.foo).toBe("bar");
//     });
//
export function then(fn) {
    fn(gathered.state, gathered.prev);
}

// Register a conditional side effect in which to perform assertions, useful for async tests using the
// done function passed in by jasmine, eg:
//
//     const fooHasChanged = (state, prev) => state.foo !== prev.foo;
//
//     describe("something", (done) => {
//         ...
//         thenAfter(fooHasChanged, state => {
//             expect(state.foo).toBe("bar");
//             done();
//         });
//     });
//
export function thenAfter(when, then) {
    instance.sideEffects({
        testExpectedStateChange: { when, then }
    });
}

export function noop(){
    return function(state) {
        return state;
    };
}
