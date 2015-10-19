// # Lockdown Hooks
//
// Prevent direct setting of state, and further registration of actions,
// calculations or side-effects after the first dispatch.
//
// This is a fail fast mechanism to ensure unexpected behaviour cannot be
// introduced into a running application.
//
// Usage:
//
//     import lockdown from "fluxlet/lockdown"
//
//     fluxlet()
//       .hooks(lockdown)
//
export default {
  dispatch({ shared }) {
    shared.lockdown = true
  },

  registerState({ logId, shared }) {
    if (shared.lockdown) {
      throw new Error(`Attempt to set state of ${logId} after the first action was dispatched`)
    }
  },

  registerActions: createHook("actions"),
  registerCalculations: createHook("calculations"),
  registerSideEffects: createHook("side effects")
}

function createHook(type) {
  return ({ logId, shared }) => {
    if (shared.lockdown) {
      return (named) => {
        throw new Error(`Attempt to add ${type} ${Object.keys(named)} to ${logId} after the first action was dispatched`)
      }
    }
  }
}
