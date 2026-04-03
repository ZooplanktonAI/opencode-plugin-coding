/**
 * Unit tests for opencode-plugin-coding.js
 *
 * Uses Node.js built-in test runner (node:test + node:assert). Zero new dependencies.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import {
  extractFrontmatter,
  buildGithubAccountPrompt,
  loadCommands,
  readGuide,
  readWorkflowJson,
  readWorkflowLocalJson,
  registerAgents,
  ZooplanktonCodingPlugin,
} from "../.opencode/plugins/opencode-plugin-coding.js";

/** Create a unique temporary directory and return its path. */
const makeTmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "plugin-test-"));

/** Write a file inside a temp dir, creating intermediate directories as needed. */
const writeFixture = (dir, relativePath, content) => {
  const full = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  return full;
};

describe("extractFrontmatter", () => {
  it("returns original content when no frontmatter present", () => {
    const input = "Hello world\nNo frontmatter here.";
    const { meta, body } = extractFrontmatter(input);
    assert.deepStrictEqual(meta, {});
    assert.equal(body, input);
  });

  it("parses valid frontmatter into meta keys and body", () => {
    const input = "---\ntitle: My Title\nauthor: Jane\n---\nBody content here.";
    const { meta, body } = extractFrontmatter(input);
    assert.equal(meta.title, "My Title");
    assert.equal(meta.author, "Jane");
    assert.equal(body, "Body content here.");
  });

  it("strips surrounding quotes from values", () => {
    const input = '---\nname: "quoted value"\nother: \'single quoted\'\n---\nBody';
    const { meta } = extractFrontmatter(input);
    assert.equal(meta.name, "quoted value");
    assert.equal(meta.other, "single quoted");
  });

  it("splits only on first colon (colon in value)", () => {
    const input = "---\ndescription: key: value pair\n---\nBody";
    const { meta } = extractFrontmatter(input);
    assert.equal(meta.description, "key: value pair");
  });

  it("returns empty body when nothing follows frontmatter", () => {
    const input = "---\nkey: val\n---\n";
    const { meta, body } = extractFrontmatter(input);
    assert.equal(meta.key, "val");
    assert.equal(body, "");
  });

  it("returns empty meta for empty frontmatter block", () => {
    const input = "---\n\n---\nSome body";
    const { meta, body } = extractFrontmatter(input);
    assert.deepStrictEqual(meta, {});
    assert.equal(body, "Some body");
  });
});

describe("buildGithubAccountPrompt", () => {
  it("returns a string containing the account name", () => {
    const result = buildGithubAccountPrompt("pancake-zinc");
    assert.ok(result.includes("pancake-zinc"));
  });

  it("contains the GH_TOKEN pattern", () => {
    const result = buildGithubAccountPrompt("my-user");
    assert.ok(result.includes("GH_TOKEN=$(gh auth token --user my-user)"));
  });

  it("contains the gh auth switch warning", () => {
    const result = buildGithubAccountPrompt("my-user");
    assert.ok(result.includes("Never use `gh auth switch`"));
  });
});

describe("readWorkflowJson", () => {
  let tmpDir;

  before(() => {
    tmpDir = makeTmpDir();
  });
  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when file is missing", () => {
    assert.equal(readWorkflowJson(tmpDir), null);
  });

  it("returns null for invalid JSON", () => {
    writeFixture(tmpDir, ".opencode/workflow.json", "not json {{{");
    assert.equal(readWorkflowJson(tmpDir), null);
    // Clean up for next test
    fs.unlinkSync(path.join(tmpDir, ".opencode", "workflow.json"));
  });

  it("returns parsed object for valid JSON", () => {
    const data = { project: { name: "test" } };
    writeFixture(tmpDir, ".opencode/workflow.json", JSON.stringify(data));
    const result = readWorkflowJson(tmpDir);
    assert.deepStrictEqual(result, data);
  });
});

describe("readWorkflowLocalJson", () => {
  let tmpDir;

  before(() => {
    tmpDir = makeTmpDir();
  });
  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when file is missing", () => {
    assert.equal(readWorkflowLocalJson(tmpDir), null);
  });

  it("returns null for invalid JSON", () => {
    writeFixture(tmpDir, ".opencode/workflow-local.json", "{broken");
    assert.equal(readWorkflowLocalJson(tmpDir), null);
    fs.unlinkSync(path.join(tmpDir, ".opencode", "workflow-local.json"));
  });

  it("returns parsed object for valid JSON", () => {
    const data = { github: { account: { default: "user1" } } };
    writeFixture(tmpDir, ".opencode/workflow-local.json", JSON.stringify(data));
    const result = readWorkflowLocalJson(tmpDir);
    assert.deepStrictEqual(result, data);
  });
});

