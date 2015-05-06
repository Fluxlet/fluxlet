import fluxlet from "../../src/fluxlet";
import initialState from "./state";
import { setWords, countWords, renderWords, renderCount } from "./words";

export default function() {
    fluxlet("words")
        .state(initialState)
        .actions({ setWords })
        .calculations({ countWords })
        .sideEffects({ renderWords, renderCount })
        .init(bindReady);
}

function bindReady({ setWords }) {
    document.addEventListener("DOMContentLoaded", function() {
        ["fluxlet example", "counts words", "counts words", "easy as pie, eh?"].forEach((str, i) => {
            window.setTimeout(() => {
                setWords(str);
            }, i * 1000);
        });
    });
}
