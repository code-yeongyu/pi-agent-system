import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { type AgentInfo, validateAgentConfig } from "./agent-types.js";
import { AGENT_SUBDIRECTORIES, CONFIG_DIR_NAMES } from "./constants.js";
import { parseFrontmatter } from "./frontmatter.js";
import { fromConfig, merge } from "./permission.js";
import type { PermissionConfig, Ruleset } from "./types.js";

type ConfigLocation = {
	dir: string;
	scope: "global" | "project";
};

type SettingsWithAgentDefaults = {
	agentDefaults?: {
		permission?: PermissionConfig;
	};
};

function getConfigLocations(cwd: string, homeDir: string): ConfigLocation[] {
	return [
		...CONFIG_DIR_NAMES.map((configDirName) => ({
			dir: path.join(homeDir, configDirName, "agent"),
			scope: "global" as const,
		})),
		...CONFIG_DIR_NAMES.map((configDirName) => ({
			dir: path.join(cwd, configDirName),
			scope: "project" as const,
		})),
	];
}

async function scanDir(dir: string, files: string[]): Promise<void> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await scanDir(fullPath, files);
		} else if (entry.name.endsWith(".md")) {
			files.push(fullPath);
		}
	}
}

async function scanMarkdownFiles(baseDir: string): Promise<string[]> {
	const files: string[] = [];
	for (const subdir of AGENT_SUBDIRECTORIES) {
		const dir = path.join(baseDir, subdir);
		try {
			await scanDir(dir, files);
		} catch {
			// Directory does not exist or is unreadable. Missing config dirs are expected.
		}
	}
	return files;
}

export async function loadAgentsFromDirectory(dir: string): Promise<Record<string, AgentInfo>> {
	const agents: Record<string, AgentInfo> = {};
	const files = await scanMarkdownFiles(dir);

	for (const file of files) {
		const name = path.basename(file, ".md");
		try {
			const content = await fs.readFile(file, "utf-8");
			const { frontmatter, body } = parseFrontmatter(content);
			const result = validateAgentConfig(name, frontmatter, body);
			if (result instanceof Error) {
				process.stderr.write(`Warning: skipping agent "${name}" from ${file}: ${result.message}\n`);
				continue;
			}
			agents[name] = result;
		} catch (error) {
			const message = error instanceof Error ? error.message : "unknown error";
			process.stderr.write(`Warning: failed to load agent "${name}" from ${file}: ${message}\n`);
		}
	}

	return agents;
}

export async function loadAllAgents(cwd: string, homeDir: string = os.homedir()): Promise<Record<string, AgentInfo>> {
	const agents: Record<string, AgentInfo> = {};
	for (const location of getConfigLocations(cwd, homeDir)) {
		Object.assign(agents, await loadAgentsFromDirectory(location.dir));
	}
	return agents;
}

async function loadSettingsFile(settingsPath: string): Promise<SettingsWithAgentDefaults> {
	try {
		const content = await fs.readFile(settingsPath, "utf-8");
		const parsed: unknown = JSON.parse(content);
		if (!isSettingsWithAgentDefaults(parsed)) {
			return {};
		}
		return parsed;
	} catch {
		return {};
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAction(value: unknown): value is "allow" | "deny" | "ask" {
	return value === "allow" || value === "deny" || value === "ask";
}

function isPermissionConfig(value: unknown): value is PermissionConfig {
	if (!isRecord(value)) {
		return false;
	}
	for (const entryValue of Object.values(value)) {
		if (isAction(entryValue)) {
			continue;
		}
		if (!isRecord(entryValue) || !Object.values(entryValue).every(isAction)) {
			return false;
		}
	}
	return true;
}

function isSettingsWithAgentDefaults(value: unknown): value is SettingsWithAgentDefaults {
	if (!isRecord(value)) {
		return false;
	}
	if (value.agentDefaults === undefined) {
		return true;
	}
	if (!isRecord(value.agentDefaults)) {
		return false;
	}
	return value.agentDefaults.permission === undefined || isPermissionConfig(value.agentDefaults.permission);
}

export async function loadAgentDefaultPermissions(cwd: string, homeDir: string = os.homedir()): Promise<Ruleset> {
	const rulesets: Ruleset[] = [];
	for (const location of getConfigLocations(cwd, homeDir)) {
		const settings = await loadSettingsFile(path.join(location.dir, "settings.json"));
		rulesets.push(fromConfig(settings.agentDefaults?.permission ?? {}));
	}
	return merge(...rulesets);
}
