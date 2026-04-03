/**
 * opencode-plugin-coding — OpenCode plugin for multi-agent coding workflows.
 *
 * Registers skills, commands, and agents dynamically via the config hook.
 * Agents are registered from workflow.json + guide files — no .opencode/agents/*.md needed.
 * Install: add to "plugin" array in opencode.json (global or project).
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "../..");

// Simple frontmatter extraction (no external dependencies)
export const extractFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      meta[key] = value;
    }
  }
  return { meta, body: match[2] };
};

// Load all command .md files from commands/ and register them via config
export const loadCommands = () => {
  const commandsDir = path.join(pluginRoot, "commands");
  if (!fs.existsSync(commandsDir)) return {};

  const commands = {};
  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith(".md")) continue;
    const name = file.replace(/\.md$/, "");
    const content = fs.readFileSync(path.join(commandsDir, file), "utf8");
    const { meta, body } = extractFrontmatter(content);

    commands[name] = {
      description: meta.description || `Run /${name}`,
      template: body.trim(),
    };
    if (meta.agent) commands[name].agent = meta.agent;
    if (meta.model) commands[name].model = meta.model;
  }
  return commands;
};

// Read a guide file and return its content as a prompt string
export const readGuide = (filename) => {
  const guidePath = path.join(pluginRoot, "guides", filename);
  if (!fs.existsSync(guidePath)) return "";
  return fs.readFileSync(guidePath, "utf8").trim();
};

// Read workflow.json from the project directory
export const readWorkflowJson = (directory) => {
  const workflowPath = path.join(directory, ".opencode", "workflow.json");
  if (!fs.existsSync(workflowPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  } catch {
    return null;
  }
};

// Read workflow-local.json (gitignored, user-specific overrides)
export const readWorkflowLocalJson = (directory) => {
  const localPath = path.join(directory, ".opencode", "workflow-local.json");
  if (!fs.existsSync(localPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(localPath, "utf8"));
  } catch {
    return null;
  }
};

// Agent role definitions: guide file (default = -github variant), description, and permissions.
// The registerAgents function selects the correct platform variant at registration time.
const AGENT_ROLES = {
  coreCoder: {
    guide: "core-coder-guide-github.md",
    description:
      "Core implementation agent — executes plans, writes code, runs verification, creates PRs.",
    permission: {
      edit: "allow",
      bash: { "*": "allow" },
      read: "allow",
      webfetch: "allow",
    },
  },
  coreReviewer: {
    guide: "core-reviewer-guide-github.md",
    description:
      "Core code reviewer (blocking) — full verification in worktree, reviews all areas.",
    permission: {
      edit: "deny",
      bash: { "*": "allow" },
      read: "allow",
      webfetch: "deny",
    },
  },
  reviewer: {
    guide: "reviewer-guide-github.md",
    description:
      "Code reviewer (non-blocking) — diff-based review on assigned areas.",
    permission: {
      edit: "deny",
      bash: {
        "*": "deny",
        "gh api *": "allow",
        "gh pr diff *": "allow",
        "gh pr view *": "allow",
        "gh pr checks *": "allow",
        "git diff *": "allow",
        "git log *": "allow",
        "git fetch *": "allow",
      },
      read: "allow",
      webfetch: "deny",
    },
  },
  securityReviewer: {
    guide: "security-reviewer-guide-github.md",
    description: "Security reviewer — pre-merge security analysis.",
    permission: {
      edit: "deny",
      bash: {
        "*": "deny",
        "gh api *": "allow",
        "gh pr diff *": "allow",
        "gh pr view *": "allow",
        "gh pr checks *": "allow",
        "git diff *": "allow",
        "git log *": "allow",
        "git fetch *": "allow",
      },
      read: "allow",
      webfetch: "deny",
    },
  },
};

// Map workflow.json agent fields to their role key
const FIELD_TO_ROLE = {
  coreCoder: "coreCoder",
  coreReviewers: "coreReviewer",
  reviewers: "reviewer",
  securityReviewers: "securityReviewer",
};

// Default step limits per role (overridable per-agent via workflow.json `steps` field)
const ROLE_STEP_DEFAULTS = {
  reviewer: 80,
  securityReviewer: 120,
};

// Build a GitHub account prompt suffix for agents that have an assigned account.
// Uses inline GH_TOKEN per-command to avoid concurrent agent conflicts on shared gh config.
export const buildGithubAccountPrompt = (account) =>
  `\n\n## GitHub Account\n\nYou are operating as GitHub user \`${account}\`. **Every** \`gh\` command you run must be prefixed with an inline token to avoid conflicts with other concurrent agents:\n\`\`\`sh\nGH_TOKEN=$(gh auth token --user ${account}) gh <subcommand> ...\n\`\`\`\nNever use \`gh auth switch\`. Always use the inline \`GH_TOKEN=...\` prefix pattern shown above.`;

// Detect the platform from workflow.json: explicit > auto-detect from project.repo > default "github"
export const detectPlatform = (workflow) => {
  const explicit = workflow?.project?.platform;
  if (explicit === "github" || explicit === "local") return explicit;
  const repo = workflow?.project?.repo || "";
  if (repo.includes("github.com")) return "github";
  // Check GitHub Enterprise custom domains
  const gheHosts = workflow?.project?.githubEnterpriseHosts;
  if (Array.isArray(gheHosts)) {
    for (const host of gheHosts) {
      if (typeof host === "string" && host && repo.includes(host)) return "github";
    }
  }
  return "local";
};

// Register agents from workflow.json into cfg.agent
export const registerAgents = (config, directory) => {
  const workflow = readWorkflowJson(directory);
  if (!workflow?.agents) return;

  const local = readWorkflowLocalJson(directory);
  const githubAccountConfig = local?.github?.account || {};

  // Select platform-specific guide variant
  const platform = detectPlatform(workflow);
  const guideSuffix = platform === "local" ? "-local" : "-github";

  config.agent = config.agent || {};

  for (const [field, roleKey] of Object.entries(FIELD_TO_ROLE)) {
    const role = AGENT_ROLES[roleKey];

    // Try platform-specific guide variant first, fall back to role default (github)
    const guideBase = role.guide.replace(/-github\.md$/, "");
    const variantGuide = `${guideBase}${guideSuffix}.md`;
    const basePrompt = readGuide(variantGuide) || readGuide(role.guide);

    const entries = workflow.agents[field];
    if (!entries) continue;

    // Normalize: coreCoder is a single object, others are arrays
    const agentList = Array.isArray(entries) ? entries : [entries];

    // Resolve GitHub account for this role: roleKey > default > none
    const githubAccount =
      githubAccountConfig[roleKey] ||
      githubAccountConfig.default ||
      null;

    for (const agent of agentList) {
      // Support both { name, model } objects and bare strings (backward compat)
      const name = typeof agent === "string" ? agent : agent.name;
      const model = typeof agent === "string" ? undefined : agent.model;

      if (!name) continue;

      // Don't override user-defined agents
      if (config.agent[name]) continue;

      const prompt = githubAccount
        ? basePrompt + buildGithubAccountPrompt(githubAccount)
        : basePrompt;

      const agentConfig = {
        description: role.description,
        mode: "subagent",
        prompt,
        permission: role.permission,
      };

      // Only set model if explicitly provided (non-empty)
      if (model) {
        agentConfig.model = model;
      }

      // Apply steps: use per-agent value from workflow.json if present, else role default
      const agentSteps =
        typeof agent === "object" && agent.steps != null
          ? agent.steps
          : ROLE_STEP_DEFAULTS[roleKey];
      if (agentSteps != null) {
        agentConfig.steps = agentSteps;
      }

      config.agent[name] = agentConfig;
    }
  }
};

export const ZooplanktonCodingPlugin = async ({ directory }) => {
  const skillsDir = path.join(pluginRoot, "skills");

  return {
    config: async (config) => {
      // Skills — add our skills/ directory to discovery paths
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }

      // Commands — register from commands/*.md
      config.command = config.command || {};
      const pluginCommands = loadCommands();
      for (const [name, cmd] of Object.entries(pluginCommands)) {
        if (!config.command[name]) {
          config.command[name] = cmd;
        }
      }

      // Agents — register from workflow.json + guide files
      registerAgents(config, directory);
    },
  };
};
