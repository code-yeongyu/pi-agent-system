import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRegistry } from "../src/registry.js";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), "pi-agent-system-registry-"));
	tempDirs.push(dir);
	return dir;
}

describe("AgentRegistry", () => {
	it("#given no custom agents #when creating registry #then includes builtin agents", async () => {
		const dir = await makeTempDir();

		const registry = await createRegistry(dir);
		const general = registry.get("general");
		const explore = registry.get("explore");
		if (!general || !explore) {
			throw new Error("Expected builtin agents to be registered");
		}

		expect(general.name).toBe("general");
		expect(explore.name).toBe("explore");
		expect(registry.getAvailableAgentDescriptions()).toContain("explore");
	});

	it("#given custom agent matching builtin #when creating registry #then merges prompt and permissions", async () => {
		const dir = await makeTempDir();
		const agentsDir = path.join(dir, ".senpi", "agents");
		await mkdir(agentsDir, { recursive: true });
		await writeFile(
			path.join(agentsDir, "explore.md"),
			`---
description: Project explore
tools:
  bash: deny
---
Use project-specific exploration rules.`,
		);

		const registry = await createRegistry(dir);
		const explore = registry.get("explore");

		expect(explore?.description).toBe("Project explore");
		expect(explore?.prompt).toBe("Use project-specific exploration rules.");
		expect(explore?.permission).toContainEqual({ permission: "bash", pattern: "*", action: "deny" });
	});
});
