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
const extractFrontmatter = (content) => {
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
const loadCommands = () => {
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
const readGuide = (filename) => {
  const guidePath = path.join(pluginRoot, "guides", filename);
  if (!fs.existsSync(guidePath)) return "";
  return fs.readFileSync(guidePath, "utf8").trim();
};

// Read workflow.json from the project directory
const readWorkflowJson = (directory) => {
  const workflowPath = path.join(directory, ".opencode", "workflow.json");
  if (!fs.existsSync(workflowPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  } catch {
    return null;
  }
};

// Read workflow-local.json (gitignored, user-specific overrides)
const readWorkflowLocalJson = (directory) => {
  const localPath = path.join(directory, ".opencode", "workflow-local.json");
  if (!fs.existsSync(localPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(localPath, "utf8"));
  } catch {
    return null;
  }
};

// Map agent roles to github.account keys in workflow-local.json
// Resolution: per-role key (e.g. "coreCoder") > "default" > none
const ROLE_TO_ACCOUNT_KEY = {
  coreCoder: "coreCoder",
  coreReviewer: "coreReviewers",
  reviewer: "reviewers",
  securityReviewer: "securityReviewers",
};

// Agent role definitions: guide file, description, and permissions
const AGENT_ROLES = {
  coreCoder: {
    guide: "core-coder-guide.md",
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
    guide: "core-reviewer-guide.md",
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
    guide: "reviewer-guide.md",
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
      },
      read: "allow",
      webfetch: "deny",
    },
  },
  securityReviewer: {
    guide: "security-reviewer-guide.md",
    description: "Security reviewer — pre-merge security analysis.",
    permission: {
      edit: "deny",
      bash: {
        "*": "deny",
        "gh api *": "allow",
        "gh pr diff *": "allow",
        "gh pr view *": "allow",
        "gh pr checks *": "allow",
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
const buildGithubAccountPrompt = (account) =>
  `\n\n## GitHub Account\n\nYou are operating as GitHub user \`${account}\`. **Every** \`gh\` command you run must be prefixed with an inline token to avoid conflicts with other concurrent agents:\n\`\`\`sh\nGH_TOKEN=$(gh auth token --user ${account}) gh <subcommand> ...\n\`\`\`\nNever use \`gh auth switch\`. Always use the inline \`GH_TOKEN=...\` prefix pattern shown above.`;

// Register agents from workflow.json into cfg.agent
const registerAgents = (config, directory) => {
  const workflow = readWorkflowJson(directory);
  if (!workflow?.agents) return;

  const local = readWorkflowLocalJson(directory);
  const githubAccountConfig = local?.github?.account || {};

  config.agent = config.agent || {};

  for (const [field, roleKey] of Object.entries(FIELD_TO_ROLE)) {
    const role = AGENT_ROLES[roleKey];
    const basePrompt = readGuide(role.guide);
    const entries = workflow.agents[field];
    if (!entries) continue;

    // Normalize: coreCoder is a single object, others are arrays
    const agentList = Array.isArray(entries) ? entries : [entries];

    // Resolve GitHub account for this role: per-role key > default > none
    const accountKey = ROLE_TO_ACCOUNT_KEY[roleKey];
    const githubAccount =
      (accountKey && githubAccountConfig[accountKey]) ||
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
