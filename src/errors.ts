export class AgentConfigValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentConfigValidationError";
	}
}
