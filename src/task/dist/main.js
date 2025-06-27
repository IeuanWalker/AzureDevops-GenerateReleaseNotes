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
const tl = __importStar(require("azure-pipelines-task-lib"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const CommitUtils_1 = require("./utils/CommitUtils");
const PRUtils_1 = require("./utils/PRUtils");
const TemplateUtils_1 = require("./utils/TemplateUtils");
(0, TemplateUtils_1.registerHelpers)();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Set variables
            let startCommit = tl.getInput('startCommit', true);
            const endCommit = tl.getInput('endCommit', true);
            const outputFile = tl.getInput('outputFile', true);
            const templateFile = tl.getInput('templateFile', false) || undefined;
            const repoRoot = tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
            const systemAccessToken = tl.getVariable('System.AccessToken') || undefined;
            const teamProject = tl.getVariable('System.TeamProject') || undefined;
            const repositoryName = tl.getVariable('Build.Repository.Name') || undefined;
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
            let prs = [];
            commits.forEach(commit => {
                const mergePattern = /Merged PR (\d+): (.+)/i;
                const match = mergePattern.exec(commit.subject);
                if (!match) {
                    return;
                }
                const prId = match[1];
                const prTitle = match[2];
                var pr = (0, PRUtils_1.getPRInfo)(Number(prId), tl.getVariable('System.TeamFoundationCollectionUri') || '', teamProject || '', repositoryName, systemAccessToken);
                if (pr == null) {
                    tl.warning(`Failed to fetch PR details for PR ${prId}`);
                    return;
                }
                prs.push(pr);
            });
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
            // Get template
            let template;
            const hasValidTemplateFile = templateFile && templateFile.trim() !== '' && fs_1.default.existsSync(templateFile) && fs_1.default.statSync(templateFile).isFile();
            if (hasValidTemplateFile) {
                template = fs_1.default.readFileSync(templateFile, 'utf8');
            }
            else {
                template = TemplateUtils_1.defaultTemplate;
            }
            // Generate release notes
            const templateFunc = TemplateUtils_1.handlebars.compile(template);
            const releaseNotes = templateFunc(releaseData);
            // Save release notes to file
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
