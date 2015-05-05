import defaultState from "./state";
import { given, when, then } from "../../src/testlet";

import { setWords } from "./words";

describe("setWords action", () => {

    beforeEach(() => {
        given
            .fluxlet()
            .state(defaultState)
            .actions({ setWords });
    });

    it("sets words to given arg", () => {
        given.state();

        when().setWords("one two three");

        then(state => {
            expect(state.words).toBe("one two three");
        });
    });
});
