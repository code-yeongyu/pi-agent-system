import { afterEach, describe, expect, it, vi } from "vitest";
import agentSystemExtension from "../src/index.js";

type Handler = (event: Record<string, unknown>, ctx: { cwd: string }) => Promise<unknown> | unknown;

type MockPi = {
	on: ReturnType<typeof vi.fn<(event: string, handler: Handler) => void>>;
	getAllTools: ReturnType<typeof vi.fn<() => { name: string; description: string; parameters: unknown }[]>>;
	setActiveTools: ReturnType<typeof vi.fn<(tools: string[]) => void>>;
	handlers: Map<string, Handler>;
};

function createMockPi(): MockPi {
	const handlers = new Map<string, Handler>();
	return {
		handlers,
		on: vi.fn((event: string, handler: Handler) => {
			handlers.set(event, handler);
		}),
		getAllTools: vi.fn(() => [
			{ name: "read", description: "Read", parameters: {} },
			{ name: "bash", description: "Bash", parameters: {} },
			{ name: "write", description: "Write", parameters: {} },
			{ name: "task", description: "Task", parameters: {} },
		]),
		setActiveTools: vi.fn(),
	};
}

function registerExtension(pi: MockPi): void {
	agentSystemExtension(pi as unknown as Parameters<typeof agentSystemExtension>[0]);
}

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("agentSystemExtension", () => {
	it("#given no agent type env #when registering extension #then it stays inactive", () => {
		const pi = createMockPi();

		registerExtension(pi);

		expect(pi.on).not.toHaveBeenCalled();
	});

	it("#given explore agent type #when session starts #then read-only tools are active", async () => {
		vi.stubEnv("SANEPI_AGENT_TYPE", "explore");
		const pi = createMockPi();
		registerExtension(pi);

		await pi.handlers.get("session_start")?.({ type: "session_start" }, { cwd: process.cwd() });

		expect(pi.setActiveTools).toHaveBeenCalledWith(["read", "bash"]);
	});

	it("#given prompt agent #when before agent start fires #then appends agent prompt", async () => {
		vi.stubEnv("SANEPI_AGENT_TYPE", "explore");
		const pi = createMockPi();
		registerExtension(pi);

		await pi.handlers.get("session_start")?.({ type: "session_start" }, { cwd: process.cwd() });
		const result = await pi.handlers.get("before_agent_start")?.(
			{ type: "before_agent_start", prompt: "find files", systemPrompt: "Base" },
			{ cwd: process.cwd() },
		);

		expect(result).toEqual({
			systemPrompt: expect.stringContaining("Base\n\nYou are a file search specialist"),
		});
	});
});
