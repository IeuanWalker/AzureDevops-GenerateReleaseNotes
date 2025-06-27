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
exports.getWorkItemsForPullRequest = exports.findPullRequestForCommit = exports.generatePRUrl = void 0;
const util_1 = __importDefault(require("util"));
const child_process_1 = __importDefault(require("child_process"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const tl = __importStar(require("azure-pipelines-task-lib/task"));
const execAsync = util_1.default.promisify(child_process_1.default.exec);
function generatePRUrl(prId, collectionUri, teamProject) {
    if (!collectionUri || !teamProject)
        return `#${prId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_git/pullrequest/${prId}`;
}
exports.generatePRUrl = generatePRUrl;
function findPullRequestForCommit(commitHash, collectionUri, teamProject, repoRoot, repositoryName, accessToken) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { stdout } = yield execAsync(`git show --format="%s%n%b" -s ${commitHash}`, { cwd: repoRoot });
            const mergePattern = /Merged PR (\d+): (.+)/i;
            const match = mergePattern.exec(stdout);
            if (match) {
                const prId = match[1];
                const prTitle = match[2];
                // If API details are available, fetch PR details from Azure DevOps
                if (repositoryName && accessToken) {
                    const prUrl = `${collectionUri.replace(/\/$/, '')}${teamProject}/_apis/git/repositories/${repositoryName}/pullRequests/${prId}?api-version=7.1-preview.1`;
                    tl.debug(`Fetching PR details for PR ${prId} from ${prUrl}`);
                    const res = yield (0, node_fetch_1.default)(prUrl, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (res.ok) {
                        const pr = yield res.json();
                        return {
                            id: prId,
                            title: pr.title || prTitle,
                            url: ((_b = (_a = pr._links) === null || _a === void 0 ? void 0 : _a.web) === null || _b === void 0 ? void 0 : _b.href) || prUrl,
                            author: ((_c = pr.createdBy) === null || _c === void 0 ? void 0 : _c.displayName) || ((_d = pr.createdBy) === null || _d === void 0 ? void 0 : _d.uniqueName) || ''
                        };
                    }
                    else {
                        tl.warning(`Failed to fetch PR details for PR ${prId}: ${res.status} ${res.statusText}`);
                    }
                }
                // Fallback to just using the parsed info
                return {
                    id: prId,
                    title: prTitle,
                    url: generatePRUrl(prId, collectionUri, teamProject),
                    author: ''
                };
            }
        }
        catch (err) {
            tl.warning(`findPullRequestForCommit error: ${err}`);
        }
        return null;
    });
}
exports.findPullRequestForCommit = findPullRequestForCommit;
// Helper to get work items for a PR
function getWorkItemsForPullRequest(collectionUri, teamProject, repositoryName, prId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${collectionUri.replace(/\/$/, '')}${teamProject}/_apis/git/repositories/${repositoryName}/pullRequests/${prId}/workitems?api-version=7.1-preview.1`;
        tl.debug(`Fetching work items for PR ${prId} from ${url}`);
        const res = yield (0, node_fetch_1.default)(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) {
            tl.warning(`Failed to fetch work items for PR ${prId}: ${res.status} ${res.statusText}`);
            return [];
        }
        const data = yield res.json();
        return (data.value || []).map((wi) => {
            var _a, _b, _c, _d;
            return ({
                id: ((_a = wi.id) === null || _a === void 0 ? void 0 : _a.toString()) || wi.id || ((_b = wi.target) === null || _b === void 0 ? void 0 : _b.id),
                url: wi.url || ((_d = (_c = wi._links) === null || _c === void 0 ? void 0 : _c.web) === null || _d === void 0 ? void 0 : _d.href) || ''
            });
        });
    });
}
exports.getWorkItemsForPullRequest = getWorkItemsForPullRequest;
