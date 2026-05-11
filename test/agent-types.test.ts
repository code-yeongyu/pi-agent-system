import { describe, expect, it } from "vitest";
import { validateAgentConfig } from "../src/agent-types.js";

describe("validateAgentConfig", () => {
	it("#given valid frontmatter #when validating #then returns agent info with permission rules", () => {
		const result = validateAgentConfig(
			"reviewer",
			{
				description: "Review code",
				mode: "subagent",
				model: "gpt-5.1",
				temperature: 0.2,
				tools: {
					"*": "deny",
					read: "allow",
					bash: { "git diff*": "allow" },
				},
			},
			"Review carefully.",
		);

		expect(result).not.toBeInstanceOf(Error);
		if (result instanceof Error) throw result;
		expect(result).toMatchObject({
			name: "reviewer",
			description: "Review code",
			mode: "subagent",
			model: "gpt-5.1",
			temperature: 0.2,
			prompt: "Review carefully.",
			native: false,
		});
		expect(result.permission).toEqual([
			{ permission: "*", pattern: "*", action: "deny" },
			{ permission: "read", pattern: "*", action: "allow" },
			{ permission: "bash", pattern: "git diff*", action: "allow" },
		]);
	});

	it("#given invalid frontmatter #when validating #then returns an error", () => {
		const result = validateAgentConfig("bad", { temperature: 3 }, "");

		expect(result).toBeInstanceOf(Error);
		expect(String((result as Error).message)).toContain("Invalid agent config");
	});
});
