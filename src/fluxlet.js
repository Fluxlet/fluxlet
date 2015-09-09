// # Fluxlet

// Fluxlet uses a fluent API to construct an instance, a fluxlet can be named or annonymous.

// Internal map of named fluxlets
const fluxlets = {};

// Create or retrieve a fluxlet
// opts can be used to pass in some configuration options, which at present is
// only used for testing of the fluxlet url params
export default function(id, opts = {}) {

    // Return an existing fluxlet by id if it exists
    if (id && fluxlets[id]) {
        return fluxlets[id];
    }

    const instance = createFluxlet(id, opts);

    // Anonymous fluxlets are not stored
    if (id) {
        fluxlets[id] = instance;
    }

    return instance;
}

// Default logging settings
export const defaultLogging = {
    register: false,
    dispatch: false,
    call: false,
    args: false,
    state: false,
    timing: false
};

function createFluxlet(id, {params = [location.search, location.hash]}) {

    // Read the fluxlet prefixed url params
    const urlParams = readUrlParams(id, params);

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

    // All registered calculation and sideEffect names, for requirements checking (value is always true)
    const registered = {
        calculation: {},
        sideEffect: {}
    };

    // Log category settings
    const logging = extend({}, defaultLogging, getLoggingFromUrlParams(urlParams, 'log'));

    // Handy string for use in log and error messages
    const logId = `fluxlet:${id||'(anon)'}`;

    // Set to true on the first action dispatch,
    // after which certain aspects of the fluxlet may not be modified
    let live = false;

    // Local reference to console, which can be overriden for testing
    let cons = console;

    function log(category, type, name, args) {
        if (logging[category]) {
            if ((logging.args || category === "state") && args && args.length) {
                cons.log(`${logId} ${category} ${type}:${name}`, args);
            } else {
                cons.log(`${logId} ${category} ${type}:${name}`);
            }
        }
    }

    // Log and start a named timer
    function start(category, type, name, args) {
        log(category, type, name, args);

        if (logging[category] && logging.timing && cons.time) {
            cons.time(`${logId}:${category}:${type}:${name}`);
        }
    }

    // Stop a named timer and report the elapsed time
    function end(category, type, name) {
        if (logging[category] && logging.timing && cons.timeEnd) {
            cons.timeEnd(`${logId}:${category}:${type}:${name}`);
        }
    }

    // Create a dispatcher function for an action
    function createDispatcher(action, type, name) {
        // This is the dispatcher function, created for the given action.
        // It args are passed through to the action function later.
        return (...args) => {
            // The fluxlet become 'live' on the first action dispatch
            live = true;

            start("dispatch", type, name, args);

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
                let transientState = stateManipulator(startState);

                // Validate the state returned by the action
                stateValidator && transientState !== startState && stateValidator(transientState);

                // Chain calculation calls
                calculations.forEach(calculation => {
                    const priorState = transientState;

                    // passing the state return from one into the next,
                    // the starting state prior to the action is also given.
                    transientState = calculation(priorState, startState);

                    // Validate the state returned by the calculation
                    stateValidator && transientState !== priorState && stateValidator(transientState);
                });

                // Store state and determine if a change has occurred
                if (transientState !== startState) {
                    lockedState = transientState;

                    log("state", "after", name, [lockedState]);

                    // Call side-effects only if state has changed
                    sideEffects.forEach(sideEffect => {
                        // passing the new state, original state, and all action dispatchers
                        sideEffect(lockedState, startState, dispatchers);
                    });
                }
            } finally {
                // Release lock ready for another dispatch
                dispatching = undefined;

                end("dispatch", type, name);
            }
        };
    }

    // Wrapper for calculation and sideEffect functions, that simply logs the call
    function logCall(fn, type, name) {
        return (...args) => {
            try {
                start("call", type, name, [args[0]]);
                return fn(...args);
            } finally {
                end("call", type, name);
            }
        };
    }

    // Create the wrapper for action, calculation and side-effect functions or conditionals
    function createCall(type, name, fnOrCond, wrap) {
        log("register", type, name);

        if (fnOrCond && fnOrCond.then && fnOrCond.then.apply) {
            if (fnOrCond.when && fnOrCond.when.apply) {
                return conditionalCall(fnOrCond.when, wrap(fnOrCond.then, type, name));
            } else {
                return wrap(fnOrCond.then, type, name);
            }
        } else if (fnOrCond && fnOrCond.apply) {
            return wrap(fnOrCond, type, name);
        } else {
            throw new TypeError(`${type} '${name}' must be a function, or an object containing a 'then' & optional 'when' function`);
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

    // Create the wrappers for all named calculation or side effects given in obj
    function createCalls(type, obj, wrap) {
        return Object.keys(obj).map(name => createCall(type, name, obj[name], wrap));
    }

    function liveError(type, names) {
        return `Attempt to add ${type} ${names} to ${logId} after the first action was dispatched`;
    }

    // Check that the required calculations or sideEffects have already been registered
    function checkRequirements(type, obj, requiresProp, registerType) {
        Object.keys(obj).forEach(name => {
            let requires = obj[name][requiresProp];
            if (requires) {
                if (!Array.isArray(requires)) {
                    requires = [requires];
                }
                requires.forEach(requirement => {
                    if (!registered[registerType][requirement]) {
                        throw `${type} '${name}' requires the ${registerType} '${requirement}' in ${logId}`;
                    }
                });
            }
        });
    }

    function registerNames(obj, registerType) {
        Object.keys(obj).forEach(name => {
            registered[registerType][name] = true;
        });
    }

    return {
        // Set the state validator function, generally only used in testing, it is expected to throw an error if it
        // finds the state to be invalid. It will be called, passing the state as the only arguments, on setting of
        // the initial state, and after each action and calculation if a new state has been returned.
        validator(validator) {
            if (lockedState) {
                throw ("The state validator should be set before the initial state of the fluxlet is set");
            }
            log("register", "validator", "", [validator]);
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
            // Check the required calculations of these calculations have already been registered
            checkRequirements("Calculation", namedCalculations, "requiresCalculation", "calculation");

            // Create the calculation functions and add them to the list
            calculations.push(...createCalls("calculation", namedCalculations, logCall));

            // Register these calculations
            registerNames(namedCalculations, "calculation");
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
            // Check the required calculations of these side-effects have already been registered
            checkRequirements("Side effect", namedSideEffects, "requiresCalculation", "calculation");

            // Check the required side-effects of these side-effects have already been registered
            checkRequirements("Side effect", namedSideEffects, "requiresSideEffects", "sideEffect");

            // Create the side-effect functions and add them to the list
            sideEffects.push(...createCalls("sideEffect", namedSideEffects, logCall));

            // Register these side-effects
            registerNames(namedSideEffects, "sideEffect");
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
            extend(logging, categories);
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
            sideEffects: () => sideEffects,
            logging: () => logging,
            urlParams: () => urlParams,
            setConsole: (altCons) => {
                cons = altCons;
            }
        }
    };
}

// Read 'fluxlet.' prefixed params from the given strings
// 'fluxlet.<param>=<value>' will apply to any fluxlet
// 'fluxlet.<id>.<param>=<value>' will apply only to the specific fluxlet by id
// the fluxlet specific value will override the general value
function readUrlParams(id, strs) {
    const params = {};

    function readParams(prefix) {
        strs.forEach(str => {
            const re = new RegExp(`\\b${prefix}\\.([^&;=#?.]+)=([^&;=#?]+)`, 'g');
            let m;
            while (m = re.exec(str)) {
                params[m[1]] = m[2];
            }
        });
    }

    readParams('fluxlet');
    id && readParams('fluxlet\\.' + id.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'));

    return params;
}

// Extract logging categories from a fluxlet url param
function getLoggingFromUrlParams(urlParams, name) {
    const categories = {};
    if (urlParams[name]) {
        if (urlParams[name] === "all") {
            Object.keys(defaultLogging).forEach(key => {
                categories[key] = true;
            });
        } else {
            urlParams[name].split(",").forEach(key => {
                if (key) {
                    categories[key] = true;
                }
            });
        }
    }
    return categories;
}

// Extend target object with the properties from all the given source objects
export function extend(target, ...sources) {
    sources.forEach(source => {
        if (source && typeof source === 'object') {
            Object.keys(source).forEach(key => {
                target[key] = source[key];
            });
        }
    });
    return target;
}
