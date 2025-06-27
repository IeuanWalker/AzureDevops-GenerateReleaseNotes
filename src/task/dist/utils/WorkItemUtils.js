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
exports.generateWorkItemUrl = exports.getWorkItemsForPullRequest = void 0;
const tl = __importStar(require("azure-pipelines-task-lib"));
function getWorkItemsForPullRequest(collectionUri, teamProject, repositoryName, prId, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${collectionUri.replace(/\/$/, '')}${teamProject}/_apis/git/repositories/${repositoryName}/pullRequests/${prId}/workitems?api-version=7.1-preview.1`;
        tl.debug(`Fetching work items for PR ${prId} from ${url}`);
        const res = yield fetch(url, {
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
function generateWorkItemUrl(workItemId, collectionUri, teamProject) {
    if (!collectionUri || !teamProject)
        return `#${workItemId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_workitems/edit/${workItemId}`;
}
exports.generateWorkItemUrl = generateWorkItemUrl;
