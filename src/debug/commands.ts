export type DebugCommand =
  | { type: "app.reload" }
  | { type: "scene.open"; sceneId: string }
  | { type: "layout.set"; enabled?: boolean; mode?: "layout" | "bounds"; filter?: "all" | "world" | "ui" }
  | { type: "sheet.open"; sheetId: string }
  | { type: "sheet.close" };

export type DebugCommandResult = {
  accepted: boolean;
  status: "accepted" | "ignored" | "unsupported";
  type: DebugCommand["type"];
  reason?: string;
};

type DebugCommandHandler = (command: DebugCommand) => DebugCommandResult | Promise<DebugCommandResult>;

let handler: DebugCommandHandler = defaultDebugCommandHandler;

export function dispatchDebugCommand(command: DebugCommand): DebugCommandResult | Promise<DebugCommandResult> {
  return handler(command);
}

export function setDebugCommandHandler(nextHandler: DebugCommandHandler): () => void {
  const previous = handler;
  handler = nextHandler;
  return () => {
    handler = previous;
  };
}

function defaultDebugCommandHandler(command: DebugCommand): DebugCommandResult {
  if (command.type === "app.reload") {
    window.location.reload();
    return {
      accepted: true,
      status: "accepted",
      type: command.type,
    };
  }

  return {
    accepted: false,
    status: "unsupported",
    type: command.type,
    reason: "No debug command handler is installed.",
  };
}
