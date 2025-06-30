import * as tl from 'azure-pipelines-task-lib';

export interface WorkItem {
  id: string;
  url: string;
}

export async function getWorkItem(
    workItemId: string,
    organization: string,
    project: string,
    accessToken: string
): Promise<WorkItem> {

    organization = 'cardiffcouncilict';

    const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${workItemId}?api-version=7.1`;
    tl.debug(`Fetching work item ${workItemId} from ${url}`);
    const response = await fetch(url, {
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

    const data = await response.json();

    let workItem: WorkItem = {
        id: data.id,
        url: data.url
    };

    return workItem;
}

export function generateWorkItemUrl(workItemId: string, collectionUri?: string, teamProject?: string): string {
    if (!collectionUri || !teamProject) return `#${workItemId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_workitems/edit/${workItemId}`;
}