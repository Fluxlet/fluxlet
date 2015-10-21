// # Development Mode for fluxlet
//
// This provides a fluxlet constructor with pre-registered development mode
// hooks, saving having to import and register them individually
//
//     import fluxlet from "fluxlet/development"
//
//     fluxlet()
//       .actions(...)
//

import fluxlet from "fluxlet"
import { all as logAll } from "fluxlet/logging"
import lockdown from "fluxlet/lockdown"
import validateRegistrations from "fluxlet/validate-registrations"
import dedupe from "fluxlet/dedupe"
import requirements from "fluxlet/requirements"

export default function(...args) {
  return fluxlet(...args)
    .hooks(...logAll)
    .hooks(lockdown, validateRegistrations, dedupe, requirements)
}
