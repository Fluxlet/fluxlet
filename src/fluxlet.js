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

    // The state of the fluxlet between dispatches
    let lockedState = undefined;

    // The current action in dispatch
    let dispatching = undefined;

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

    // Handy string for use in log and error messages
    const logId = `fluxlet:${id||'(anon)'}`;

    // Set to true on the first action dispatch, after which the fluxlet may not be modified
    var live = false;

    function log(category, type, name, args) {
        if (logging[category]) {
            if (args && args.length) {
                console.log(`${logId} ${category} ${type}:${name}`, ...args);
            } else {
                console.log(`${logId} ${category} ${type}:${name}`);
            }
        }
    }

    // Create a dispatcher function for an action
    function createDispatcher(action, type, name) {
        return (...args) => {
            // The fluxlet become 'live' on the first action dispatch
            live = true;

            log("dispatch", type, name, args);

            if (dispatching) {
                // An error is thrown if another action attempt to claim with the same dispatch
                throw (`Attempt to dispatch action '${name}' within action '${dispatching}' in ${logId}`);
            }

            // Lock the dispatcher for the current action, causing any nested dispatched to fail
            dispatching = name;

            // Get starting state
            const startState = lockedState;

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
                if (endState !== startState) {
                    lockedState = endState;

                    // Call side-effects only if state has changed
                    sideEffects.forEach(sideEffect => {
                        // passing the new state, original state, and all action dispatchers
                        sideEffect(endState, startState, dispatchers);
                    });
                }
            } finally {
                // Release lock ready for another dispatch
                dispatching = undefined;
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
        // Set (or modify) the initial state of the fluxlet
        state(state) {
            if (live) {
                throw (`Attempt to set state of ${logId} after the first action was dispatched`);
            }
            log("create", "state", state);
            if (typeof state === "function") {
                lockedState = state(lockedState);
            } else {
                lockedState = state;
            }
            return this;
        },

        // Add named actions to the fluxlet. An action takes some operational params,
        // and returns a fn that takes the whole fluxlet state and returns a new state.
        //
        //     f.actions({ setName, setDateOfBirth })
        //
        actions(namedActions) {
            if (live) {
                throw (`Attempt to add actions to ${logId} after the first action was dispatched`);
            }
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
            if (live) {
                throw (`Attempt to add calculations to ${logId} after the first action was dispatched`);
            }
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
            if (live) {
                throw (`Attempt to add side-effects to ${logId} after the first action was dispatched`);
            }
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
            live: () => live,
            state: () => lockedState,
            dispatching: () => dispatching,
            dispatchers: () => dispatchers,
            calculations: () => calculations,
            sideEffects: () => sideEffects
        }
    };
}
