// Customise this to import utils from wherever you want, these are merely meant as examples

import { extend } from "jquery";

export { deepFreeze } from "./utils";

// Create a spy using whatever is available
export function createSpy(desc, fn) {
    if (typeof sinon === "object") {
        return createSinonSpy(desc, fn);
    } else if (typeof jasmine === "object") {
        return createJasmineSpy(desc, fn);
    } else {
        throw "No spy creator available";
    }
}

// Create a spy using Jasmine
function createJasmineSpy(desc, fn) {
    return jasmine.createSpy(desc, fn).and.callThrough();
}

// Create a spy using Sinon
function createSinonSpy(desc, fn) {
    fn.displayName = desc;
    return sinon.spy(fn);
}

// Deep extend an object using jQuery extend
export const deepExtend = extend.bind(undefined, true);
