// # De-duplication Hooks
//
// Prevents duplicate registration of actions, calculations and side-effects.
//
//     fluxlet()
//       .hooks(dedupe)
//
export default {
  registerActions({ logId, fluxlet }) {
    return (namedActions) => {
      // Check that we aren't registering actions with the same names
      checkForDuplicates(namedActions, fluxlet.has.action,
        (name) => `Attempt to add an existing action '${name}' to ${logId}`)
    }
  },

  registerCalculations({ logId, fluxlet }) {
    return (namedCalculations) => {
      // Check that we aren't registering calculations with the same names
      checkForDuplicates(namedCalculations, fluxlet.has.calculation,
        (name) => `Attempt to add an existing calculation '${name}' to ${logId}`)
    }
  },

  registerSideEffects({ logId, fluxlet }) {
    return (namedSideEffects) => {
      // Check that we aren't registering side effects with the same names
      checkForDuplicates(namedSideEffects, fluxlet.has.sideEffect,
        (name) => `Attempt to add an existing side-effect '${name}' to ${logId}`)
    }
  }
}

// Check that an action, calculation, or sideEffect hasn't already been registered
function checkForDuplicates(named, has, msg) {
  Object.keys(named).forEach(name => {
    if (has(name)) {
      throw new Error(msg(name))
    }
  })
}
