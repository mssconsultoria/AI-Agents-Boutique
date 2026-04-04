import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  ConnectorCatalogResponse,
  ConnectorId,
  ConnectorStatus,
  ExecuteConnectorRequest,
  ExecuteConnectorResponse,
  TerminalBridgeStatus,
} from "../src/lib/connector-types.js";

const DEFAULT_CWD = process.cwd();
const COMMAND_TIMEOUT_MS = Number(process.env.AGENT_CONNECTOR_TIMEOUT_MS ?? 120000);
const TERMINAL_APP = process.env.MAC_TERMINAL_APP?.trim() || "Terminal";

interface ConnectorDefinition {
  id: ConnectorId;
  label: string;
  description: string;
  binary?: string;
  commandTemplateEnv?: string;
}

const CONNECTORS: ConnectorDefinition[] = [
  {
    id: "codex",
    label: "Codex CLI",
    description: "Executa tarefas não interativas com o Codex ou abre uma sessão real no Terminal do macOS.",
    binary: "codex",
  },
  {
    id: "openclaw",
    label: "OpenClaw",
    description: "Conector configurável para um runner do OpenClaw via template de comando local.",
    binary: "openclaw",
    commandTemplateEnv: "OPENCLAW_COMMAND_TEMPLATE",
  },
  {
    id: "hermes",
    label: "Hermes",
    description: "Conector configurável para um runner do Hermes via template de comando local.",
    binary: "hermes",
    commandTemplateEnv: "HERMES_COMMAND_TEMPLATE",
  },
];

function escapeShell(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function escapeAppleScript(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function detectBinary(binary: string) {
  const result = spawnSync("/bin/zsh", ["-lc", `command -v ${binary}`], {
    encoding: "utf8",
  });

  if (result.status === 0) {
    return result.stdout.trim();
  }

  return "";
}

function getTerminalStatus(): TerminalBridgeStatus {
  const pathToBinary = detectBinary("osascript");
  return {
    available: Boolean(pathToBinary),
    appName: TERMINAL_APP,
    detection: pathToBinary
      ? `AppleScript bridge available via ${pathToBinary}`
      : "osascript not found on this machine",
  };
}

function getConnectorStatus(definition: ConnectorDefinition): ConnectorStatus {
  const detectedBinary = definition.binary ? detectBinary(definition.binary) : "";
  const configuredTemplate = definition.commandTemplateEnv
    ? process.env[definition.commandTemplateEnv]?.trim()
    : "";
  const terminal = getTerminalStatus();

  const directAvailable =
    definition.id === "codex" ? Boolean(detectedBinary) : Boolean(configuredTemplate);
  const terminalAvailable =
    terminal.available &&
    (definition.id === "codex" ? Boolean(detectedBinary) : Boolean(configuredTemplate));

  let detection = "No local runner detected.";
  if (definition.id === "codex" && detectedBinary) {
    detection = `Detected ${definition.label} at ${detectedBinary}.`;
  } else if (configuredTemplate) {
    detection = `Configured via ${definition.commandTemplateEnv}.`;
  } else if (detectedBinary) {
    detection = `Detected binary at ${detectedBinary}, but a command template is still recommended.`;
  }

  const setupHint =
    definition.id === "codex"
      ? "Codex is ready for direct runs and Terminal launch."
      : `Set ${definition.commandTemplateEnv} with placeholders like {prompt}, {cwd}, and {promptFile}.`;

  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    available: directAvailable || terminalAvailable,
    directAvailable,
    terminalAvailable,
    detection,
    setupHint,
  };
}

export function getConnectorCatalog(): ConnectorCatalogResponse {
  return {
    connectors: CONNECTORS.map(getConnectorStatus),
    terminal: getTerminalStatus(),
  };
}

async function runProcess(
  command: string,
  cwd: string,
): Promise<{ ok: boolean; output: string; error: string }> {
  return new Promise((resolve) => {
    const child = spawn("/bin/zsh", ["-lc", command], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        ok: false,
        output: stdout.trim(),
        error: `Timed out after ${COMMAND_TIMEOUT_MS}ms.`,
      });
    }, COMMAND_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        ok: code === 0,
        output: stdout.trim(),
        error: stderr.trim(),
      });
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        ok: false,
        output: stdout.trim(),
        error: error.message,
      });
    });
  });
}

