import * as tl from "azure-pipelines-task-lib/task";
import * as path from "path";
import * as fs from "fs";
import * as util from "util";
import { exec } from "child_process";
import { groupCommitsByType } from "./utils/commitGrouper";
import * as handlebars from "handlebars";

const execAsync = util.promisify(exec);

async function run() {
  try {
    console.log("Starting CommitRangeReleaseNotes task");

    // Get task parameters
    const startCommit = tl.getInput("startCommit", true) as string;
    const endCommit = tl.getInput("endCommit", true) as string;
    const outputFile = tl.getInput("outputFile", true) as string;
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

    // Fetch commit data between provided range
    console.log(`Fetching commit data between ${startCommit} and ${endCommit}`);
    
    let format = "--pretty=format:\"%h|%an|%ae|%at|%s\"";
    if (conventionalCommits) {
      // For conventional commits we need the commit body too
      format = "--pretty=format:\"%h|%an|%ae|%at|%s|%b\"";
    }
    
    const { stdout } = await execAsync(`git log ${startCommit}..${endCommit} ${format}`);
    
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
        const parts = line.split("|");
        const timestamp = parseInt(parts[3]);
        const date = isNaN(timestamp) ? new Date(0) : new Date(timestamp * 1000);
        return {
          hash: parts[0]?.replace(/"/g, "") || "",
          author: parts[1] || "",
          email: parts[2] || "",
          date: date.toISOString(),
          subject: parts[4]?.replace(/"/g, "") || "",
          body: parts.length > 5 ? parts.slice(5).join("|")?.replace(/"/g, "") : ""
        };
      });

    console.log(`Found ${commits.length} commits in the specified range`);

    // Process the commits (group by type if conventional commits)
    let releaseData: any = { commits };
    
    if (conventionalCommits) {
      releaseData = groupCommitsByType(commits);
    }

    // Add additional release info
    releaseData.startCommit = startCommit;
    releaseData.endCommit = endCommit;
    releaseData.generatedDate = new Date().toISOString();

    // Generate release notes using template
    let template: string;
    if (templateFile && fs.existsSync(templateFile)) {
      template = fs.readFileSync(templateFile, "utf8");
    } else {
      // Default template
      if (conventionalCommits) {
        template = defaultConventionalTemplate;
      } else {
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
  } catch (error) {
    console.error("Error generating release notes:", error);
    tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
  }
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