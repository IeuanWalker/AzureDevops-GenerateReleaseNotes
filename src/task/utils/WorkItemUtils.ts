import * as tl from 'azure-pipelines-task-lib';

export interface WorkItem {
  id: string;
  url: string;
}

export async function getWorkItemsForPullRequest(
    collectionUri: string,
    teamProject: string,
    repositoryName: string,
    prId: string,
    accessToken: string
): Promise<Array<WorkItem>> {
    const url = `${collectionUri.replace(/\/$/, '')}${teamProject}/_apis/git/repositories/${repositoryName}/pullRequests/${prId}/workitems?api-version=7.1-preview.1`;
    tl.debug(`Fetching work items for PR ${prId} from ${url}`);
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!res.ok) {
        tl.warning(`Failed to fetch work items for PR ${prId}: ${res.status} ${res.statusText}`);
        return [];
    }
    const data = await res.json();
    return (data.value || []).map((wi: any) => ({
        id: wi.id?.toString() || wi.id || wi.target?.id,
        url: wi.url || wi._links?.web?.href || ''
    }));
}

export function generateWorkItemUrl(workItemId: string, collectionUri?: string, teamProject?: string): string {
    if (!collectionUri || !teamProject) return `#${workItemId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_workitems/edit/${workItemId}`;
}