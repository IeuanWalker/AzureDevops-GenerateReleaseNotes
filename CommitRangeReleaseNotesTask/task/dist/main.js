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
        // Validate repo root
        process.chdir(repoRoot);
        // Validate start commit
        if (!(yield (0, CommitUtils_1.validateCommit)(startCommit, repoRoot))) {
            if (startCommit.includes('HEAD~') || startCommit.includes('HEAD^')) {
                const availableCommits = yield (0, CommitUtils_1.getCommitCount)(repoRoot);
                if (availableCommits < 10) {
                    startCommit = yield (0, CommitUtils_1.getFirstCommit)(repoRoot);
                }
                if (!(yield (0, CommitUtils_1.validateCommit)(startCommit, repoRoot))) {
                    tl.setResult(tl.TaskResult.Failed, `Invalid start commit: ${startCommit}`);
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
        catch (_a) {
            tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
            return;
        }
        if (!commits || commits.length === 0) {
            tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
            return;
        }
        yield Promise.all(commits.map((commit) => __awaiter(this, void 0, void 0, function* () {
            const mergePattern = /Merged PR (\d+): (.+)/i;
            const match = mergePattern.exec(commit.subject);
            if (!match) {
                tl.debug(`Commit ${commit.subject} does not match PR merge pattern`);
                return null;
            }
            const prId = match[1];
            const prTitle = match[2];
            try {
                let pr = yield (0, PRUtils_1.getPRInfo)(Number(prId), 'cardiffcouncilict', teamProject, repositoryName, systemAccessToken);
                if (pr == null) {
                    tl.warning(`Failed to fetch PR details for PR ${prId}`);
                    return;
                }
                commit.pullRequest = pr;
            }
            catch (err) {
                tl.warning(`Error fetching PR details for PR ${prId}: ${err}`);
                return null;
            }
        })));
        // Get all pull requests from commits (flattened, unique by id)
        const allPullRequests = commits
            .map(c => c.pullRequest)
            .filter(pr => pr) // remove undefined/null
            .filter((pr, idx, arr) => arr.findIndex(x => x.id === pr.id) === idx);
        // Get all work items from all pull requests (flattened, unique by id)
        const allWorkItems = allPullRequests
            .flatMap(pr => pr.workItems || [])
            .filter((wi, idx, arr) => arr.findIndex(x => x.id === wi.id) === idx);
        // Data for Handlebars template
        let releaseData = {
            commits,
            workItems: allWorkItems,
            pullRequests: allPullRequests,
            startCommit,
            endCommit,
            generatedDate: new Date().toISOString(),
            repositoryName,
            teamProject
        };
        JSON.stringify(releaseData, null, 2)
            .split('\n')
            .forEach(line => tl.debug(line));
        // Get template
        let template;
        const hasValidTemplateFile = templateFile && templateFile.trim() !== '' && fs.existsSync(templateFile) && fs.statSync(templateFile).isFile();
        if (hasValidTemplateFile) {
            template = fs.readFileSync(templateFile, 'utf8');
        }
        else {
            template = TemplateUtils_1.defaultTemplate;
        }
        // Generate release notes
        const templateFunc = TemplateUtils_1.handlebars.compile(template);
        const releaseNotes = templateFunc(releaseData);
        // Save release notes to file
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputFile, releaseNotes);
        tl.setVariable('ReleaseNotes', releaseNotes);
        tl.setResult(tl.TaskResult.Succeeded, 'Release notes generated successfully');
    });
}
exports.GenerateReleaseNotes = GenerateReleaseNotes;
