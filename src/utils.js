import { forEach, clone, isEqual } from "underscore";

/**
 * Recursively freeze an object/array making it immutable
 */
export function deepFreeze(v) {
    if (v != null && typeof v === 'object' && !Object.isFrozen(v)) {
        Object.freeze(v);
        forEach(v, deepFreeze);
    }
    return v;
}

function cloneAndSet(container, key, value) {
    var cloned = clone(container);
    if (value === undefined) {
        delete cloned[key];
    } else {
        cloned[key] = value;
    }
    return deepFreeze(cloned);
}

export function update(path, value) {
    if (path && path.split) {
        path = path.split('.');
    }

    if (!path || !path.length || !path.slice) {
        throw new TypeError("path should be a non-empty String or Array");
    }

    var getValue = typeof value === "function" ? value : () => value;

    return (container) => {
        function doUpdate(container, idx) {
            if (!container || !(typeof container === "object")) {
                throw new TypeError(`update of path '${path.join('.')}' failed, expecting an Object or Array at: '${path.slice(0, idx)}' got: ${container}`);
            }

            var key = path[idx];
            var value = idx + 1 < path.length ? doUpdate(container[key], idx + 1) : getValue(container[key]);

            return value !== container[key] ? cloneAndSet(container, key, value) : container;
        }

        return doUpdate(container, 0);
    }
}

/**
 * Designed to be use with update(), as the value function, to return the new value only if it differs from the old
 * value (using a deep _.isEqual comparison)
 */
export function onlyIfDiffers(newValue) {
    return oldValue => isEqual(newValue, oldValue) ? oldValue : newValue;
}

/**
 * Chain several functions, passing the result from one into the next
 */
export function chain(...fns) {
    return fns.reduce.bind(fns, (state, fn) => fn(state));
}

/**
 * Handy event handler wrapper that preventDefaults, and calls an action with the rest of the args
 */
export function clickAction(action, ...args) {
    return (event) => {
        event.preventDefault();
        action(...args);
    };
}

/**
 * Return the given function but deferred, useful for registering synthetic event handlers
 */
export function deferred(fn) {
    return (...args) => {
        window.setTimeout(fn(...args), 0);
    };
}
