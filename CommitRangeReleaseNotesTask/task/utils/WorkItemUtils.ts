import * as tl from 'azure-pipelines-task-lib';

export interface WorkItem {
  id: string;
  title: string;
  workItemType: string; 
  url: string;
  assignedTo: WorkItemAssignedTo;
}

export interface WorkItemAssignedTo {
    displayName: string;
    uniqueName: string;
    imageUrl: string;
}

export async function getWorkItem(
    workItemId: string,
    organization: string,
    project: string,
    accessToken: string
): Promise<WorkItem> {

    organization = 'cardiffcouncilict';

    let fields = [
        "System.Title",
        "System.WorkItemType",
        "System.AssignedTo",
    ]

    const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${workItemId}?fields=${fields}&api-version=7.1`;
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

    // Log the full JSON response for debugging
    JSON.stringify(data, null, 2)
      .split('\n')
      .forEach(line => tl.debug(line));

    let workItem: WorkItem = {
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
}

export function generateWorkItemUrl(workItemId: string, collectionUri?: string, teamProject?: string): string {
    if (!collectionUri || !teamProject) return `#${workItemId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_workitems/edit/${workItemId}`;
}