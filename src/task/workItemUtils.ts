export interface WorkItem {
    id: string;
    url: string;
}

export function parseWorkItems(commitMessage: string): WorkItem[] {
    const workItems: WorkItem[] = [];
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

export function generateWorkItemUrl(workItemId: string, collectionUri?: string, teamProject?: string): string {
    if (!collectionUri || !teamProject) return `#${workItemId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_workitems/edit/${workItemId}`;
}
