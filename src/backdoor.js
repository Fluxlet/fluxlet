// # Backdoor Hooks
//
// Gathers registered components and exposes them for debugging and testing
//
//     import { gather, expose } from 'fluxlet/backdoor'
//
//     const bob = fluxlet()
//       .hooks(...)
//       .hooks(gather)
//       .actions(doIt: () => s => s)
//
//     expose(bob).dispatcher.doIt()
//
// NOTE: This should be the LAST hook
//
export const gather = {
  registerState: ({ uid }) => state => {
    reg[uid] = reg[uid] || {}
    reg[uid].initialState = state
  },
  registerAction: save('action'),
  registerDispatcher: save('dispatcher'),
  registerCalculation: save('calculation'),
  registerSideEffect: save('sideEffect'),
  remove: ({ uid }) => {
    delete reg[uid]
  }
}

export function expose(fluxlet) {
  if (!fluxlet || typeof fluxlet.uid !== 'function') {
    throw new TypeError('Invalid fluxlet given to expose:' + fluxlet)
  }
  return fluxlet && reg[fluxlet.uid()]
}

// Contains all gathered data
const reg = Object.create(null)

function save(type) {
  return ({ uid, name }) => named => {
    reg[uid] = reg[uid] || {}
    reg[uid][type] = reg[uid][type] || Object.create(null)
    reg[uid][type][name] = named
  }
}
