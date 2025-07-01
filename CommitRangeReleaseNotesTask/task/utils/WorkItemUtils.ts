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

export interface WorkItemApiResponse {
    id: string;
    url: string;
    fields: {
        "System.Title": string;
        "System.WorkItemType": string;
        "System.AssignedTo"?: WorkItemAssignedTo;
    };
}

export async function getWorkItem(
    workItemId: string,
    apiUrl: string,
    project: string,
    accessToken: string
): Promise<WorkItem | null> {
    const fields = [
        "System.Title",
        "System.WorkItemType",
        "System.AssignedTo",
    ];

    const url = `${apiUrl}/${project}/_apis/wit/workitems/${workItemId}?fields=${fields.join(',')}&api-version=7.1`;
    console.log(`Fetching work item ${workItemId} from ${url}`);
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Failed to fetch work item ${workItemId}: ${response.status} ${response.statusText}. Response: ${errorText}`);
            return null;
        }

        console.log(`Response status for WorkItem ${workItemId}: ${response.status} ${response.statusText}`);

        const data: WorkItemApiResponse = await response.json();

        // Validate required fields
        if (!data.fields?.["System.Title"] || !data.fields?.["System.WorkItemType"]) {
            console.warn(`Work item ${workItemId} missing required fields`);
            return null;
        }

        const workItem: WorkItem = {
            id: data.id,
            title: data.fields["System.Title"],
            workItemType: data.fields["System.WorkItemType"],
            url: data.url,
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
    } catch (error) {
        console.error(`Error fetching work item ${workItemId}: ${error}`);
        return null;
    }
}