import { describe, expect, it } from "vitest";
import { Wildcard } from "../src/wildcard.js";

describe("Wildcard", () => {
	it("#given exact value #when matching exact pattern #then returns true", () => {
		expect(Wildcard.match("read", "read")).toBe(true);
		expect(Wildcard.match("read", "write")).toBe(false);
	});

	it("#given star pattern #when matching names #then spans any sequence", () => {
		expect(Wildcard.match("anthropic-web-search", "anthropic-*")).toBe(true);
		expect(Wildcard.match("read", "*")).toBe(true);
		expect(Wildcard.match("", "*")).toBe(true);
	});

	it("#given question mark pattern #when matching names #then spans one character", () => {
		expect(Wildcard.match("read", "rea?")).toBe(true);
		expect(Wildcard.match("read", "re??")).toBe(true);
		expect(Wildcard.match("read", "re???")).toBe(false);
	});

	it("#given mixed wildcard pattern #when backtracking is needed #then matches greedily but correctly", () => {
		expect(Wildcard.match("hello-world-test", "hello*test")).toBe(true);
		expect(Wildcard.match("hello-world-test", "hello?foo*")).toBe(false);
	});
});
