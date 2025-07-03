"use strict";
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
exports.GenerateReleaseNotes = void 0;
const tl = require("azure-pipelines-task-lib/task");
const fs = require("fs");
const CommitUtils_1 = require("./utils/CommitUtils");
const PRUtils_1 = require("./utils/PRUtils");
const TemplateUtils_1 = require("./utils/TemplateUtils");
const WorkItemUtils_1 = require("./utils/WorkItemUtils");
const JsonOutput_1 = require("./utils/JsonOutput");
(0, TemplateUtils_1.registerHelpers)();
function GenerateReleaseNotes(startCommit, endCommit, outputFileMarkdown, outputFileHtml, repoRoot, systemAccessToken, project, apiUrl, repositoryId, templateFileMarkdown, templateFileHtml) {
    return __awaiter(this, void 0, void 0, function* () {
        // Variables
        console.log();
        console.log('VARIABLES');
        console.log(`Start Commit: ${startCommit}`);
        console.log(`End Commit: ${endCommit}`);
        console.log(`Output File - Markdown: ${outputFileMarkdown}`);
        console.log(`Output File - HTML: ${outputFileHtml}`);
        console.log(`Repository Root: ${repoRoot}`);
        console.log(`System Access Token: ${systemAccessToken ? 'Provided' : 'Not Provided'}`);
        console.log(`Project: ${project}`);
        console.log(`ApiUrl: ${apiUrl}`);
        console.log(`Repository ID: ${repositoryId}`);
        console.log(`Template File - Markdown: ${templateFileMarkdown ? templateFileMarkdown : 'Default'}`);
        console.log(`Template File - HTML: ${templateFileHtml ? templateFileHtml : 'Default'}`);
        console.log();
        // Input validation
        if (!(startCommit === null || startCommit === void 0 ? void 0 : startCommit.trim()) || !(endCommit === null || endCommit === void 0 ? void 0 : endCommit.trim())) {
            tl.setResult(tl.TaskResult.Failed, 'Start and end commits are required');
            return;
        }
        if (!(outputFileMarkdown === null || outputFileMarkdown === void 0 ? void 0 : outputFileMarkdown.trim())) {
            tl.setResult(tl.TaskResult.Failed, 'Output file path is required');
            return;
        }
        if (!outputFileMarkdown.endsWith('.md')) {
            tl.setResult(tl.TaskResult.Failed, 'Output file path must end with .md');
            return;
        }
        if (!(outputFileHtml === null || outputFileHtml === void 0 ? void 0 : outputFileHtml.trim())) {
            tl.setResult(tl.TaskResult.Failed, 'Output file path is required');
            return;
        }
        if (!outputFileHtml.endsWith('.html')) {
            tl.setResult(tl.TaskResult.Failed, 'Output file path must end with .html');
            return;
        }
        if (!fs.existsSync(repoRoot)) {
            tl.setResult(tl.TaskResult.Failed, `Repository root does not exist: ${repoRoot}`);
            return;
        }
        // Validate repo root
        try {
            process.chdir(repoRoot);
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Failed to change to repository directory: ${error}`);
            return;
        }
        // Validate start commit
        if (!(yield (0, CommitUtils_1.validateCommit)(startCommit, repoRoot))) {
            if (startCommit.includes('HEAD~') || startCommit.includes('HEAD^')) {
                try {
                    const availableCommits = yield (0, CommitUtils_1.getCommitCount)(repoRoot);
                    if (availableCommits < 10) {
                        startCommit = yield (0, CommitUtils_1.getFirstCommit)(repoRoot);
                    }
                    if (!(yield (0, CommitUtils_1.validateCommit)(startCommit, repoRoot))) {
                        tl.setResult(tl.TaskResult.Failed, `Invalid start commit after fallback: ${startCommit}`);
                        return;
                    }
                }
                catch (error) {
                    tl.setResult(tl.TaskResult.Failed, `Error resolving start commit: ${error}`);
                    return;
                }
            }
            else {
                tl.setResult(tl.TaskResult.Failed, `Invalid start commit: ${startCommit}`);
                return;
            }
        }
        // Validate end commit
        if (!(yield (0, CommitUtils_1.validateCommit)(endCommit, repoRoot))) {
            tl.setResult(tl.TaskResult.Failed, `Invalid end commit: ${endCommit}`);
            return;
        }
        // Get list of commits
        let commits;
        try {
            commits = yield (0, CommitUtils_1.getCommitsInRange)(startCommit, endCommit, repoRoot);
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Failed to get commits in range: ${error}`);
            return;
        }
        if (!commits || commits.length === 0) {
            tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
            return;
        }
        console.log();
        console.log(`Found ${commits.length} commits in range ${startCommit}..${endCommit}`);
        console.log();
        // Process commits to extract PR information
        const mergePattern = /Merged PR (\d+): (.+)/i;
        const prProcessingPromises = commits.map((commit) => __awaiter(this, void 0, void 0, function* () {
            const match = mergePattern.exec(commit.subject);
            if (!match) {
                console.warn(`Commit ${commit.hash} does not match PR merge pattern: ${commit.subject}`);
                return;
            }
            const prId = match[1];
            if (!systemAccessToken || !project || !repositoryId) {
                console.warn(`Missing required parameters for PR ${prId} - skipping PR details fetch`);
                return;
            }
            try {
                const pr = yield (0, PRUtils_1.getPRInfo)(Number(prId), apiUrl, project, repositoryId, systemAccessToken);
                if (pr) {
                    commit.pullRequest = pr;
                    console.log(`Successfully fetched PR ${prId} with ${pr.workItems.length} work items`);
                }
                else {
                    console.warn(`Failed to fetch PR details for PR ${prId}`);
                }
            }
            catch (err) {
                console.warn(`Error fetching PR details for PR ${prId}: ${err}`);
            }
        }));
        // Wait for all PR processing to complete
        yield Promise.all(prProcessingPromises);
        // Get all pull requests from commits (flattened, unique by id)
        const allPullRequests = commits
            .map(c => c.pullRequest)
            .filter((pr) => pr !== undefined && pr !== null)
            .filter((pr, idx, arr) => arr.findIndex(x => x.id === pr.id) === idx);
        // Get all work items from all pull requests (flattened, unique by id)
        const allWorkItems = (0, WorkItemUtils_1.getDistinctWorkItemListFromPRs)(allPullRequests);
        // Data for Handlebars template
        const releaseData = {
            commits,
            workItems: allWorkItems,
            pullRequests: allPullRequests,
            startCommit,
            endCommit,
            generatedDate: new Date().toISOString(),
            repositoryId,
            project
        };
        (0, JsonOutput_1.printJson)(releaseData);
        (0, TemplateUtils_1.GenerateMarkdownReleaseNotes)(releaseData, outputFileMarkdown, templateFileMarkdown);
        (0, TemplateUtils_1.GenerateHtmlReleaseNotes)(releaseData, outputFileHtml, templateFileHtml);
    });
}
exports.GenerateReleaseNotes = GenerateReleaseNotes;
