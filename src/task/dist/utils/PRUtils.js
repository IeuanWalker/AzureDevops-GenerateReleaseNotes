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
exports.getPRInfo = void 0;
const tl = __importStar(require("azure-pipelines-task-lib"));
const WorkItemUtils_1 = require("./WorkItemUtils");
function getPRInfo(pullRequestId, organization, project, repositoryId, accessToken) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const prUrl = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}?includeWorkItemRefs=true&api-version=7.1`;
            tl.debug(`Fetching PR details for PR ${pullRequestId} from ${prUrl}`);
            const response = yield fetch(prUrl, {
                headers: {
                    'Authorization': `Basic ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const text = yield response.text();
                tl.warning(`Failed to fetch PR details for PR ${pullRequestId}: ${response.status} ${response.statusText}. Response: ${text}`);
                throw new Error(`Failed to fetch PR details for PR ${pullRequestId}: ${response.status} ${response.statusText}`);
            }
            tl.debug(`Response status for PR ${pullRequestId}: ${response.status} ${response.statusText}`);
            const prJson = yield response.json();
            let prResult = {
                id: pullRequestId,
                title: prJson.title,
                url: ((_b = (_a = prJson._links) === null || _a === void 0 ? void 0 : _a.web) === null || _b === void 0 ? void 0 : _b.href) || prUrl,
                author: ((_c = prJson.createdBy) === null || _c === void 0 ? void 0 : _c.displayName) || ((_d = prJson.createdBy) === null || _d === void 0 ? void 0 : _d.uniqueName) || '',
                workItems: []
            };
            yield Promise.all(prJson.workItemRefs.map((workItemRef) => __awaiter(this, void 0, void 0, function* () {
                tl.debug(`Fetching work item details for WorkItemRef ${JSON.stringify(workItemRef)}`);
                let workItem = yield (0, WorkItemUtils_1.getWorkItem)(workItemRef.id, organization, project, accessToken);
                if (workItem == null) {
                    tl.warning(`Failed to fetch WorkItem details ${workItem.id}`);
                    return;
                }
                prResult.workItems.push(workItem);
            })));
            // TODO: Get work items for PR
            return prResult;
        }
        catch (error) {
            tl.warning(`Error fetching PR details for PR ${pullRequestId}: ${error}`);
            throw new Error(`Failed to fetch PR details for PR ${pullRequestId}: ${error}`);
        }
    });
}
exports.getPRInfo = getPRInfo;
// TODO: Remove if the above works
function generatePRUrl(prId, collectionUri, teamProject) {
    if (!collectionUri || !teamProject)
        return `#${prId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_git/pullrequest/${prId}`;
}
