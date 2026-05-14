import { describe, expect, it } from "vitest";
import { matchWildcard } from "../src/wildcard.js";

describe("Wildcard", () => {
	it("#given exact value #when matching exact pattern #then returns true", () => {
		expect(matchWildcard("read", "read")).toBe(true);
		expect(matchWildcard("read", "write")).toBe(false);
	});

	it("#given star pattern #when matching names #then spans any sequence", () => {
		expect(matchWildcard("anthropic-web-search", "anthropic-*")).toBe(true);
		expect(matchWildcard("read", "*")).toBe(true);
		expect(matchWildcard("", "*")).toBe(true);
	});

	it("#given question mark pattern #when matching names #then spans one character", () => {
		expect(matchWildcard("read", "rea?")).toBe(true);
		expect(matchWildcard("read", "re??")).toBe(true);
		expect(matchWildcard("read", "re???")).toBe(false);
	});

	it("#given mixed wildcard pattern #when backtracking is needed #then matches greedily but correctly", () => {
		expect(matchWildcard("hello-world-test", "hello*test")).toBe(true);
		expect(matchWildcard("hello-world-test", "hello?foo*")).toBe(false);
	});
});
