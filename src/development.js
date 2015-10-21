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

import fluxlet from "./fluxlet"
import { all as logAll } from "./logging"
import lockdown from "./lockdown"
import validateRegistrations from "./validate-registrations"
import dedupe from "./dedupe"
import requirements from "./requirements"

export default function(...args) {
  return fluxlet(...args)
    .hooks(...logAll)
    .hooks(lockdown, validateRegistrations, dedupe, requirements)
}
