import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { AgentInfo } from "./agent-types.js";
import { AGENT_TYPE_ENV_VARS } from "./constants.js";
import { loadAgentDefaultPermissions } from "./loader.js";
import { evaluate, merge } from "./permission.js";
import { createRegistry } from "./registry.js";

function getAgentType(): string | undefined {
	for (const envVar of AGENT_TYPE_ENV_VARS) {
		const value = process.env[envVar];
		if (value) return value;
	}
	return undefined;
}

export default function agentSystemExtension(pi: ExtensionAPI): void {
	const agentType = getAgentType();
	if (!agentType) return;

	let agentInfo: AgentInfo | undefined;

	pi.on("session_start", async (_event, ctx) => {
		const registry = await createRegistry(ctx.cwd);
		const resolved = registry.get(agentType);
		if (!resolved) {
			process.stderr.write(
				`[pi-agent-system] Unknown agent type: "${agentType}". ${registry.getAvailableAgentDescriptions()}\n`,
			);
			return;
		}

		const defaultPermissions = await loadAgentDefaultPermissions(ctx.cwd);
		agentInfo = {
			...resolved,
			permission: merge(defaultPermissions, resolved.permission),
		};

		const allowedTools = pi
			.getAllTools()
			.filter((tool) => evaluate(tool.name, "*", agentInfo?.permission ?? []).action !== "deny")
			.map((tool) => tool.name);
		pi.setActiveTools(allowedTools);
	});

	pi.on("before_agent_start", async (event) => {
		if (!agentInfo?.prompt) return undefined;
		return {
			systemPrompt: `${event.systemPrompt}\n\n${agentInfo.prompt}`,
		};
	});
}

export type { AgentFrontmatter, AgentInfo, AgentMode } from "./agent-types.js";
export { BUILTIN_AGENTS } from "./builtin-agents.js";
export { loadAgentDefaultPermissions, loadAgentsFromDirectory, loadAllAgents } from "./loader.js";
export { evaluate, fromConfig, merge } from "./permission.js";
export { AgentRegistry, createRegistry } from "./registry.js";
export type { Action, PermissionConfig, Rule, Ruleset } from "./types.js";
export { Wildcard } from "./wildcard.js";
