import fluxlet from "../../src/fluxlet";
import initialState from "./state";
import { setWords, countWords, renderWords, renderCount } from "./words";

export default function() {

    // Create a new fluxlet (with a name)
    fluxlet("words")

        // Set the initial state
        .state(initialState)

        // Register action functions (a dispatcher will be create for each of these)
        .actions({ setWords })

        // Register the calculation functions (these are called in all dispatchers)
        .calculations({ countWords })

        // Register side effect function (these are called in all dispatchers)
        .sideEffects({ renderWords, renderCount })

        // Call the bindReady fn passing all dispatchers by their action name
        .init(bindReady);
}

// Listen for the global 'ready' event and kick off the first action dispatch
function bindReady({ setWords }) {
    document.addEventListener("DOMContentLoaded", function() {
        ["fluxlet example", "counts words", "counts words", "easy as pie, eh?"].forEach((str, i) => {
            window.setTimeout(() => {
                setWords(str);
            }, i * 1000);
        });
    });
}
