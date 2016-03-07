/* global console */

// # Logging Hooks
//
// Provides fluxlet hooks for logging in two distinct areas:
//
// * Registrations
// * Dispatch lifecycle

// Local reference to console, to allow it to be overridden with an alternative
// implementation, eg with spies for testing
let logger = console

export function setLogger(log) {
  logger = log
}

// Collapse dispatch groups by default if true
let collapsed = false

// Enable/disable logging of state
let logState = true

export function enableState(enable) {
  logState = !!enable
}

// Enable/disable logging of action arguments
let logActionArgs = true

export function enableActionArgs(enable) {
  logActionArgs = !!enable
}

// Enable/disable logging of action args

// ## Registration hooks
//
//     fluxlet()
//       .hooks(log.registrations)
//
export const registrations = {
  registerHook({ logId, name }) {
    logger.log(`${logId} register hook ${name}`)
  },

  registerState({ logId }) {
    return state => {
      logger.log(`${logId} initial state`, state)
    }
  },

  registerAction({ logId, name }) {
    logger.log(`${logId} register action ${name}`)
  },

  registerCalculation({ logId, name }) {
    logger.log(`${logId} register calculation ${name}`)
  },

  registerSideEffect({ logId, name }) {
    logger.log(`${logId} register sideEffect ${name}`)
  }
}

// ## Dispatch lifecycle hooks
//
// Add hooks that log various aspects of the dispatch lifecycle
//
//     fluxlet()
//       .hooks(log.dispatches)
//       .hooks(log.calculations)
//       .hooks(log.sideEffects)
//
export const dispatches = {
  dispatch({ logId, actionName, actionArgs, startState, enable }) {
    if (enable) {
      if (collapsed) {
        (logger.groupCollapsed || logger.group || logger.log)(`${logId} dispatch ${actionName}`)
      } else {
        (logger.group || logger.log)(`${logId} dispatch ${actionName}`)
      }
      group.push(logId)
      logActionArgs && logger.log("action args", actionArgs)
      logState && logger.log("start state", startState)
      return (finalState) => {
        logState && logger.log("final state", finalState)
        group.pop()
        logger.groupEnd && logger.groupEnd()
      }
    }
  }
}

export const calculations = {
  calculation({ logId, name, enable }) {
    enable && logger.log(`${prefix(logId)}calculation ${name}`)
  }
}

export const sideEffects = {
  sideEffect({ logId, name, enable }) {
    enable && logger.log(`${prefix(logId)}sideEffect ${name}`)
  }
}

let group = []

const prefix = logId => group[group.length-1] === logId ? '' : `${logId} `

// ## All hooks
//
// Add all hooks for convenience...
//
//     fluxlet()
//       .hooks(...log.all)
//
export const all = [
  registrations,
  dispatches,
  calculations,
  sideEffects
]
