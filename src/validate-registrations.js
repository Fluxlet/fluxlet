export default {
  registerActions() {
    return (namedActions) => {
      // Check all actions are functions or objects with a 'then' function
      checkFunctions(namedActions,
        (name) => `Action '${name}' must be a function, or an object containing a 'then' function`)
    }
  },

  registerCalculations() {
    return (namedCalculations) => {
      // Check all calculations are functions or objects with a 'then' function
      checkFunctions(namedCalculations,
        (name) => `Calculation '${name}' must be a function, or an object containing a 'then' function`)
    }
  },

  registerSideEffects() {
    return (namedSideEffects) => {
      // Check all side-effects are functions or objects with a 'then' function
      checkFunctions(namedSideEffects,
        (name) => `Side effect '${name}' must be a function, or an object containing a 'then' function`)
    }
  }
}

// Check that all components are either functions or objects with a 'then' function
function checkFunctions(named, msg) {
  Object.keys(named).forEach(name => {
    if (typeof (named[name].then || named[name]) !== 'function') {
      throw new TypeError(msg(name))
    }
  })
}
