/* global console */

let logger = console
let collapsed = false

export function setLogger(log) {
  logger = log
}

export const registrations = {
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

let group = []

const prefix = logId => group[group.length-1] === logId ? '' : `${logId} `

export const dispatches = {
  dispatch({ logId, actionName, actionArgs, startState, enable }) {
    if (enable) {
      if (collapsed) {
        logger.groupCollapsed(`${logId} dispatch ${actionName}`)
      } else {
        logger.group(`${logId} dispatch ${actionName}`)
      }
      group.push(logId)
      logger.log("action args", actionArgs)
      logger.log("start state", startState)
      return (finalState) => {
        logger.log("final state", finalState)
        group.pop()
        logger.groupEnd()
      }
    }
  }
}

export const calculations = {
  calculation({ logId, calculation, enable }) {
    enable && logger.log(`${prefix(logId)}calculation ${calculation._fluxlet_log_name}`)
  },

  registerCalculation({ name }) {
    return calculation => {
      calculation._fluxlet_log_name = name
    }
  }
}

export const sideEffects = {
  sideEffect({ logId, sideEffect, enable }) {
    enable && logger.log(`${prefix(logId)}sideEffect ${sideEffect._fluxlet_log_name}`)
  },

  registerSideEffect({ name }) {
    return sideEffect => {
      sideEffect._fluxlet_log_name = name
    }
  }
}
