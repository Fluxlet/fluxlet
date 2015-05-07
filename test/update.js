import { update } from "../src/utils.js";

describe("update", () => {

    const updateTest = update(['test'], "changed");

    var state;

    beforeEach(() => {
        state = {
            "key1": "one",
            "key2": "two",
            "keyObject": {
                "keyA": "here",
                "keyB": "there"
            },
            "keyArray": [
                "A",
                "B",
                "C",
                {
                    "deepKey": "ok"
                }
            ]
        };
    });

    it("accepts a value function", () => {
        var newState = update(["key1"], () => "changed")(state);
        expect(newState.key1).toBe("changed");
    });

    it("accepts a plain value", () => {
        var newState = update(["key1"], "changed")(state);
        expect(newState.key1).toBe("changed");
    });

    it("accepts a single segment string path", () => {
        var newState = update("key1", "changed")(state);
        expect(newState.key1).toBe("changed");
    });

    it("accepts a multiple segment string path", () => {
        var newState = update("keyArray.3.deepKey", "changed")(state);
        expect(newState.keyArray[3].deepKey).toBe("changed");
    });

    it("sets 1st level property and clones state given in single segment path", () => {
        var newState = update(["key1"], "changed")(state);
        expect(newState).not.toBe(state);
        expect(newState.key1).toBe("changed");
        expect(newState.keyObject).toBe(state.keyObject);
        expect(newState.keyArray).toBe(state.keyArray);
    });

    it("sets 2nd level property and clones ancestors given in two segment path", () => {
        var newState = update(["keyObject", "keyB"], "changed")(state);
        expect(newState).not.toBe(state);
        expect(newState.keyObject).not.toBe(state.keyObject);
        expect(newState.keyObject.keyA).toBe(state.keyObject.keyA);
        expect(newState.keyObject.keyB).toBe("changed");
    });

    it("sets deep property and clones ancestors", () => {
        var newState = update(["keyArray", 3, "deepKey"], "changed")(state);
        expect(newState).not.toBe(state);
        expect(newState.keyObject).toBe(state.keyObject);
        expect(newState.keyArray).not.toBe(state.keyArray);
        expect(newState.keyArray[0]).toBe(state.keyArray[0]);
        expect(newState.keyArray[3]).not.toBe(state.keyArray[3]);
        expect(newState.keyArray[3].deepKey).toBe("changed");
    });

    it("deletes a property given an undefined value", () => {
        var newState = update(["key1"], undefined)(state);
        expect(newState.key1).toBeUndefined();
        expect(newState.hasOwnProperty("key1")).toBe(false);
    });

    it("throws an error for an empty path", () => {
        expect(() => update([], "changed")(state)).toThrowError();
    });

    it("throws an error for a null state", () => {
        expect(() => updateTest(null)).toThrowError();
    });

    it("throws an error for an undefined state", () => {
        expect(() => updateTest(undefined)).toThrowError();
    });

    it("throws an error for a string state", () => {
        expect(() => updateTest("foo")).toThrowError();
    });

    it("throws an error for a number state", () => {
        expect(() => updateTest(10)).toThrowError();
    });

    it("throws an error for a boolean state", () => {
        expect(() => updateTest(true)).toThrowError();
    });

    it("to add missing object property", () => {
        expect(update(["nothere"], "added")({ "here": "this" }).nothere).toBe("added");
    });

    it("to add missing array item", () => {
        expect(update([3], "added")([ "zero", "one" ])[3]).toBe("added");
    });
});