async function withPromptFile(prompt: string, callback: (promptFile: string) => Promise<ExecuteConnectorResponse>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "foundry-connectors-"));
  const promptFile = path.join(dir, "prompt.txt");
  await writeFile(promptFile, prompt, "utf8");

  try {
    return await callback(promptFile);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function formatTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

async function openInMacTerminal(command: string) {
  const script =
    TERMINAL_APP.toLowerCase() === "iterm"
      ? [
          'tell application "iTerm"',
          "activate",
          'create window with default profile command "' + escapeAppleScript(command) + '"',
          "end tell",
        ]
      : [
          'tell application "Terminal"',
          "activate",
          'do script "' + escapeAppleScript(command) + '"',
          "end tell",
        ];

  const args = script.flatMap((line) => ["-e", line]);
  const result = spawnSync("osascript", args, {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Failed to open Terminal.");
  }
}

async function runCodex(request: ExecuteConnectorRequest): Promise<ExecuteConnectorResponse> {
  const cwd = request.cwd || DEFAULT_CWD;

  if (request.mode === "terminal") {
    const command = `cd ${escapeShell(cwd)} && codex --no-alt-screen ${escapeShell(request.prompt)}`;
    await openInMacTerminal(command);
    return {
      ok: true,
      connectorId: "codex",
      mode: "terminal",
      launched: true,
      commandPreview: command,
      output: `Opened ${TERMINAL_APP} with a live Codex session.`,
    };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "foundry-codex-"));
  const outputFile = path.join(tempDir, "last-message.txt");
  const command = [
    "codex",
    "-a",
    "never",
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
    "-s",
    "read-only",
    "-C",
    escapeShell(cwd),
    "-o",
    escapeShell(outputFile),
    escapeShell(request.prompt),
  ].join(" ");

  try {
    const result = await runProcess(command, cwd);
    const output = result.ok ? (await readFile(outputFile, "utf8").catch(() => result.output)).trim() : "";

    return {
      ok: result.ok,
      connectorId: "codex",
      mode: "direct",
      commandPreview: command,
      output,
      error: result.ok ? undefined : result.error || result.output || "Codex command failed.",
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runTemplateConnector(
  request: ExecuteConnectorRequest,
  definition: ConnectorDefinition,
): Promise<ExecuteConnectorResponse> {
  const template = definition.commandTemplateEnv
    ? process.env[definition.commandTemplateEnv]?.trim()
    : "";
  const cwd = request.cwd || DEFAULT_CWD;

  if (!template) {
    return {
      ok: false,
      connectorId: definition.id,
      mode: request.mode,
      commandPreview: "",
      error: `Configure ${definition.commandTemplateEnv} before using ${definition.label}.`,
    };
  }

  return withPromptFile(request.prompt, async (promptFile) => {
    const command = formatTemplate(template, {
      cwd,
      prompt: request.prompt,
      promptFile,
      title: request.title,
    });

    if (request.mode === "terminal") {
      await openInMacTerminal(`cd ${escapeShell(cwd)} && ${command}`);
      return {
        ok: true,
        connectorId: definition.id,
        mode: "terminal",
        launched: true,
        commandPreview: command,
        output: `Opened ${TERMINAL_APP} with ${definition.label}.`,
      };
    }

    const result = await runProcess(command, cwd);
    return {
      ok: result.ok,
      connectorId: definition.id,
      mode: "direct",
      commandPreview: command,
      output: result.output,
      error: result.ok ? undefined : result.error || "Command failed.",
    };
  });
}

export async function executeConnectorRequest(
  request: ExecuteConnectorRequest,
): Promise<ExecuteConnectorResponse> {
  const definition = CONNECTORS.find((connector) => connector.id === request.connectorId);
  if (!definition) {
    return {
      ok: false,
      connectorId: request.connectorId,
      mode: request.mode,
      commandPreview: "",
      error: "Unknown connector.",
    };
  }

  if (request.mode === "terminal" && !getTerminalStatus().available) {
    return {
      ok: false,
      connectorId: request.connectorId,
      mode: request.mode,
      commandPreview: "",
      error: "Terminal bridge is unavailable on this Mac.",
    };
  }

  if (definition.id === "codex") {
    return runCodex(request);
  }

  return runTemplateConnector(request, definition);
}
