"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWorkItemUrl = exports.parseWorkItems = void 0;
function parseWorkItems(commitMessage) {
    const workItems = [];
    const patterns = [
        /AB#(\d+)/gi,
        /#(\d+)/g,
        /work\s+item\s+(\d+)/gi
    ];
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(commitMessage)) !== null) {
            const id = match[1];
            if (!workItems.find(wi => wi.id === id)) {
                workItems.push({ id, url: '' });
            }
        }
    });
    return workItems;
}
exports.parseWorkItems = parseWorkItems;
function generateWorkItemUrl(workItemId, collectionUri, teamProject) {
    if (!collectionUri || !teamProject)
        return `#${workItemId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_workitems/edit/${workItemId}`;
}
exports.generateWorkItemUrl = generateWorkItemUrl;
