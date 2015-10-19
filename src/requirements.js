// # Requirements Hooks
//
// Allows calculations and side-effects to declare that they depend on the
// outcome of other calculations or side-effects, and will fail at registration
// if the required components have not been registered earlier.
//
//     fluxlet()
//       .hooks(requirements)
//       .calculations({
//         importantCalc: s => do something important
//       })
//       .sideEffects({
//         renderStuff: {
//           requiresCalculations: ["importantCalc"],
//           then: s => do rendering using the data from importantCalc
//         }
//       })
//
// NOTE: these hooks do not attempt to resolve or order dependencies they just
// provide a fail fast warning that expected components haven't be registered
//
// Calculations may specify 'requiresCalculations' with a single calculation
// name or array of names.
//
// Side effects may specify 'requiresCalculations' and/or 'requiresSideEffects'
// with a name or array of names.
//
// The required components must have been entirely registered within a previous
// object of named components, and not the same object (as the ordering of
// object properties cannot not be guaranteed).
//
// The following will fail:
//
//       .calculations({
//         importantCalc: s => do something important,
//         dependentCalc: {
//           requiresCalculations: "importantCalc"
//         }
//       })
//
// It should be registered as separate groups:
//
//       .calculations({
//         importantCalc: s => do something important
//       }, {
//         dependentCalc: {
//           requiresCalculations: "importantCalc"
//         }
//       })
//
export default {
  registerCalculations({ logId, shared:{registered:{ calculations }}}) {
    return (namedCalculations) => {
      // Check the required calculations of these calculations have already been registered
      checkRequirements("requiresCalculations", namedCalculations, calculations,
        (name, reqd) => `Calculation '${name}' requires the calculation '${reqd}' in ${logId}`)
    }
  },

  registerSideEffects({ logId, shared:{registered:{ calculations, sideEffects }}}) {
    return (namedSideEffects) => {
      // Check the required calculations of these side-effects have already been registered
      checkRequirements("requiresCalculations", namedSideEffects, calculations,
        (name, reqd) => `Side effect '${name}' requires the calculation '${reqd}' in ${logId}`)

      // Check the required side-effects of these side-effects have already been registered
      checkRequirements("requiresSideEffects", namedSideEffects, sideEffects,
        (name, reqd) => `Side effect '${name}' requires the side-effect '${reqd}' in ${logId}`)
    }
  }
}

// Check that the required calculations or sideEffects have already been registered
function checkRequirements(requiresProp, named, register, msg) {
  Object.keys(named).forEach(name => {
    asArray(named[name][requiresProp]).forEach(requirement => {
      if (!register[requirement]) {
        throw new Error(msg(name, requirement))
      }
    })
  })
}

function asArray(requires) {
  return Array.isArray(requires) ? requires : (requires ? [requires] : [])
}
