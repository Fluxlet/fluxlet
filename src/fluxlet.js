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

    // A function that validates states as they are passed around
    let stateValidator = undefined;

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
        call: true,
        state: false
    };

    // Handy string for use in log and error messages
    const logId = `fluxlet:${id||'(anon)'}`;

    // Set to true on the first action dispatch,
    // after which certain aspects of the fluxlet may not be modified
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
        // This is the dispatcher function, created for the given action.
        // It args are passed through to the action function later.
        return (...args) => {
            // The fluxlet become 'live' on the first action dispatch
            live = true;

            log("dispatch", type, name, args);

            if (dispatching) {
                // This dispatch will fail if called directly from within another dispatch
                throw (`Attempt to dispatch action '${name}' within action '${dispatching}' in ${logId}`);
            }

            // Lock the dispatcher for the current action
            dispatching = name;

            // Get the starting state
            const startState = lockedState;

            log("state", "before", name, [startState]);

            try {
                // Call the action with the args given to the dispatcher
                const stateManipulator = action(...args);

                // We expect the action to return a function that will manipulate the the state
                if (typeof stateManipulator !== "function") {
                    throw new TypeError(`Action '${name}' did not return a function as expected in ${logId}`);
                }

                // Pass the state the to the function returned from the action
                let newState = stateManipulator(startState);

                // Validate the state returned by the action
                stateValidator && newState !== startState && stateValidator(newState);

                // Chain calculation calls
                calculations.forEach(calculation => {
                    // passing the state return from one into the next,
                    // the starting state prior to the action is also given.
                    newState = calculation(newState, startState);

                    // Validate the state returned by the calculation
                    stateValidator && newState !== startState && stateValidator(newState);
                });

                // Store state and determine if a change has occurred
                if (newState !== startState) {
                    lockedState = newState;

                    log("state", "after", name, [newState]);

                    // Call side-effects only if state has changed
                    sideEffects.forEach(sideEffect => {
                        // passing the new state, original state, and all action dispatchers
                        sideEffect(newState, startState, dispatchers);
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

    function liveError(type, names) {
        return `Attempt to add ${type} ${names} to ${logId} after the first action was dispatched`;
    }

    return {
        // Set the state validator function, generally only used in testing, it is expected to throw an error if it
        // finds the state to be invalid. It will be called, passing the state as the only arguments, on setting of
        // the initial state, and after each action and calculation if a new state has been returned.
        validator(validator) {
            if (lockedState) {
                throw ("The state validator should be set before the initial state of the fluxlet is set");
            }
            stateValidator = validator;
            return this;
        },

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
            stateValidator && stateValidator(lockedState);
            return this;
        },

        // Add named actions to the fluxlet. An action takes some operational params,
        // and returns a fn that takes the whole fluxlet state and returns a new state.
        //
        //     f.actions({ setName, setDateOfBirth })
        //
        actions(namedActions) {
            if (live) {
                throw liveError('actions', Object.keys(namedActions));
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
                throw liveError('calculations', Object.keys(namedCalculations));
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
            validator: () => stateValidator,
            state: () => lockedState,
            dispatching: () => dispatching,
            dispatchers: () => dispatchers,
            calculations: () => calculations,
            sideEffects: () => sideEffects
        }
    };
}
