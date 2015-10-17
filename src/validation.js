
// Set the state validator function, generally only used in testing, it is expected to throw an error if it
// finds the state to be invalid. It will be called, passing the state as the only arguments, on setting of
// the initial state, and after each action and calculation if a new state has been returned.

export default function(validator) {
  return {
    registerState() {
      return state => {
        validator(state)
      }
    },
    action({ startState }) {
      return transientState => {
        transientState !== startState && validator(transientState)
      }
    },
    calculation({ priorState }) {
      return transientState => {
        transientState !== priorState && validator(transientState)
      }
    }
  }
}
