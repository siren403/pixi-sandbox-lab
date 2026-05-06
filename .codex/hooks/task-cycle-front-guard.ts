type HookInput = {
  cwd?: string;
  hook_event_name?: string;
  session_id?: string;
  model?: string;
};

const stdin = await Bun.stdin.text();
let input: HookInput = {};

if (stdin.trim()) {
  try {
    input = JSON.parse(stdin) as HookInput;
  } catch {
    outputWarning("Codex task-cycle front guard received invalid JSON input.");
    process.exit(0);
  }
}

const event = input.hook_event_name || "UserPromptSubmit";
const cadence =
  event === "SessionStart"
    ? "This reminder runs at session start only; PreToolUse handles write-time warnings."
    : "This reminder runs before handling the submitted user prompt.";

outputWarning(`Task cycle reminder.

For non-trivial work, harness spec changes, multi-file edits, runtime/framework changes, commits, or deployment:
task-plan -> user approval -> task-start -> active-task manifest -> implementation -> validation -> task-end.

Do not start file edits or commits from a reviewed plan until the user has approved the final plan.

${cadence}`);

function outputWarning(message: string) {
  console.log(JSON.stringify({
    continue: true,
    systemMessage: message,
  }));
}
