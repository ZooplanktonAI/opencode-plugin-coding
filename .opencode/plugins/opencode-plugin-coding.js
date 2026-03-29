/**
 * opencode-plugin-coding — OpenCode plugin for multi-agent coding workflows.
 *
 * Registers skills and commands without symlinks.
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
    // Forward optional fields if present
    if (meta.agent) commands[name].agent = meta.agent;
    if (meta.model) commands[name].model = meta.model;
  }
  return commands;
};

export const CodingPlugin = async ({ directory }) => {
  const skillsDir = path.join(pluginRoot, "skills");

  return {
    // Register skills path and commands into live config
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
        // Don't override user-defined commands
        if (!config.command[name]) {
          config.command[name] = cmd;
        }
      }
    },
  };
};
