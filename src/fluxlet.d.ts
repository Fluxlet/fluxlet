// NOTE: This is work in progress, it mainly serves as a more formal definition of the fluxlet API at present,
// and may need some modification to be used as a real TypeScript definition module.

// The generic type variables are:
//
// S - defines the state object
//
// D - defines the set of dispatcher functions
//     if you don't want to create an interface to declare all dispatchers,
//     then just use Dispatchers.

declare function fluxlet<S,D>(id?: string): Fluxlet<S,D>

interface Fluxlet<S,D> {
  hooks(...namedHooks: Array<NamedHooks<S,D>>): Fluxlet<S, D>

  state(state: StateInitializer<S>): Fluxlet<S,D>

  actions(...namedActions: Array<Named<Action<S>>>): Fluxlet<S,D>

  calculations(...namedCalculations: Array<Named<Calculation<S>>>): Fluxlet<S,D>

  sideEffects(...namedSideEffects: Array<Named<SideEffect<S,D>>>): Fluxlet<S,D>

  init(...fn: Array<Init<D>>): Fluxlet<S,D>

  remove(): void
}

declare type StateInitializer<S> = (state: S | void) => S

interface ActionFn<S> {
  (...args: any[]): (state: S) => S
}

interface ActionObj<S> {
  when?: (state: S, ...args: any[]) => boolean
  then: ActionFn<S>
}

declare type Action<S> = ActionFn<S> | ActionObj<S>

interface CalculationFn<S> {
  (state: S, prevState: S): S
}

interface CalculationObj<S> {
  requiresCalculations?: string|string[]
  when?: (state: S, prevState: S) => boolean
  then: CalculationFn<S>
}

declare type Calculation<S> = CalculationFn<S> | CalculationObj<S>

interface SideEffectFn<S,D> {
  (state: S, prevState: S, dispatchers: D): void | any
}

interface SideEffectObj<S,D> {
  requiresCalculations?: string|string[]
  requiresSideEffects?: string|string[]
  when?: (state: S, prevState: S) => boolean
  then: SideEffectFn<S,D>
}

declare type SideEffect<S,D> = SideEffectFn<S,D> | SideEffectObj<S,D>

interface Init<D> {
  (dispatchers: D): void
}

interface Dispatcher {
  (...args: any[]): void
}

interface Named<T> {
  [index: string]: T
}

declare type Dispatchers = Named<Dispatcher>

declare type Shared = Object

interface NamedHooks<S,D> {
  registerState?: Hook<RegisterStateHookParams<S,D>, S>

  registerActions?: Hook<CommonHookParams<S,D>, Named<Action<S>>>
  registerAction?: Hook<RegisterHookParams<S,D>, Action<S>>
  registerDispatcher?: Hook<RegisterHookParams<S,D>, Dispatcher>

  registerCalculations?: Hook<CommonHookParams<S,D>, Named<Calculation<S>>>
  registerCalculation?: Hook<RegisterHookParams<S,D>, Calculation<S>>

  registerSideEffects?: Hook<CommonHookParams<S,D>, Named<SideEffect<S,D>>>
  registerSideEffect?: Hook<RegisterHookParams<S,D>, SideEffect<S,D>>

  dispatch?: Hook<DispatchHookParams<S,D>, S>
  action?: Hook<ActionHookParams<S,D>, S>
  calculations?: Hook<CalculationsHookParams<S,D>, S>
  calculation?: Hook<CalculationHookParams<S,D>, S>
  sideEffects?: Hook<SideEffectsHookParams<S,D>, void>
  sideEffect?: Hook<SideEffectHookParams<S,D>, any>
}

interface Hook<P, V> {
  (params: P): void | PostHook<V>
}

interface PostHook<V> {
  (value: V): void | V
}

interface CommonHookParams<S,D> {
  logId: string
  fluxlet: Fluxlet<S,D>
  shared: Shared
}

interface RegisterStateHookParams<S,D> extends CommonHookParams<S,D> {
  state: StateInitializer<S>
  lockedState: S
}

interface RegisterHookParams<S,D> extends CommonHookParams<S,D> {
  name: string
}

interface ActionHookParams<S,D> extends CommonHookParams<S,D> {
  actionName: string
  actionArgs: any[]
  startState: S
}

interface DispatchHookParams<S,D> extends ActionHookParams<S,D> {
  enable: boolean
}

interface CalculationsHookParams<S,D> extends CommonHookParams<S,D> {
  actionName: string
  startState: S
  transientState: S
}

interface CalculationHookParams<S,D> extends CommonHookParams<S,D> {
  actionName: string
  calculation: Calculation<S>
  startState: S
  priorState: S
  enable: boolean
}

interface SideEffectsHookParams<S,D> extends CommonHookParams<S,D> {
  actionName: string
  lockedState: S
}

interface SideEffectHookParams<S,D> extends CommonHookParams<S,D> {
  actionName: string
  sideEffect: SideEffect<S,D>
  startState: S
  lockedState: S
  dispatchers: D
  enable: boolean
}
