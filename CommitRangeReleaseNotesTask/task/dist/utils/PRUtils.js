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
exports.getPRInfo = void 0;
const tl = require("azure-pipelines-task-lib/task");
const WorkItemUtils_1 = require("./WorkItemUtils");
function getPRInfo(pullRequestId, apiUrl, project, repositoryId, accessToken) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const prUrl = `${apiUrl}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}?includeWorkItemRefs=true&api-version=7.1`;
            console.log(`Fetching PR details for PR ${pullRequestId} from ${prUrl}`);
            const response = yield fetch(prUrl, {
                headers: {
                    'Authorization': accessToken,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const errorText = yield response.text();
                console.warn(`Failed to fetch PR details for PR ${pullRequestId}: ${response.status} ${response.statusText}. Response: ${errorText}`);
                return null;
            }
            console.log(`Response status for PR ${pullRequestId}: ${response.status} ${response.statusText}`);
            const prJson = yield response.json();
            // Validate required fields
            if (!prJson.title) {
                console.warn(`PR ${pullRequestId} missing required title field`);
                return null;
            }
            const prResult = {
                id: pullRequestId,
                title: prJson.title,
                url: ((_b = (_a = prJson._links) === null || _a === void 0 ? void 0 : _a.web) === null || _b === void 0 ? void 0 : _b.href) || `${apiUrl}/${project}/_git/pullrequest/${pullRequestId}`,
                author: ((_c = prJson.createdBy) === null || _c === void 0 ? void 0 : _c.displayName) || ((_d = prJson.createdBy) === null || _d === void 0 ? void 0 : _d.uniqueName) || 'Unknown',
                workItems: []
            };
            // Fetch work items if they exist
            if (prJson.workItemRefs && Array.isArray(prJson.workItemRefs)) {
                const workItemPromises = prJson.workItemRefs.map((workItemRef) => __awaiter(this, void 0, void 0, function* () {
                    if (!(workItemRef === null || workItemRef === void 0 ? void 0 : workItemRef.id)) {
                        console.log(`Skipping invalid work item reference: ${JSON.stringify(workItemRef)}`);
                        return null;
                    }
                    console.log(`Fetching work item details for WorkItemRef ${JSON.stringify(workItemRef)}`);
                    const workItem = yield (0, WorkItemUtils_1.getWorkItem)(workItemRef.id, apiUrl, project, accessToken);
                    if (!workItem) {
                        tl.warning(`Failed to fetch WorkItem details for ${workItemRef.id}`);
                        return null;
                    }
                    return workItem;
                }));
                const workItems = yield Promise.all(workItemPromises);
                prResult.workItems = workItems.filter(wi => wi !== null);
            }
            return prResult;
        }
        catch (error) {
            console.error(`Error fetching PR details for PR ${pullRequestId}: ${error}`);
            return null;
        }
    });
}
exports.getPRInfo = getPRInfo;
