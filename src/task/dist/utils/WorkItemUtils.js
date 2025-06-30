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
exports.generateWorkItemUrl = exports.getWorkItem = void 0;
const tl = __importStar(require("azure-pipelines-task-lib"));
function getWorkItem(workItemId, organization, project, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        organization = 'cardiffcouncilict';
        let fields = [
            "System.Title",
            "System.WorkItemType",
            "System.AssignedTo",
        ];
        const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${workItemId}?fields=${fields}&api-version=7.1`;
        tl.debug(`Fetching work item ${workItemId} from ${url}`);
        const response = yield fetch(url, {
            headers: {
                'Authorization': `Basic ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            tl.warning(`Failed to fetch work items ${workItemId}: ${response.status} ${response.statusText}`);
            return;
        }
        tl.debug(`Response status for WorkItem ${workItemId}: ${response.status} ${response.statusText}`);
        const data = yield response.json();
        // Log the full JSON response for debugging
        JSON.stringify(data, null, 2)
            .split('\n')
            .forEach(line => tl.debug(line));
        let workItem = {
            id: data.id,
            title: data.fields["System.Title"],
            workItemType: data.fields["System.WorkItemType"],
            url: data.url,
            assignedTo: {
                displayName: data.fields["System.AssignedTo"].displayName,
                uniqueName: data.fields["System.AssignedTo"].uniqueName,
                imageUrl: data.fields["System.AssignedTo"].imageUrl
            },
        };
        return workItem;
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
