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
exports.generateWorkItemUrl = exports.getWorkItem = void 0;
const tl = require("azure-pipelines-task-lib/task");
function getWorkItem(workItemId, organization, project, accessToken) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const fields = [
            "System.Title",
            "System.WorkItemType",
            "System.AssignedTo",
        ];
        const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${workItemId}?fields=${fields.join(',')}&api-version=7.1`;
        tl.debug(`Fetching work item ${workItemId} from ${url}`);
        try {
            const response = yield fetch(url, {
                headers: {
                    'Authorization': `Basic ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const errorText = yield response.text();
                tl.warning(`Failed to fetch work item ${workItemId}: ${response.status} ${response.statusText}. Response: ${errorText}`);
                return null;
            }
            tl.debug(`Response status for WorkItem ${workItemId}: ${response.status} ${response.statusText}`);
            const data = yield response.json();
            // Log the full JSON response for debugging
            JSON.stringify(data, null, 2)
                .split('\n')
                .forEach(line => tl.debug(line));
            // Validate required fields
            if (!((_a = data.fields) === null || _a === void 0 ? void 0 : _a["System.Title"]) || !((_b = data.fields) === null || _b === void 0 ? void 0 : _b["System.WorkItemType"])) {
                tl.warning(`Work item ${workItemId} missing required fields`);
                return null;
            }
            const workItem = {
                id: data.id,
                title: data.fields["System.Title"],
                workItemType: data.fields["System.WorkItemType"],
                url: data.url || generateWorkItemUrl(workItemId, undefined, project),
                assignedTo: data.fields["System.AssignedTo"] ? {
                    displayName: data.fields["System.AssignedTo"].displayName || 'Unassigned',
                    uniqueName: data.fields["System.AssignedTo"].uniqueName || '',
                    imageUrl: data.fields["System.AssignedTo"].imageUrl || ''
                } : {
                    displayName: 'Unassigned',
                    uniqueName: '',
                    imageUrl: ''
                }
            };
            return workItem;
        }
        catch (error) {
            tl.error(`Error fetching work item ${workItemId}: ${error}`);
            return null;
        }
    });
}
exports.getWorkItem = getWorkItem;
function generateWorkItemUrl(workItemId, collectionUri, teamProject) {
    if (!collectionUri || !teamProject)
        return `#${workItemId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_workitems/edit/${workItemId}`;
}
exports.generateWorkItemUrl = generateWorkItemUrl;
