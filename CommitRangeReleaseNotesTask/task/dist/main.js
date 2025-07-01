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
const path = require("path");
const fs = require("fs");
const CommitUtils_1 = require("./utils/CommitUtils");
const PRUtils_1 = require("./utils/PRUtils");
const TemplateUtils_1 = require("./utils/TemplateUtils");
(0, TemplateUtils_1.registerHelpers)();
function GenerateReleaseNotes(startCommit, endCommit, outputFile, repoRoot, systemAccessToken, teamProject, repositoryName, templateFile) {
    return __awaiter(this, void 0, void 0, function* () {
        // Input validation
        if (!(startCommit === null || startCommit === void 0 ? void 0 : startCommit.trim()) || !(endCommit === null || endCommit === void 0 ? void 0 : endCommit.trim())) {
            tl.setResult(tl.TaskResult.Failed, 'Start and end commits are required');
            return;
        }
        if (!(outputFile === null || outputFile === void 0 ? void 0 : outputFile.trim())) {
            tl.setResult(tl.TaskResult.Failed, 'Output file path is required');
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
        // Extract organization from system access token or use default
        const organization = 'cardiffcouncilict'; // TODO: Make this configurable
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
        tl.debug(`Found ${commits.length} commits in range ${startCommit}..${endCommit}`);
        // Process commits to extract PR information
        const mergePattern = /Merged PR (\d+): (.+)/i;
        const prProcessingPromises = commits.map((commit) => __awaiter(this, void 0, void 0, function* () {
            const match = mergePattern.exec(commit.subject);
            if (!match) {
                tl.debug(`Commit ${commit.hash} does not match PR merge pattern: ${commit.subject}`);
                return;
            }
            const prId = match[1];
            if (!systemAccessToken || !teamProject || !repositoryName) {
                tl.warning(`Missing required parameters for PR ${prId} - skipping PR details fetch`);
                return;
            }
            try {
                const pr = yield (0, PRUtils_1.getPRInfo)(Number(prId), organization, teamProject, repositoryName, systemAccessToken);
                if (pr) {
                    commit.pullRequest = pr;
                    tl.debug(`Successfully fetched PR ${prId} with ${pr.workItems.length} work items`);
                }
                else {
                    tl.warning(`Failed to fetch PR details for PR ${prId}`);
                }
            }
            catch (err) {
                tl.warning(`Error fetching PR details for PR ${prId}: ${err}`);
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
        const allWorkItems = allPullRequests
            .flatMap(pr => pr.workItems || [])
            .filter((wi, idx, arr) => arr.findIndex(x => x.id === wi.id) === idx);
        tl.debug(`Found ${allPullRequests.length} unique pull requests and ${allWorkItems.length} unique work items`);
        // Data for Handlebars template
        const releaseData = {
            commits,
            workItems: allWorkItems,
            pullRequests: allPullRequests,
            startCommit,
            endCommit,
            generatedDate: new Date().toISOString(),
            repositoryName,
            teamProject
        };
        // Log release data for debugging (truncated)
        tl.debug(`Release data summary: ${commits.length} commits, ${allPullRequests.length} PRs, ${allWorkItems.length} work items`);
        // Get template
        let template;
        try {
            const hasValidTemplateFile = templateFile &&
                templateFile.trim() !== '' &&
                fs.existsSync(templateFile) &&
                fs.statSync(templateFile).isFile();
            if (hasValidTemplateFile) {
                template = fs.readFileSync(templateFile, 'utf8');
                tl.debug(`Using custom template: ${templateFile}`);
            }
            else {
                template = TemplateUtils_1.defaultTemplate;
                tl.debug('Using default template');
            }
        }
        catch (error) {
            tl.warning(`Error reading template file: ${error}. Using default template.`);
            template = TemplateUtils_1.defaultTemplate;
        }
        // Generate release notes
        let releaseNotes;
        try {
            const templateFunc = TemplateUtils_1.handlebars.compile(template);
            releaseNotes = templateFunc(releaseData);
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Failed to generate release notes from template: ${error}`);
            return;
        }
        // Save release notes to file
        try {
            const outputDir = path.dirname(outputFile);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(outputFile, releaseNotes, 'utf8');
            tl.debug(`Release notes written to: ${outputFile}`);
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Failed to write release notes to file: ${error}`);
            return;
        }
        // Set pipeline variable and result
        tl.setVariable('ReleaseNotes', releaseNotes);
        tl.setResult(tl.TaskResult.Succeeded, `Release notes generated successfully with ${commits.length} commits, ${allPullRequests.length} PRs, and ${allWorkItems.length} work items`);
    });
}
exports.GenerateReleaseNotes = GenerateReleaseNotes;
