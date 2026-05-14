import { type Static, Type } from "typebox";
import { Compile } from "typebox/compile";
import { AgentConfigValidationError } from "./errors.js";
import { fromConfig } from "./permission.js";
import type { Action, PermissionConfig, Ruleset } from "./types.js";

export const AgentModeSchema = Type.Union([Type.Literal("subagent"), Type.Literal("primary"), Type.Literal("all")]);
export type AgentMode = Static<typeof AgentModeSchema>;

const ToolActionSchema = Type.Union([Type.Literal("allow"), Type.Literal("deny"), Type.Literal("ask")]);

const ToolPermissionValueSchema = Type.Union([ToolActionSchema, Type.Record(Type.String(), ToolActionSchema)]);

export const AgentFrontmatterSchema = Type.Object({
	description: Type.Optional(Type.String()),
	mode: Type.Optional(AgentModeSchema),
	model: Type.Optional(Type.String()),
	temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
	tools: Type.Optional(Type.Record(Type.String(), ToolPermissionValueSchema)),
	disable: Type.Optional(Type.Boolean()),
});
export type AgentFrontmatter = Static<typeof AgentFrontmatterSchema>;

const CompiledAgentFrontmatterSchema = Compile(AgentFrontmatterSchema);

export type AgentInfo = {
	name: string;
	description?: string;
	mode: AgentMode;
	model?: string;
	temperature?: number;
	prompt?: string;
	permission: Ruleset;
	native: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAction(value: unknown): value is Action {
	return value === "allow" || value === "deny" || value === "ask";
}

function normalizePermissionConfig(raw: unknown): PermissionConfig {
	if (!isRecord(raw)) {
		return {};
	}

	const config: PermissionConfig = {};
	for (const [permission, value] of Object.entries(raw)) {
		if (isAction(value)) {
			config[permission] = value;
			continue;
		}

		if (!isRecord(value)) {
			continue;
		}

		const patterns: Record<string, "allow" | "deny" | "ask"> = {};
		for (const [pattern, action] of Object.entries(value)) {
			if (isAction(action)) {
				patterns[pattern] = action;
			}
		}
		config[permission] = patterns;
	}

	return config;
}

function readAgentMode(value: unknown): AgentMode {
	return value === "subagent" || value === "primary" || value === "all" ? value : "all";
}

export function validateAgentConfig(
	name: string,
	frontmatter: unknown,
	body: string,
): AgentInfo | AgentConfigValidationError {
	const isValid = CompiledAgentFrontmatterSchema.Check(frontmatter);
	if (!isValid) {
		const errors = CompiledAgentFrontmatterSchema.Errors(frontmatter);
		const errorMessages = [];
		for (const error of errors) {
			errorMessages.push(`${error.instancePath}: ${error.message}`);
		}
		return new AgentConfigValidationError(`Invalid agent config: ${errorMessages.join(", ")}`);
	}

	const frontmatterRecord = isRecord(frontmatter) ? frontmatter : {};
	const description = typeof frontmatterRecord.description === "string" ? frontmatterRecord.description : undefined;
	const model = typeof frontmatterRecord.model === "string" ? frontmatterRecord.model : undefined;
	const temperature = typeof frontmatterRecord.temperature === "number" ? frontmatterRecord.temperature : undefined;

	const agentInfo: AgentInfo = {
		name,
		description,
		mode: readAgentMode(frontmatterRecord.mode),
		model,
		temperature,
		prompt: body,
		permission: fromConfig(normalizePermissionConfig(frontmatterRecord.tools)),
		native: false,
	};

	return agentInfo;
}
