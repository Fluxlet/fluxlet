import { update } from "../../src/utils";

// Actions

export function setWords(words) {
    return update("words", words);
}

// Calculations

export const countWords = {
    when: (state, prev) => state.words !== prev.words,
    then: state =>
        update("count", state.words.split(/\s+/).length)(state)
};

// Side Effects

export const renderWords = {
    when: (state, prev) => state.words !== prev.words,
    then: state => {
        document.getElementById("words").textContent = state.words;
    }
};

export const renderCount = {
    when: (state, prev) => state.count !== prev.count,
    then: state => {
        document.getElementById("count").textContent = state.count;
    }
};
