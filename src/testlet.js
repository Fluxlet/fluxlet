import fluxlet from "./fluxlet";
import { deepFreeze } from "./utils";

import { extend } from "jquery";
const deepExtend = extend.bind(undefined, true);

var instance;
var gathered;

export var given = {

    fluxlet(id) {
        instance = fluxlet(id)
            .logging({register: false, dispatch: true, call: false})
            .sideEffects({
                gatherState: (state, prev) => {
                    gathered = { state, prev };
                }
            });

        return this;
    },

    state(overridingState) {
        instance.state(state => deepFreeze(deepExtend({}, state, overridingState)));
        const state = instance.debug.state();
        gathered = { state, prev: state };
        return this;
    },

    actions(namedActions) {
        instance.actions(namedActions);
        return this;
    },

    calculations(namedCalculations) {
        instance.calculations(namedCalculations);
        return this;
    },

    sideEffects(namedSideEffects) {
        instance.sideEffects(namedSideEffects);
        return this;
    }
};

export function when() {
    return instance.debug.dispatchers();
}

export function then(fn) {
    fn(gathered.state, gathered.prev);
}

export function thenAfter(when, then) {
    instance.sideEffects({
        testExpectedStateChange: { when, then }
    });
}

export function noop(){
    return function(state) {
        return state;
    };
}
