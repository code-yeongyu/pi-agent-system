import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadAgentDefaultPermissions, loadAgentsFromDirectory, loadAllAgents } from "../src/loader.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
	const dir = await mkdtemp(path.join(os.tmpdir(), "pi-agent-system-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("agent loader", () => {
	it("#given markdown agent file #when loading directory #then parses frontmatter and prompt", async () => {
		const dir = await makeTempDir();
		const agentsDir = path.join(dir, "agents");
		await mkdir(agentsDir, { recursive: true });
		await writeFile(
			path.join(agentsDir, "reviewer.md"),
			`---
description: Reviews code
mode: subagent
tools:
  "*": deny
  read: allow
---
Review code changes.`,
		);

		const agents = await loadAgentsFromDirectory(dir);

		expect(agents.reviewer?.description).toBe("Reviews code");
		expect(agents.reviewer?.prompt).toBe("Review code changes.");
		expect(agents.reviewer?.permission).toContainEqual({ permission: "read", pattern: "*", action: "allow" });
	});

	it("#given pi and senpi config trees #when loading all agents #then project senpi overrides earlier definitions", async () => {
		const root = await makeTempDir();
		const home = path.join(root, "home");
		const cwd = path.join(root, "project");
		await mkdir(path.join(home, ".pi", "agent", "agents"), { recursive: true });
		await mkdir(path.join(cwd, ".senpi", "agents"), { recursive: true });
		await writeFile(path.join(home, ".pi", "agent", "agents", "same.md"), "---\ndescription: Global\n---\nGlobal");
		await writeFile(path.join(cwd, ".senpi", "agents", "same.md"), "---\ndescription: Project\n---\nProject");

		const agents = await loadAllAgents(cwd, home);

		expect(agents.same?.description).toBe("Project");
		expect(agents.same?.prompt).toBe("Project");
	});

	it("#given settings files #when loading default permissions #then later project settings win by rule order", async () => {
		const root = await makeTempDir();
		const home = path.join(root, "home");
		const cwd = path.join(root, "project");
		await mkdir(path.join(home, ".pi", "agent"), { recursive: true });
		await mkdir(path.join(cwd, ".senpi"), { recursive: true });
		await writeFile(
			path.join(home, ".pi", "agent", "settings.json"),
			JSON.stringify({ agentDefaults: { permission: { bash: "deny" } } }),
		);
		await writeFile(
			path.join(cwd, ".senpi", "settings.json"),
			JSON.stringify({ agentDefaults: { permission: { read: "allow" } } }),
		);

		const permissions = await loadAgentDefaultPermissions(cwd, home);

		expect(permissions).toEqual([
			{ permission: "bash", pattern: "*", action: "deny" },
			{ permission: "read", pattern: "*", action: "allow" },
		]);
		await expect(readFile(path.join(cwd, ".senpi", "settings.json"), "utf-8")).resolves.toContain("agentDefaults");
	});
});
