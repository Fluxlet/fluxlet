
export default function(id) {
    const locker = createLocker();
    const dispatchers = {};
    const calculations = [];
    const sideEffects = [];
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

    function createDispatcher(action, type, name) {
        return (...args) => {
            log("dispatch", type, name, args);

            // Get starting state
            const startState = locker.claim(name);

            try {
                // Call with the state from the locker
                let endState = action(...args)(startState);

                // Chain calculation calls
                calculations.forEach(calculation => {
                    endState = calculation(endState, startState);
                });

                // Store state and determine if a change has occurred
                if (locker.swap(endState)) {

                    // Call side-effects only if state has changed
                    sideEffects.forEach(sideEffect => {
                        sideEffect(endState, startState, dispatchers);
                    });
                }
            } finally {
                locker.release();
            }
        };
    }

    function logCall(fn, name, type) {
        return (...args) => {
            log("call", type, name, [args[0]]);
            return fn(...args);
        };
    }

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
        state(state) {
            log("create", "state", state);
            locker.claim();
            locker.swap(state);
            locker.release();
            return this;
        },

        actions(namedActions) {
            Object.keys(namedActions).forEach(name => {
                dispatchers[name] = createCall("action", name, namedActions[name], createDispatcher);
            });
            return this;
        },

        calculations(namedCalculations) {
            calculations.push(...createCalls("calculation", namedCalculations, logCall));
            return this;
        },

        sideEffects(namedSideEffects) {
            sideEffects.push(...createCalls("sideEffect", namedSideEffects, logCall));
            return this;
        },

        init(fn) {
            fn(dispatchers);
            return this;
        },

        logging(categories) {
            Object.keys(categories).forEach(name => { logging[name] = categories[name] });
            return this;
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
    }
}

function createLocker(initialState) {
    let state = initialState;
    let claimed = false;

    return {
        claim(byAction) {
            if (claimed) {
                throw ("Attempt to call the action '" + byAction + "' within action '" + claimed + "'");
            }
            claimed = byAction || true;
            return state;
        },

        swap(newState) {
            if (!claimed) {
                throw "Attempted to swap an unclaimed state";
            }
            if (newState !== state) {
                state = newState;
                return true;
            }
            return false;
        },

        release() {
            if (!claimed) {
                throw "Attempted to release an unclaimed state";
            }
            claimed = false;
        }
    };
}
