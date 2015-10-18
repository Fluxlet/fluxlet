
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
