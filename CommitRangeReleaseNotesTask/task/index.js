"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = __importStar(require("azure-pipelines-task-lib/task"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const child_process_1 = require("child_process");
const commitGrouper_1 = require("./utils/commitGrouper");
const handlebars = __importStar(require("handlebars"));
const execAsync = util.promisify(child_process_1.exec);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Starting CommitRangeReleaseNotes task");
            // Get task parameters
            let startCommit = tl.getInput("startCommit", true);
            const endCommit = tl.getInput("endCommit", true);
            const outputFile = tl.getInput("outputFile", true);
            const templateFile = tl.getInput("templateFile", false);
            const repoRoot = tl.getInput("repoRoot", false) || tl.getVariable("System.DefaultWorkingDirectory") || process.cwd();
            const conventionalCommits = tl.getBoolInput("conventionalCommits", false);
            const failOnError = tl.getBoolInput("failOnError", false);
            console.log(`Parameters received:
      - Start Commit: ${startCommit}
      - End Commit: ${endCommit}
      - Output File: ${outputFile}
      - Template File: ${templateFile || "Using default template"}
      - Repository Root: ${repoRoot}
      - Use Conventional Commits: ${conventionalCommits}
      - Fail on Error: ${failOnError}`);
            // Change to repo directory
            process.chdir(repoRoot);
            console.log(`Working directory changed to: ${process.cwd()}`);
            // Validate commits exist before trying to get the range
            console.log(`Validating commits: ${startCommit} and ${endCommit}`);
            try {
                // Check if startCommit exists and is valid
                yield execAsync(`git rev-parse --verify ${startCommit}`);
                console.log(`✓ Start commit ${startCommit} is valid`);
            }
            catch (error) {
                // Special handling for relative references like HEAD~10 in shallow repos
                if (startCommit.includes('HEAD~') || startCommit.includes('HEAD^')) {
                    console.log(`⚠️  ${startCommit} not available - likely due to shallow clone with limited history`);
                    console.log(`Checking available commit count...`);
                    try {
                        const { stdout: commitCount } = yield execAsync(`git rev-list --count HEAD`);
                        const availableCommits = parseInt(commitCount.trim());
                        console.log(`Available commits in history: ${availableCommits}`);
                        if (availableCommits < 10) {
                            console.log(`⚠️  Insufficient commit history. Using all available commits instead.`);
                            // Use the first commit in the repo as start
                            const { stdout: firstCommit } = yield execAsync(`git rev-list --max-parents=0 HEAD`);
                            const originalStartCommit = startCommit;
                            startCommit = firstCommit.trim();
                            console.log(`Updated startCommit from ${originalStartCommit} to ${startCommit} (first commit)`);
                        }
                    }
                    catch (historyError) {
                        console.error('Failed to analyze commit history:', historyError);
                    }
                    // Try the validation again with potentially updated startCommit
                    try {
                        yield execAsync(`git rev-parse --verify ${startCommit}`);
                        console.log(`✓ Updated start commit ${startCommit} is valid`);
                    }
                    catch (retryError) {
                        const errorMsg = `Invalid start commit: ${startCommit}. The repository appears to have insufficient history. Consider using 'fetchDepth: 0' in your checkout step to get full history.`;
                        console.error(errorMsg);
                        tl.setResult(tl.TaskResult.Failed, errorMsg);
                        return;
                    }
                }
                else {
                    const errorMsg = `Invalid start commit: ${startCommit}. Please ensure this commit/tag/branch exists and is accessible.`;
                    console.error(errorMsg);
                    tl.setResult(tl.TaskResult.Failed, errorMsg);
                    return;
                }
            }
            try {
                // Check if endCommit exists and is valid
                yield execAsync(`git rev-parse --verify ${endCommit}`);
                console.log(`✓ End commit ${endCommit} is valid`);
            }
            catch (error) {
                const errorMsg = `Invalid end commit: ${endCommit}. Please ensure this commit/tag/branch exists and is accessible.`;
                console.error(errorMsg);
                tl.setResult(tl.TaskResult.Failed, errorMsg);
                return;
            }
            // Fetch commit data between provided range
            console.log(`Fetching commit data between ${startCommit} and ${endCommit}`);
            let format = "--pretty=format:\"%h|%an|%ae|%at|%s\"";
            if (conventionalCommits) {
                // For conventional commits we need the commit body too
                format = "--pretty=format:\"%h|%an|%ae|%at|%s|%b\"";
            }
            let stdout;
            try {
                const result = yield execAsync(`git log ${startCommit}..${endCommit} ${format}`);
                stdout = result.stdout;
            }
            catch (error) {
                // Try alternative syntax if the range fails
                console.log(`Range syntax failed, trying alternative approach...`);
                try {
                    const result = yield execAsync(`git log ${startCommit}...${endCommit} ${format}`);
                    stdout = result.stdout;
                    console.log(`✓ Using symmetric difference (${startCommit}...${endCommit})`);
                }
                catch (altError) {
                    const errorMsg = `Failed to get commits between ${startCommit} and ${endCommit}. Please check that these commits exist and are reachable in the current branch.`;
                    console.error(errorMsg);
                    console.error('Original error:', error);
                    console.error('Alternative error:', altError);
                    tl.setResult(tl.TaskResult.Failed, errorMsg);
                    return;
                }
            }
            if (!stdout) {
                console.log("No commits found in the specified range");
                if (failOnError) {
                    tl.setResult(tl.TaskResult.Failed, "No commits found in the specified range");
                    return;
                }
                // Create empty release notes if no commits and not failing
                fs.writeFileSync(outputFile, "No changes in this release");
                return;
            }
            // Parse commit data
            const commits = stdout.split("\n")
                .filter(line => line.trim() !== "")
                .map(line => {
                var _a, _b, _c;
                const parts = line.split("|");
                const timestamp = parseInt(parts[3]);
                const date = isNaN(timestamp) ? new Date(0) : new Date(timestamp * 1000);
                return {
                    hash: ((_a = parts[0]) === null || _a === void 0 ? void 0 : _a.replace(/"/g, "")) || "",
                    author: parts[1] || "",
                    email: parts[2] || "",
                    date: date.toISOString(),
                    subject: ((_b = parts[4]) === null || _b === void 0 ? void 0 : _b.replace(/"/g, "")) || "",
                    body: parts.length > 5 ? (_c = parts.slice(5).join("|")) === null || _c === void 0 ? void 0 : _c.replace(/"/g, "") : ""
                };
            });
            console.log(`Found ${commits.length} commits in the specified range`);
            // Process the commits (group by type if conventional commits)
            let releaseData = { commits };
            if (conventionalCommits) {
                releaseData = (0, commitGrouper_1.groupCommitsByType)(commits);
            }
            // Add additional release info
            releaseData.startCommit = startCommit;
            releaseData.endCommit = endCommit;
            releaseData.generatedDate = new Date().toISOString();
            // Generate release notes using template
            let template;
            if (templateFile && templateFile.trim() !== "" && fs.existsSync(templateFile)) {
                // Check if it's actually a file, not a directory
                const stats = fs.statSync(templateFile);
                if (stats.isFile()) {
                    console.log(`Using custom template file: ${templateFile}`);
                    template = fs.readFileSync(templateFile, "utf8");
                }
                else {
                    console.log(`⚠️  Template path is a directory, not a file: ${templateFile}`);
                    console.log(`Using default template instead.`);
                    // Use default template
                    if (conventionalCommits) {
                        template = defaultConventionalTemplate;
                    }
                    else {
                        template = defaultSimpleTemplate;
                    }
                }
            }
            else {
                if (templateFile && templateFile.trim() !== "") {
                    console.log(`⚠️  Template file not found: ${templateFile}`);
                    console.log(`Using default template instead.`);
                }
                else {
                    console.log(`Using default template (no custom template specified).`);
                }
                // Default template
                if (conventionalCommits) {
                    template = defaultConventionalTemplate;
                }
                else {
                    template = defaultSimpleTemplate;
                }
            }
            // Compile and render the template
            const templateFunc = handlebars.compile(template);
            const releaseNotes = templateFunc(releaseData);
            // Save release notes to output file
            const outputDir = path.dirname(outputFile);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(outputFile, releaseNotes);
            console.log(`Release notes successfully generated at: ${outputFile}`);
            // Set output variable
            tl.setVariable("ReleaseNotes", releaseNotes);
            tl.setResult(tl.TaskResult.Succeeded, "Release notes generated successfully");
        }
        catch (error) {
            console.error("Error generating release notes:", error);
            tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
        }
    });
}
// Default template for simple commit list
const defaultSimpleTemplate = `# Release Notes
## Commits ({{commits.length}})

{{#each commits}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
`;
// Default template for conventional commits
const defaultConventionalTemplate = `# Release Notes

{{#if features.length}}
## 🚀 Features

{{#each features}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
{{/if}}

{{#if fixes.length}}
## 🐛 Bug Fixes

{{#each fixes}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
{{/if}}

{{#if docs.length}}
## 📚 Documentation

{{#each docs}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
{{/if}}

{{#if chores.length}}
## 🧹 Chores

{{#each chores}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
{{/if}}

{{#if other.length}}
## Other Changes

{{#each other}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
{{/if}}
`;
run();
