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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = __importStar(require("azure-pipelines-task-lib/task"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const gitUtils_1 = require("./utils/gitUtils");
const workItemUtils_1 = require("./workItemUtils");
const prUtils_1 = require("./prUtils");
const templateUtils_1 = require("./templateUtils");
const templates_1 = require("./templates");
const commitGrouper = __importStar(require("./utils/commitGrouper"));
(0, templateUtils_1.registerHelpers)();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let startCommit = tl.getInput('startCommit', true);
            const endCommit = tl.getInput('endCommit', true);
            const outputFile = tl.getInput('outputFile', true);
            const templateFile = tl.getInput('templateFile', false) || undefined;
            const repoRoot = tl.getInput('repoRoot', false) || tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
            const conventionalCommits = tl.getBoolInput('conventionalCommits', false);
            const failOnError = tl.getBoolInput('failOnError', false);
            const generateWorkItemLinks = tl.getBoolInput('generateWorkItemLinks', false);
            const generatePRLinks = tl.getBoolInput('generatePRLinks', false);
            const generateCommitLinks = tl.getBoolInput('generateCommitLinks', false);
            const teamProject = tl.getVariable('System.TeamProject') || undefined;
            const collectionUri = tl.getVariable('System.TeamFoundationCollectionUri') || undefined;
            const repositoryName = tl.getVariable('Build.Repository.Name') || undefined;
            process.chdir(repoRoot);
            if (!(yield (0, gitUtils_1.validateCommit)(startCommit, repoRoot))) {
                if (startCommit.includes('HEAD~') || startCommit.includes('HEAD^')) {
                    const availableCommits = yield (0, gitUtils_1.getCommitCount)(repoRoot);
                    if (availableCommits < 10) {
                        startCommit = yield (0, gitUtils_1.getFirstCommit)(repoRoot);
                    }
                    if (!(yield (0, gitUtils_1.validateCommit)(startCommit, repoRoot))) {
                        tl.setResult(tl.TaskResult.Failed, `Invalid start commit: ${startCommit}`);
                        return;
                    }
                }
                else {
                    tl.setResult(tl.TaskResult.Failed, `Invalid start commit: ${startCommit}`);
                    return;
                }
            }
            if (!(yield (0, gitUtils_1.validateCommit)(endCommit, repoRoot))) {
                tl.setResult(tl.TaskResult.Failed, `Invalid end commit: ${endCommit}`);
                return;
            }
            let format = '--pretty=format:"%h|%an|%ae|%at|%s"';
            if (conventionalCommits)
                format = '--pretty=format:"%h|%an|%ae|%at|%s|%b"';
            let stdout;
            try {
                stdout = yield (0, gitUtils_1.getCommitsInRange)(startCommit, endCommit, format, repoRoot);
            }
            catch (_a) {
                if (failOnError) {
                    tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
                    return;
                }
                fs_1.default.writeFileSync(outputFile, 'No changes in this release');
                return;
            }
            if (!stdout) {
                if (failOnError) {
                    tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
                    return;
                }
                fs_1.default.writeFileSync(outputFile, 'No changes in this release');
                return;
            }
            const commits = stdout.split('\n').filter(line => line.trim() !== '').map(line => {
                const parts = line.split('|');
                const timestamp = parseInt(parts[3]);
                const date = isNaN(timestamp) ? new Date(0) : new Date(timestamp * 1000);
                const subject = (parts[4] || '').replace(/"/g, '');
                const body = parts.length > 5 ? parts.slice(5).join('|').replace(/"/g, '') : '';
                const fullMessage = `${subject}\n${body}`.trim();
                const commit = {
                    hash: (parts[0] || '').replace(/"/g, ''),
                    author: parts[1] || '',
                    email: parts[2] || '',
                    date: date.toISOString(),
                    subject,
                    body
                };
                if (generateWorkItemLinks) {
                    commit.workItems = (0, workItemUtils_1.parseWorkItems)(fullMessage);
                    if (collectionUri && teamProject) {
                        commit.workItems.forEach((wi) => {
                            wi.url = (0, workItemUtils_1.generateWorkItemUrl)(wi.id, collectionUri, teamProject);
                        });
                    }
                }
                if (generateCommitLinks && collectionUri && teamProject && repositoryName) {
                    commit.commitUrl = `${collectionUri.replace(/\/$/, '')}/${teamProject}/_git/${repositoryName}/commit/${commit.hash}`;
                }
                return commit;
            });
            if (generatePRLinks && collectionUri && teamProject) {
                for (const commit of commits) {
                    commit.pullRequest = yield (0, prUtils_1.findPullRequestForCommit)(commit.hash, collectionUri, teamProject, repoRoot);
                }
            }
            const allWorkItems = [];
            const allPullRequests = [];
            commits.forEach(commit => {
                if (commit.workItems) {
                    commit.workItems.forEach((wi) => {
                        if (!allWorkItems.find(existing => existing.id === wi.id)) {
                            allWorkItems.push(wi);
                        }
                    });
                }
                if (commit.pullRequest) {
                    if (!allPullRequests.find(existing => existing.id === commit.pullRequest.id)) {
                        allPullRequests.push(commit.pullRequest);
                    }
                }
            });
            let releaseData = {
                commits,
                workItems: allWorkItems,
                pullRequests: allPullRequests,
                startCommit,
                endCommit,
                generatedDate: new Date().toISOString(),
                repositoryName,
                teamProject,
                collectionUri
            };
            if (conventionalCommits) {
                const grouped = commitGrouper.groupCommitsByType(commits);
                releaseData.features = grouped.features;
                releaseData.fixes = grouped.fixes;
                releaseData.docs = grouped.docs;
                releaseData.chores = grouped.chores;
                releaseData.other = grouped.other;
            }
            let template;
            const hasValidTemplateFile = templateFile && templateFile.trim() !== '' && fs_1.default.existsSync(templateFile) && fs_1.default.statSync(templateFile).isFile();
            if (hasValidTemplateFile) {
                template = fs_1.default.readFileSync(templateFile, 'utf8');
            }
            else {
                template = conventionalCommits ? templates_1.defaultConventionalTemplate : templates_1.defaultSimpleTemplate;
            }
            const templateFunc = templateUtils_1.handlebars.compile(template);
            const releaseNotes = templateFunc(releaseData);
            const outputDir = path_1.default.dirname(outputFile);
            if (!fs_1.default.existsSync(outputDir)) {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
            }
            fs_1.default.writeFileSync(outputFile, releaseNotes);
            tl.setVariable('ReleaseNotes', releaseNotes);
            tl.setResult(tl.TaskResult.Succeeded, 'Release notes generated successfully');
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
        }
    });
}
exports.default = run;
