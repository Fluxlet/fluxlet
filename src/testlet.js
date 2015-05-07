import fluxlet from "./fluxlet";
import { deepFreeze } from "./utils";

import { extend } from "jquery";
const deepExtend = extend.bind(undefined, true);

var instance;
var gathered;

export var given = {

    // Create a fluxlet for testing against (id is optional)
    fluxlet(id) {
        instance = fluxlet(id)
            // Register a side effect that gathers the state and end states that are passed
            // to the side effects after the action and calculation fns have been called in a dispatch.
            .sideEffects({
                gatherState: (state, prev) => {
                    gathered = { state, prev };
                }
            });

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

// Returns all dispatchers from the fluxlet for calling within the test, eg:
//     when().someAction("foo")
export function when() {
    return instance.debug.dispatchers();
}

// Call a fn passing the new and previous state, in which assertions can be performed about the expected state, eg:
//     then(state => {
//         expect(state.foo).toBe("bar");
//     });
export function then(fn) {
    fn(gathered.state, gathered.prev);
}

// Register a conditional side effect in which to perform assertions, useful for async tests using the
// done function passed in by jasmine, eg:
//     describe("something", (done) => {
//         ...
//         thenAfter((state, prev) => state.foo !== prev.foo,
//             state => {
//                 expect(state.foo).toBe("bar");
//                 done();
//             }
//         );
//     });
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