describe("readGuide", () => {
  it("returns empty string for missing guide file", () => {
    assert.equal(readGuide("nonexistent-guide.md"), "");
  });

  it("returns trimmed content for existing guide files", () => {
    // Use the real guide files that ship with the plugin
    const result = readGuide("core-coder-guide.md");
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
    // Should be trimmed (no leading/trailing whitespace)
    assert.equal(result, result.trim());
  });
});

describe("loadCommands", () => {
  it("returns an object with command names as keys", () => {
    const commands = loadCommands();
    assert.ok(typeof commands === "object" && commands !== null);
    // The repo has 2 command files
    const keys = Object.keys(commands);
    assert.ok(keys.includes("zooplankton-coding-init"));
    assert.ok(keys.includes("zooplankton-coding-update"));
  });

  it("each command has description and template fields", () => {
    const commands = loadCommands();
    for (const [name, cmd] of Object.entries(commands)) {
      assert.ok(typeof cmd.description === "string", `${name} missing description`);
      assert.ok(typeof cmd.template === "string", `${name} missing template`);
      assert.ok(cmd.template.length > 0, `${name} has empty template`);
    }
  });

  it("commands without agent/model frontmatter omit those fields", () => {
    const commands = loadCommands();
    // Both command files in this repo have only `description` in frontmatter
    for (const [name, cmd] of Object.entries(commands)) {
      assert.ok(!("agent" in cmd), `${name} should not have agent`);
      assert.ok(!("model" in cmd), `${name} should not have model`);
    }
  });

  it("uses filename-without-extension as key", () => {
    const commands = loadCommands();
    // Verify keys match expected filename pattern (no .md suffix)
    for (const key of Object.keys(commands)) {
      assert.ok(!key.endsWith(".md"), `key ${key} should not have .md suffix`);
    }
  });

  it("extractFrontmatter correctly parses agent/model fields for command loading", () => {
    // loadCommands uses pluginRoot internally and can't be redirected,
    // so we test the frontmatter extraction path that produces agent/model fields
    const content =
      '---\ndescription: Test command\nagent: "my-agent"\nmodel: "my-model"\n---\nTemplate body';
    const { meta, body } = extractFrontmatter(content);
    assert.equal(meta.description, "Test command");
    assert.equal(meta.agent, "my-agent");
    assert.equal(meta.model, "my-model");
    assert.equal(body, "Template body");
    // Simulate the same logic loadCommands uses to build a command entry
    const cmd = { description: meta.description, template: body.trim() };
    if (meta.agent) cmd.agent = meta.agent;
    if (meta.model) cmd.model = meta.model;
    assert.equal(cmd.agent, "my-agent");
    assert.equal(cmd.model, "my-model");
  });
});

