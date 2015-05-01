// # Fluxlet

// Fluxlet uses a fluent API to construct an instance, a fluxlet can be named or annonymous.

// Internal map of named fluxlets
const fluxlets = {};

// Create or retrieve a fluxlet
export default function(id) {

    // Return an existing fluxlet by id if it exists
    if (id && fluxlets[id]) {
        return fluxlets[id];
    }

    const instance = createFluxlet(id);

    // Anonymous fluxlets are not stored
    if (id) {
        fluxlets[id] = instance;
    }

    return instance;
}

function createFluxlet(id) {

    // The locker stores the state of the fluxlet between dispatches
    const locker = createLocker();

    // The map of action dispatchers
    const dispatchers = {};

    // The list of state calculation functions
    const calculations = [];

    // The list of side effect functions
    const sideEffects = [];

    // Log category settings
    const logging = {
        register: true,
        dispatch: true,
        call: true
    };

    function log(category, type, name, args) {
        if (logging[category]) {
            if (args && args.length) {
                console.log("fluxlet:", id || "", category, type, ":", name, "(", ...args, ")");
            } else {
                console.log("fluxlet:", id || "", category, type, ":", name);
            }
        }
    }

    // Create a dispatcher function for an action
    function createDispatcher(action, type, name) {
        return (...args) => {
            log("dispatch", type, name, args);

            // Get starting state
            const startState = locker.claim(name);

            try {
                // Call the actions with the args given to the dispatcher, and then pass the state
                // from the locker to the returned function
                let endState = action(...args)(startState);

                // Chain calculation calls
                calculations.forEach(calculation => {
                    // passing the state return from one into the next,
                    // the starting state prior to the action is also given.
                    endState = calculation(endState, startState);
                });

                // Store state and determine if a change has occurred
                if (locker.swap(endState)) {

                    // Call side-effects only if state has changed
                    sideEffects.forEach(sideEffect => {
                        // passing the new state, original state, and all action dispatchers
                        sideEffect(endState, startState, dispatchers);
                    });
                }
            } finally {
                // Release the state locker ready for another dispatch
                locker.release();
            }
        };
    }

    // Wrapper for calculation and sideEffect functions, that simply logs the call
    function logCall(fn, type, name) {
        return (...args) => {
            log("call", type, name, [args[0]]);
            return fn(...args);
        };
    }

    // Create the wrapper for action, calculation and side-effect functions or conditionals
    function createCall(type, name, fnOrCond, wrap) {
        log("register", type, name);

        if (fnOrCond && fnOrCond.when && fnOrCond.when.apply && fnOrCond.then && fnOrCond.then.apply) {
            return conditionalCall(fnOrCond.when, wrap(fnOrCond.then, type, name));
        } else if (fnOrCond && fnOrCond.apply) {
            return wrap(fnOrCond, type, name);
        } else {
            throw new TypeError(type + " '" + name + "' must be a function or an object containing a when & then function");
        }
    }

    // Create the wrapper for conditional functions
    function conditionalCall(when, then) {
        return (...args) => {
            // A conditional is only run if its 'when' function returns true
            if (when(...args)) {
                return then(...args);
            } else {
                return args[0];
            }
        };
    }

    function createCalls(type, obj, wrap) {
        return Object.keys(obj).map(name => createCall(type, name, obj[name], wrap));
    }

    return {
        // Set the initial state of the fluxlet
        state(state) {
            log("create", "state", state);
            locker.claim();
            locker.swap(state);
            locker.release();
            return this;
        },

        // Add named actions to the fluxlet. An action takes some operational params,
        // and returns a fn that takes the whole fluxlet state and returns a new state.
        //
        //     f.actions({ setName, setDateOfBirth })
        //
        actions(namedActions) {
            Object.keys(namedActions).forEach(name => {
                dispatchers[name] = createCall("action", name, namedActions[name], createDispatcher);
            });
            return this;
        },

        // Add named calculations to the fluxlet. Calculations are chained, the first is given the state
        // from the action, and then return value is passed into the next calculation, and so on.
        // They are also passed the original state prior to the action (as the 2nd arg).
        //
        //     f.calculations({ makeNameUppercase, calculateAge })
        //
        calculations(namedCalculations) {
            calculations.push(...createCalls("calculation", namedCalculations, logCall));
            return this;
        },

        // Add named side-effects to the fluxlet. All side-effects receive the same final state that
        // resulted from the action and calculation chain, along with the original state and the map
        // of action dispatchers. A side-effect must not change state, or directly dispatch an action
        // from this same fluxlet (it may bind them to async events or timeouts though).
        //
        //     f.sideEffects({ renderEverything, makeHttpRequest })
        //
        sideEffects(namedSideEffects) {
            sideEffects.push(...createCalls("sideEffect", namedSideEffects, logCall));
            return this;
        },

        // Call a initialisation function with the map of action dispatchers.
        //
        //     f.init(({ setName }) => bindChangeEventToAction(setName))
        //
        init(fn) {
            fn(dispatchers);
            return this;
        },

        // Set logging levels
        //
        //     f.logging({ call: false })
        //
        logging(categories) {
            Object.keys(categories).forEach(name => { logging[name] = categories[name] });
            return this;
        },

        // Remove a named fluxlet from the internal map of fluxlets and anonymise it
        remove() {
            if (id) {
                delete fluxlets[id];
                id = undefined;
            }
        },

        // These tools are for testing and debugging on the console only, and should NEVER be called from code
        debug: {
            id: () => id,
            locker: () => locker,
            state: () => {
                var state = locker.claim('DEBUG');
                locker.release();
                return state;
            },
            dispatchers: () => dispatchers,
            calculations: () => calculations,
            sideEffects: () => sideEffects
        }
    };
}

// The locker holds the state of the fluxlet between dispatches.
// This enforces the idea that within a dispatch state is strictly only updated prior to the side-effects.
function createLocker(initialState) {
    let state = initialState;
    let claimed = false;

    return {
        // When an action dispatcher claims the state, it gets locked so that no other action can
        // claim it - preventing multiple actions from occurring in a single dispatch.
        claim(byAction) {
            if (claimed) {
                // An error is throw if another action attempt to claim with the same dispatch
                throw ("Attempt to dispatch action '" + byAction + "' within action '" + claimed + "'");
            }
            claimed = byAction || true;
            return state;
        },

        // The state is saved before any side-effects run.
        swap(newState) {
            if (!claimed) {
                throw "Attempted to swap an unclaimed state";
            }
            // Return true if a new state is given
            if (newState !== state) {
                state = newState;
                return true;
            }
            return false;
        },

        // The dispatch releases the lock only after all side-effects have been called
        release() {
            if (!claimed) {
                throw "Attempted to release an unclaimed state";
            }
            claimed = false;
        }
    };
}
