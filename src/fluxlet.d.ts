// NOTE: This is work in progress, it mainly serves as a more formal definition of the fluxlet API at present,
// and may need some modification to be used as a real TypeScript definition module.

// The generic type variables are:
//
// S - defines the state object
//
// D - defines the set of dispatcher functions
//     if you don't want to create an interface to declare all dispatchers,
//     then just use Dispatchers.

declare function fluxlet<S,D>(id?: string, opts?: FluxletOptions): Fluxlet<S,D>

interface Fluxlet<S,D> {
    validator(validator: Validator<S>): Fluxlet<S,D>

    state(state: S): Fluxlet<S,D>

    actions(namedActions: Named<Action<S>|ConditionalAction<S>>): Fluxlet<S,D>

    calculations(namedCalculations: Named<Calculation<S>|ConditionalCalculation<S>>): Fluxlet<S,D>

    sideEffects(namedSideEffects: Named<SideEffect<S,D>|ConditionalSideEffect<S,D>>): Fluxlet<S,D>

    init(fn: Init<D>): Fluxlet<S,D>

    logging(categories: Logging): Fluxlet<S,D>

    remove(): void
}

interface FluxletOptions {
    params: string[]
}

interface Validator<S> {
    (state: S): void
}

interface Action<S> {
    (...args: any[]): (state: S) => S
}

interface ConditionalAction<S> {
    when?: (state: S, ...args: any[]) => boolean
    then: Action<S>
}

interface Calculation<S> {
    (state: S, prevState: S): S
}

interface ConditionalCalculation<S> {
    requiresCalculations?: string|string[]
    when?: (state: S, prevState: S) => boolean
    then: Calculation<S>
}

interface SideEffect<S,D> {
    (state: S, prevState: S, dispatchers: D): void
}

interface ConditionalSideEffect<S,D> {
    requiresCalculations?: string|string[]
    requiresSideEffects?: string|string[]
    when?: (state: S, prevState: S) => boolean
    then: SideEffect<S,D>
}

interface Init<D> {
    (dispatchers: D): void
}

interface Logging {
    register?: boolean
    dispatch?: boolean
    call?: boolean
    args?: boolean
    state?: boolean
    timing?: boolean
}

interface Dispatcher {
    (...args: any[]): void
}

interface Named<T> {
    [index: string]: T
}

declare type Dispatchers = Named<Dispatcher>
