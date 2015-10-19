// # De-duplication Hooks
//
// Prevents duplicate registration of actions, calculations and side-effects.
//
//     fluxlet()
//       .hooks(dedupe)
//
export default {
  registerActions({ logId, shared:{registered:{ actions }}}) {
    return (namedActions) => {
      // Check that we aren't registering actions with the same names
      checkForDuplicates(namedActions, actions,
        (name) => `Attempt to add an existing action '${name}' to ${logId}`)
    }
  },

  registerCalculations({ logId, shared:{registered:{ calculations }}}) {
    return (namedCalculations) => {
      // Check that we aren't registering calculations with the same names
      checkForDuplicates(namedCalculations, calculations,
        (name) => `Attempt to add an existing calculation '${name}' to ${logId}`)
    }
  },

  registerSideEffects({ logId, shared:{registered:{ sideEffects }}}) {
    return (namedSideEffects) => {
      // Check that we aren't registering side effects with the same names
      checkForDuplicates(namedSideEffects, sideEffects,
        (name) => `Attempt to add an existing side-effect '${name}' to ${logId}`)
    }
  }
}

// Check that an action, calculation, or sideEffect hasn't already been registered
function checkForDuplicates(named, register, msg) {
  Object.keys(named).forEach(name => {
    if (register[name]) {
      throw new Error(msg(name))
    }
  })
}
