// # Fluxlet

// Fluxlet uses a fluent API to construct an instance, a fluxlet can be named or annonymous.

// Internal map of named fluxlets
const fluxlets = {}

// ## Factory
//
// Create or retrieve a fluxlet
//
export default function(id) {

  // Return an existing fluxlet by id if it exists
  if (id && fluxlets[id]) {
    return fluxlets[id]
  }

  const instance = createFluxlet(id)

  // Anonymous fluxlets are not stored
  if (id) {
    fluxlets[id] = instance
  }

  return instance
}

// ## Internal constructor
//
function createFluxlet(id) {

  // A function that validates states as they are passed around
  let stateValidator = undefined

  // The state of the fluxlet between dispatches
  let lockedState = undefined

  // The current action in dispatch
  let dispatching = undefined

  // Hook register
  const hooks = {}

  // The map of action dispatchers
  const dispatchers = {}

  // The list of state calculation functions
  const calculations = []

  // The list of side effect functions
  const sideEffects = []

  // All registered actions, calculation and sideEffect names, for duplicates
  // and requirements checking (value is always true for calculations and
  // sideEffects)
  const registered = {
    action: dispatchers,
    calculation: {},
    sideEffect: {}
  }

  // Handy string for use in log and error messages
  const logId = `fluxlet:${id||'(anon)'}`

  // Set to true on the first action dispatch,
  // after which certain aspects of the fluxlet may not be modified
  let live = false

  // Call a hook
  function hook(name, params) {
    const postHooks = hooks[name] && hooks[name].map(preHook => preHook(params))

    return postHooks && postHooks.length ?
      // create a fn that passes its arg through the chain of postHooks
      postHooks.reduce.bind(postHooks, (result, postHook) => {
        const hookResult = postHook ? postHook(result) : undefined
        return hookResult === undefined ? result : hookResult
      }) :
      // no postHooks, so just return the identity fn
      v => v
  }

  // Create a dispatcher function for an action
  function createDispatcher(actionName, action) {
    // This is the dispatcher function, created for the given action.
    // It args are passed through to the action function later.
    return (...actionArgs) => {
      // The fluxlet become 'live' on the first action dispatch
      live = true

      if (dispatching) {
        // This dispatch will fail if called directly from within another dispatch
        throw new Error(`Attempt to dispatch action '${actionName}' within action '${dispatching}' in ${logId}`)
      }

      // Test the action condition (if given) before dispatching the action
      const enable = action.when ? action.when(lockedState, ...actionArgs) : true

      // Get the starting state
      const startState = lockedState

      // Call dispatch hooks
      const postDispatch = hook("dispatch", { logId, actionName, actionArgs, startState, enable })

      // Lock the dispatcher for the current action
      dispatching = actionName

      try {
        if (enable) {
          // Call action hooks
          const postAction = hook("action", { logId, actionName, actionArgs, startState })

          // Call the action with the args given to the dispatcher
          const stateManipulator = (action.then || action)(...actionArgs)

          // We expect the action to return a function that will manipulate the the state
          if (typeof stateManipulator !== "function") {
            throw new TypeError(`Action '${actionName}' did not return a function as expected in ${logId}`)
          }

          // Pass the state the to the function returned from the action, and then through any post-action hooks
          let transientState = postAction(stateManipulator(startState))

          // Validate the state returned by the action
          stateValidator && transientState !== startState && stateValidator(transientState)

          // Call the hook for entire calculation chain
          const postCalculations = hook("calculations", { logId, actionName, startState, transientState })

          // Chain calculation calls
          calculations.forEach(calculation => {
            const priorState = transientState

            // Test the calculation condition to determine whether the calculation should be called
            const enable = calculation.when ? calculation.when(priorState, startState) : true

            // Call the individual calculation hook
            const postCalculation = hook("calculation", { logId, actionName, calculation, startState, priorState, enable })

            // Call the actual calculation, passing the state return from the previous,
            // the starting state prior to the action is also given.
            // Then result is then passed through any post-calculation hooks
            transientState = postCalculation(enable ? (calculation.then || calculation)(priorState, startState) : priorState)

            // Validate the state returned by the calculation
            stateValidator && transientState !== priorState && stateValidator(transientState)
          })

          // Pass the final state of the calculation chain through any post-calculation chain hooks
          transientState = postCalculations(transientState)

          // Determine if the state has changed and store the new state
          if (transientState !== startState) {
            lockedState = transientState

            // Call the hook for the entire set of side-effects
            const postSideEffects = hook("sideEffects", { logId, actionName, lockedState })

            // Call side-effects only if state has changed
            sideEffects.forEach(sideEffect => {

              // Test the side-effect condition to determine whether the side-effect should be called
              const enable = sideEffect.when ? sideEffect.when(lockedState, startState) : true

              // Call the individual side-effect hook
              const postSideEffect = hook("sideEffect", { logId, actionName, sideEffect, startState, lockedState, dispatchers, enable })

              // Call the actual side-effect, passing the new state, original state, and all action dispatchers
              // Passing any return values from the side-effects to any post-side-effect hooks
              postSideEffect(enable ? (sideEffect.then || sideEffect)(lockedState, startState, dispatchers) : undefined)
            })

            // Call the post-hook for the set of side-effects
            postSideEffects()
          }
        }
      } finally {
        // Release lock ready for another dispatch
        dispatching = undefined

        // Call the post-dispatch hook with the final state
        postDispatch(lockedState)
      }
    }
  }


  function liveError(type, args) {
    const names = args.reduce((names, obj) => names.concat(Object.keys(obj)), [])

    return new Error(`Attempt to add ${type} ${names} to ${logId} after the first action was dispatched`)
  }

  // Check that an action, calculation, or sideEffect hasn't already been registered
  function checkForDuplicates(type, obj) {
    Object.keys(obj).forEach(name => {
      if (registered[type][name]) {
        throw new Error(`Attempt to add an existing ${type} '${name}' to ${logId}`)
      }
    })
  }

  // Check that the required calculations or sideEffects have already been registered
  function checkRequirements(type, obj, requiresProp, registerType) {
    Object.keys(obj).forEach(name => {
      let requires = obj[name][requiresProp]
      if (requires) {
        if (!Array.isArray(requires)) {
          requires = [requires]
        }
        requires.forEach(requirement => {
          if (!registered[registerType][requirement]) {
            throw new Error(`${type} '${name}' requires the ${registerType} '${requirement}' in ${logId}`)
          }
        })
      }
    })
  }

  // Check that all components are either functions or objects with a 'then' function
  function checkFunctions(type, obj) {
    Object.keys(obj).forEach(name => {
      if (typeof (obj[name].then || obj[name]) !== 'function') {
        throw new TypeError(`${type} '${name}' must be a function, or an object containing a 'then' function`)
      }
    })
  }

  function registerNames(obj, registerType) {
    Object.keys(obj).forEach(name => {
      registered[registerType][name] = true
    })
  }

  const fluxlet = {
    // ## Register a hook
    // The hook is called before something happens, it's passed a parameters
    // object which containing various information depending what is happening.
    //
    //     hook: (params) => void | postHook
    //
    // The hook may optionally return a post-hook fn, which is called after the
    // thing has happened, with the result of it. The post-hook fn may return
    // nothing (ie. undefined), in which case the result is passed on untouched
    // or it can return a modified result.
    //
    //     postHook: (value) => void | value
    //
    // Look for calls to the *hook* function throughout this code to see what
    // hooks can be registered
    //
    hooks(...namedHooksArgs) {
      namedHooksArgs.forEach(namedHooks => {
        Object.keys(namedHooks).forEach(name => {
          (hooks[name] = hooks[name] || []).push(namedHooks[name])
        })
      })
      return fluxlet
    },

    // Set the state validator function, generally only used in testing, it is expected to throw an error if it
    // finds the state to be invalid. It will be called, passing the state as the only arguments, on setting of
    // the initial state, and after each action and calculation if a new state has been returned.
    validator(validator) {
      if (lockedState) {
        throw new Error("The state validator should be set before the initial state of the fluxlet is set")
      }
      stateValidator = validator
      return fluxlet
    },

    // Set (or modify) the initial state of the fluxlet
    state(state) {
      if (live) {
        throw new Error(`Attempt to set state of ${logId} after the first action was dispatched`)
      }
      lockedState = hook("registerState", { logId, state, lockedState })(typeof state === "function" ? state(lockedState) : state)
      stateValidator && stateValidator(lockedState)
      return fluxlet
    },

    // Add named actions to the fluxlet. An action takes some operational params,
    // and returns a fn that takes the whole fluxlet state and returns a new state.
    //
    //     f.actions({ setName, setDateOfBirth })
    //
    // Each named action can be either a function with the signature:
    //
    //     (...args) -> (state) -> state
    //
    // Or an object with an optional _condition_ function 'when', 'then' is the action which is only
    // performed if the condition returns true.
    //
    //     {
    //       when?: (state, ...args) -> boolean,
    //       then: (...args) -> (state) -> state
    //     }
    //
    actions(...namedActionsArgs) {
      if (live) {
        throw liveError('actions', namedActionsArgs)
      }

      namedActionsArgs.forEach(namedActions => {
        // Check all actions are functions or objects with a 'then' function
        checkFunctions("Action", namedActions)

        // Check that we aren't registering actions with the same names
        checkForDuplicates("action", namedActions)

        Object.keys(namedActions).forEach(name => {
          const action = hook("registerAction", { logId, name })(namedActions[name])
          const dispatcher = createDispatcher(name, action)
          dispatchers[name] = hook("registerDispatcher", { logId, name })(dispatcher)
        })
      })
      return fluxlet
    },

    // Add named calculations to the fluxlet. Calculations are chained, the first is given the state
    // from the action, and then return value is passed into the next calculation, and so on.
    // They are also passed the original state prior to the action (as the 2nd arg).
    //
    //     f.calculations({ makeNameUppercase, calculateAge })
    //
    // Each named calculation can be either a function with the signature:
    //
    //     (state, original_state) -> state
    //
    // Or an object with an optional _condition_ function 'when', 'then' is the calculation which is only
    // performed if the condition returns true.
    //
    //     {
    //       requiresCalculations?: string | string[],
    //       when?: (state, original_state) -> boolean,
    //       then: (state, original_state) -> state
    //     }
    //
    // The 'requiresCalculations' is an optional set of calculation names on which this calculation depends,
    // if any of the calculations have not already been registered an error will be thrown.
    //
    calculations(...namedCalculationsArgs) {
      if (live) {
        throw liveError('calculations', namedCalculationsArgs)
      }

      namedCalculationsArgs.forEach(namedCalculations => {
        // Check all calculations are functions or objects with a 'then' function
        checkFunctions("Calculation", namedCalculations)

        // Check that we aren't registering calculations with the same names
        checkForDuplicates("calculation", namedCalculations)

        // Check the required calculations of these calculations have already been registered
        checkRequirements("Calculation", namedCalculations, "requiresCalculations", "calculation")

        Object.keys(namedCalculations).forEach(name => {
          // Pass the calculation through any hooks
          const calculation = hook("registerCalculation", { logId, name })(namedCalculations[name])
          // Add it to the list
          calculations.push(calculation)
        })

        // Register these calculations
        registerNames(namedCalculations, "calculation")
      })
      return fluxlet
    },

    // Add named side-effects to the fluxlet. All side-effects receive the same final state that
    // resulted from the action and calculation chain, along with the original state and the map
    // of action dispatchers. A side-effect must not change state, or directly dispatch an action
    // from this same fluxlet (it may bind them to async events or timeouts though).
    //
    //     f.sideEffects({ renderEverything, makeHttpRequest })
    //
    // Each named side-effect can be either a function with the signature:
    //
    //     (state, original_state, dispatchers) -> void
    //
    // Or an object with an optional _condition_ function 'when', 'then' is the side-effect which is only
    // performed if the condition returns true.
    //
    //     {
    //       requiresCalculations?: string | string[],
    //       requiresSideEffects?: string | string[],
    //       when?: (state, original_state) -> boolean,
    //       then: (state, original_state, dispatchers) -> void
    //     }
    //
    // The 'requiresCalculations' and 'requiresSideEffects' are optional sets of calculation and side-effect names
    // on which this side-effect depends, if any of them have not already been registered an error will be thrown.
    //
    sideEffects(...namedSideEffectsArgs) {
      namedSideEffectsArgs.forEach(namedSideEffects => {
        // Check all side-effects are functions or objects with a 'then' function
        checkFunctions("Side effect", namedSideEffects)

        // Check that we aren't registering side effects with the same names
        checkForDuplicates("sideEffect", namedSideEffects)

        // Check the required calculations of these side-effects have already been registered
        checkRequirements("Side effect", namedSideEffects, "requiresCalculations", "calculation")

        // Check the required side-effects of these side-effects have already been registered
        checkRequirements("Side effect", namedSideEffects, "requiresSideEffects", "sideEffect")

        Object.keys(namedSideEffects).forEach(name => {
          // Pass the side-effect through any hooks
          const sideEffect = hook("registerSideEffect", { logId, name })(namedSideEffects[name])
          // Add it to the list
          sideEffects.push(sideEffect)
        })

        // Register these side-effects
        registerNames(namedSideEffects, "sideEffect")
      })
      return fluxlet
    },

    // Call a initialisation function with the map of action dispatchers.
    //
    //     f.init(({ setName }) => bindChangeEventToAction(setName))
    //
    // The param is a function with the signature:
    //
    //     (dispatchers) -> void
    //
    init(...fns) {
      fns.forEach(fn => fn(dispatchers))
      return fluxlet
    },

    // Remove a named fluxlet from the internal map of fluxlets and anonymise it
    remove() {
      if (id) {
        delete fluxlets[id]
        id = undefined
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
  }

  return fluxlet
}
