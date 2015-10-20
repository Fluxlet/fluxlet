import createRegister from "./register"

// # Fluxlet

// Fluxlet uses a fluent API to construct an instance, a fluxlet can be named or annonymous.

// Internal map of named fluxlets
const fluxlets = {}

// Next internal fluxlet identifier
let nextUID = 0

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

  const uid = nextUID++

  // The state of the fluxlet between dispatches
  let lockedState = undefined

  // The current action in dispatch
  let dispatching = undefined

  // Hook register
  const hooks = {}

  // The map of action dispatchers
  const dispatchers = {}

  // The list of state calculation functions
  const calculations = createRegister()

  // The list of side effect functions
  const sideEffects = createRegister()

  // Shared data for use by hooks
  const shared = {}

  // Handy string for use in log and error messages
  const logId = `fluxlet:${id||'(anon)'}`

  // Call a hook
  function hook(name, params = {}) {
    if (hooks[name]) {
      // Add common params
      params.uid = uid
      params.id = id
      params.logId = logId
      params.fluxlet = fluxlet
      params.shared = shared
    }

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

      if (dispatching) {
        // This dispatch will fail if called directly from within another dispatch
        throw new Error(`Attempt to dispatch action '${actionName}' within action '${dispatching}' in ${logId}`)
      }

      // Test the action condition (if given) before dispatching the action
      const enable = action.when ? action.when(lockedState, ...actionArgs) : true

      // Get the starting state
      const startState = lockedState

      // Call dispatch hooks
      const postDispatch = hook("dispatch", { actionName, actionArgs, startState, enable })

      // Lock the dispatcher for the current action
      dispatching = actionName

      try {
        if (enable) {
          // Call action hooks
          const postAction = hook("action", { actionName, actionArgs, startState })

          // Call the action with the args given to the dispatcher
          const stateManipulator = (action.then || action)(...actionArgs)

          // We expect the action to return a function that will manipulate the the state
          if (typeof stateManipulator !== "function") {
            throw new TypeError(`Action '${actionName}' did not return a function as expected in ${logId}`)
          }

          // Pass the state the to the function returned from the action, and then through any post-action hooks
          let transientState = postAction(stateManipulator(startState))

          // Call the hook for entire calculation chain
          const postCalculations = hook("calculations", { actionName, startState, transientState })

          // Chain calculation calls
          calculations.forEach(calculation => {
            const priorState = transientState

            // Test the calculation condition to determine whether the calculation should be called
            const enable = calculation.when ? calculation.when(priorState, startState) : true

            // Call the individual calculation hook
            const postCalculation = hook("calculation", { actionName, calculation, startState, priorState, enable })

            // Call the actual calculation, passing the state return from the previous,
            // the starting state prior to the action is also given.
            // Then result is then passed through any post-calculation hooks
            transientState = postCalculation(enable ? (calculation.then || calculation)(priorState, startState) : priorState)
          })

          // Pass the final state of the calculation chain through any post-calculation chain hooks
          transientState = postCalculations(transientState)

          // Determine if the state has changed and store the new state
          if (transientState !== startState) {
            lockedState = transientState

            // Call the hook for the entire set of side-effects
            const postSideEffects = hook("sideEffects", { actionName, lockedState })

            // Call side-effects only if state has changed
            sideEffects.forEach(sideEffect => {

              // Test the side-effect condition to determine whether the side-effect should be called
              const enable = sideEffect.when ? sideEffect.when(lockedState, startState) : true

              // Call the individual side-effect hook
              const postSideEffect = hook("sideEffect", { actionName, sideEffect, startState, lockedState, dispatchers, enable })

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
        lockedState = postDispatch(lockedState)
      }
    }
  }

  const forNamed = iteratee => named => {
    Object.keys(named).forEach(name => iteratee(named[name], name))
  }

  const fluxlet = {
    // ## Register a hook
    //
    //     (...{name: hook}) => Fluxlet
    //
    // The hook is called before something happens, it's passed a parameters
    // object which containing various information depending what is happening.
    //
    //     hook: (params) => void | postHook
    //
    // The hook may optionally return a post-hook fn, which is called
    // immediately for registration hooks with whatever is being registered, or
    // is called after the activity with its result for hooks within the
    // dispatch lifecycle.
    //
    // if the hook or post-hook returns undefined it's treated as if an identity
    // function was supplied as the post-hook, ie. the result is simply passed
    // through. This makes validation/logging hooks easy to implement.
    //
    //     postHook: (value) => void | value
    //
    // Look for calls to the *hook* function throughout this code to see what
    // hooks can be registered, or refer to the fluxlet.d.ts file.
    //
    hooks(...namedHooksArgs) {
      namedHooksArgs.forEach(forNamed((hook, name) => {
        (hooks[name] = hooks[name] || []).push(hook)
      }))
      return fluxlet
    },

    // Set (or modify) the initial state of the fluxlet
    state(state) {
      lockedState = hook("registerState", { state, lockedState })(typeof state === "function" ? state(lockedState) : state)
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
      namedActionsArgs.map(hook("registerActions")).forEach(forNamed((action, name) => {
        // Pass the action thru any hooks, and create a dispatcher for it
        const dispatcher = createDispatcher(name, hook("registerAction", { name })(action))
        // Pass the dispatcher thru any hooks, and register it
        dispatchers[name] = hook("registerDispatcher", { name })(dispatcher)
      }))
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
      namedCalculationsArgs.map(hook("registerCalculations")).forEach(forNamed((calculation, name) => {
        // Pass the calculation through any hooks and register it
        calculations.set(name, hook("registerCalculation", { name })(calculation))
      }))
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
      namedSideEffectsArgs.map(hook("registerSideEffects")).forEach(forNamed((sideEffect, name) => {
        // Pass the side-effect through any hooks and register it
        sideEffects.set(name, hook("registerSideEffect", { name })(sideEffect))
      }))
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
      const postHook = hook("remove")
      if (id) {
        delete fluxlets[id]
        id = undefined
      }
      postHook()
    },

    // Return the id of this fluxlet, given a creation time, may be undefined
    id() {
      return id
    },

    // Return the opaque internal unique identifier of this fluxlet
    uid() {
      return uid
    },

    // Utility fns to check for the existence of a component by name
    has: {
      action: name => !!dispatchers[name],
      calculation: name => calculations.has(name),
      sideEffect: name => sideEffects.has(name)
    }
  }

  return fluxlet
}