describe("registerAgents", () => {
  let tmpDir;

  before(() => {
    tmpDir = makeTmpDir();
  });
  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Write workflow.json + optional workflow-local.json into tmpDir. */
  const setupFixtures = (workflow, local) => {
    writeFixture(tmpDir, ".opencode/workflow.json", JSON.stringify(workflow));
    if (local) {
      writeFixture(tmpDir, ".opencode/workflow-local.json", JSON.stringify(local));
    } else {
      // Remove local if it exists from a prior test
      const localPath = path.join(tmpDir, ".opencode", "workflow-local.json");
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }
  };

  it("no-ops when workflow.json is missing", () => {
    const noWorkflowDir = makeTmpDir();
    const config = {};
    registerAgents(config, noWorkflowDir);
    assert.deepStrictEqual(config, {});
    fs.rmSync(noWorkflowDir, { recursive: true, force: true });
  });

  it("no-ops when workflow.json has no agents field", () => {
    setupFixtures({ project: { name: "test" } });
    const config = {};
    registerAgents(config, tmpDir);
    // config.agent should not be created
    assert.ok(!("agent" in config));
  });

  it("registers coreCoder as a single agent (object form)", () => {
    setupFixtures({
      agents: { coreCoder: { name: "my-coder", model: "some-model" } },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(config.agent["my-coder"]);
    assert.equal(config.agent["my-coder"].model, "some-model");
    assert.equal(config.agent["my-coder"].mode, "subagent");
  });

  it("registers array fields (reviewers) — all agents created", () => {
    setupFixtures({
      agents: {
        reviewers: [
          { name: "rev-1", model: "m1" },
          { name: "rev-2", model: "m2" },
        ],
      },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(config.agent["rev-1"]);
    assert.ok(config.agent["rev-2"]);
  });

  it("supports bare string agent entries (backward compat)", () => {
    setupFixtures({
      agents: { reviewers: ["bare-string-agent"] },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(config.agent["bare-string-agent"]);
    // Bare strings have no model key at all (not just undefined value)
    assert.ok(!("model" in config.agent["bare-string-agent"]));
  });

  it("does not override user-defined agents", () => {
    setupFixtures({
      agents: { coreCoder: { name: "my-coder", model: "new-model" } },
    });
    const config = { agent: { "my-coder": { description: "user-defined" } } };
    registerAgents(config, tmpDir);
    assert.equal(config.agent["my-coder"].description, "user-defined");
    // Should NOT have been replaced
    assert.ok(!("model" in config.agent["my-coder"]));
  });

  it("includes GitHub account prompt via roleKey override", () => {
    setupFixtures(
      { agents: { reviewers: [{ name: "rev-gh", model: "m" }] } },
      { github: { account: { reviewer: "role-user", default: "default-user" } } }
    );
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(config.agent["rev-gh"].prompt.includes("GH_TOKEN=$(gh auth token --user role-user)"));
  });

  it("includes GitHub account prompt via default fallback", () => {
    setupFixtures(
      { agents: { coreCoder: { name: "coder-gh", model: "m" } } },
      { github: { account: { default: "default-user" } } }
    );
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(
      config.agent["coder-gh"].prompt.includes(
        "GH_TOKEN=$(gh auth token --user default-user)"
      )
    );
  });

  it("per-agent steps overrides role default", () => {
    setupFixtures({
      agents: { reviewers: [{ name: "rev-custom-steps", model: "m", steps: 42 }] },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.equal(config.agent["rev-custom-steps"].steps, 42);
  });

  it("applies role default steps for reviewer (80) when per-agent value absent", () => {
    setupFixtures({
      agents: { reviewers: [{ name: "rev-default-steps", model: "m" }] },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.equal(config.agent["rev-default-steps"].steps, 80);
  });

  it("applies role default steps for securityReviewer (120)", () => {
    setupFixtures({
      agents: { securityReviewers: [{ name: "sec-default", model: "m" }] },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.equal(config.agent["sec-default"].steps, 120);
  });

  it("does not set steps for coreCoder when not specified", () => {
    setupFixtures({
      agents: { coreCoder: { name: "coder-no-steps", model: "m" } },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(!("steps" in config.agent["coder-no-steps"]));
  });

  it("does not set steps for coreReviewer when not specified", () => {
    setupFixtures({
      agents: { coreReviewers: [{ name: "core-rev-no-steps", model: "m" }] },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(!("steps" in config.agent["core-rev-no-steps"]));
  });

  it("only sets model when truthy", () => {
    setupFixtures({
      agents: { coreCoder: { name: "coder-no-model" } },
    });
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(!("model" in config.agent["coder-no-model"]));
  });

  it("reviewer bash permissions include gh api allow", () => {
    setupFixtures({
      agents: { reviewers: [{ name: "rev-perms", model: "m" }] },
    });
    const config = {};
    registerAgents(config, tmpDir);
    const perms = config.agent["rev-perms"].permission;
    assert.equal(perms.edit, "deny");
    assert.equal(perms.bash["*"], "deny");
    assert.equal(perms.bash["gh api *"], "allow");
    assert.equal(perms.bash["gh pr diff *"], "allow");
    assert.equal(perms.bash["gh pr view *"], "allow");
    assert.equal(perms.bash["gh pr checks *"], "allow");
    assert.equal(perms.bash["git diff *"], "allow");
    assert.equal(perms.bash["git log *"], "allow");
    assert.equal(perms.bash["git fetch *"], "allow");
    assert.equal(perms.read, "allow");
    assert.equal(perms.webfetch, "deny");
  });

  it("coreCoder has full permissions", () => {
    setupFixtures({
      agents: { coreCoder: { name: "coder-perms", model: "m" } },
    });
    const config = {};
    registerAgents(config, tmpDir);
    const perms = config.agent["coder-perms"].permission;
    assert.equal(perms.edit, "allow");
    assert.equal(perms.bash["*"], "allow");
    assert.equal(perms.read, "allow");
    assert.equal(perms.webfetch, "allow");
  });

  it("coreReviewer permissions: edit deny, bash allow-all, webfetch deny", () => {
    setupFixtures({
      agents: { coreReviewers: [{ name: "core-rev-perms", model: "m" }] },
    });
    const config = {};
    registerAgents(config, tmpDir);
    const perms = config.agent["core-rev-perms"].permission;
    assert.equal(perms.edit, "deny");
    assert.equal(perms.bash["*"], "allow");
    assert.equal(perms.read, "allow");
    assert.equal(perms.webfetch, "deny");
  });

  it("securityReviewer permissions: gh allowlist present", () => {
    setupFixtures({
      agents: { securityReviewers: [{ name: "sec-perms", model: "m" }] },
    });
    const config = {};
    registerAgents(config, tmpDir);
    const perms = config.agent["sec-perms"].permission;
    assert.equal(perms.edit, "deny");
    assert.equal(perms.bash["*"], "deny");
    assert.equal(perms.bash["gh api *"], "allow");
    assert.equal(perms.bash["gh pr diff *"], "allow");
    assert.equal(perms.bash["gh pr view *"], "allow");
    assert.equal(perms.bash["gh pr checks *"], "allow");
    assert.equal(perms.bash["git diff *"], "allow");
    assert.equal(perms.bash["git log *"], "allow");
    assert.equal(perms.bash["git fetch *"], "allow");
    assert.equal(perms.read, "allow");
    assert.equal(perms.webfetch, "deny");
  });

  it("no GitHub account prompt when neither role nor default configured", () => {
    setupFixtures(
      { agents: { reviewers: [{ name: "rev-no-gh", model: "m" }] } },
      { github: { account: {} } }
    );
    const config = {};
    registerAgents(config, tmpDir);
    assert.ok(!config.agent["rev-no-gh"].prompt.includes("GH_TOKEN"));
  });
});

describe("ZooplanktonCodingPlugin", () => {
  let tmpDir;

  before(() => {
    tmpDir = makeTmpDir();
  });
  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("adds skills path to config.skills.paths", async () => {
    const plugin = await ZooplanktonCodingPlugin({ directory: tmpDir });
    const config = {};
    await plugin.config(config);
    assert.ok(Array.isArray(config.skills.paths));
    assert.ok(config.skills.paths.length > 0);
    const skillsPath = config.skills.paths[0];
    assert.ok(skillsPath.endsWith("skills"), `Expected skills path, got: ${skillsPath}`);
  });

  it("does not duplicate skills path on second call", async () => {
    const plugin = await ZooplanktonCodingPlugin({ directory: tmpDir });
    const config = {};
    await plugin.config(config);
    const countBefore = config.skills.paths.length;
    await plugin.config(config);
    assert.equal(config.skills.paths.length, countBefore);
  });

  it("loads commands into config.command", async () => {
    const plugin = await ZooplanktonCodingPlugin({ directory: tmpDir });
    const config = {};
    await plugin.config(config);
    assert.ok(config.command["zooplankton-coding-init"]);
    assert.ok(config.command["zooplankton-coding-update"]);
  });

  it("does not override pre-set commands", async () => {
    const plugin = await ZooplanktonCodingPlugin({ directory: tmpDir });
    const config = {
      command: {
        "zooplankton-coding-init": { description: "user override" },
      },
    };
    await plugin.config(config);
    assert.equal(config.command["zooplankton-coding-init"].description, "user override");
  });

  it("registers agents when workflow.json is present", async () => {
    writeFixture(
      tmpDir,
      ".opencode/workflow.json",
      JSON.stringify({
        agents: { coreCoder: { name: "integration-coder", model: "test-model" } },
      })
    );
    const plugin = await ZooplanktonCodingPlugin({ directory: tmpDir });
    const config = {};
    await plugin.config(config);
    assert.ok(config.agent["integration-coder"]);
    assert.equal(config.agent["integration-coder"].model, "test-model");
  });
});
