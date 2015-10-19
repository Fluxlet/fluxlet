// # Validation Hooks
//
// Create hooks to validate the state at initialisation and after each
// manipulation, using the given validator function.
//
// The validator function is passed a single state argument and should throw a
// TypeError should it be found to be invalid.
//
//     (state) => void
//
// Usage:
//
//     import validation from "fluxlet/validation"
//
//     fluxlet()
//       .hooks(validation(s => {
//         isInvalid(s) && throw new TypeError("Invalid state")
//       }))
//
export default function(validator) {
  return {
    // Validate initial state
    registerState() {
      return state => {
        validator(state)
      }
    },

    // Validate the state after the action has manipulated it
    action({ startState }) {
      return transientState => {
        // but only if the state has changed
        transientState !== startState && validator(transientState)
      }
    },

    // Validate the state after every calculation
    calculation({ priorState }) {
      return transientState => {
        // but only if the state has changed
        transientState !== priorState && validator(transientState)
      }
    }
  }
}
