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
exports.getWorkItemsForPullRequest = exports.getPullRequestsForCommit = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const tl = __importStar(require("azure-pipelines-task-lib/task"));
function joinUrl(...parts) {
    return parts.map((p, i) => {
        if (i === 0)
            return p.replace(/\/+$/, '');
        return p.replace(/^\/+/, '').replace(/\/+$/, '');
    }).join('/') + '/';
}
function getPullRequestsForCommit(collectionUri, teamProject, repositoryName, commitId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = joinUrl(collectionUri, teamProject, '_apis/git/repositories', repositoryName, 'commits', commitId, 'pullRequests') + '?api-version=7.1-preview.1';
        tl.debug(`Fetching PRs for commit ${commitId} from ${url}`);
        const res = yield (0, node_fetch_1.default)(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) {
            const text = yield res.text();
            tl.error(`Failed to fetch PRs for commit ${commitId}: ${res.status} ${res.statusText} - ${text}`);
            throw new Error(`Failed to fetch PRs for commit ${commitId}`);
        }
        const data = yield res.json();
        return data.value || [];
    });
}
exports.getPullRequestsForCommit = getPullRequestsForCommit;
function getWorkItemsForPullRequest(collectionUri, teamProject, repositoryName, pullRequestId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = joinUrl(collectionUri, teamProject, '_apis/git/repositories', repositoryName, 'pullRequests', pullRequestId, 'workitems') + '?api-version=7.1-preview.1';
        tl.debug(`Fetching work items for PR ${pullRequestId} from ${url}`);
        const res = yield (0, node_fetch_1.default)(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) {
            const text = yield res.text();
            tl.error(`Failed to fetch work items for PR ${pullRequestId}: ${res.status} ${res.statusText} - ${text}`);
            throw new Error(`Failed to fetch work items for PR ${pullRequestId}`);
        }
        const data = yield res.json();
        return data.value || [];
    });
}
exports.getWorkItemsForPullRequest = getWorkItemsForPullRequest;
