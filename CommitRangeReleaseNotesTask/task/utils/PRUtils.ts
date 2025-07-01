import tl = require("azure-pipelines-task-lib/task");
import { getWorkItem, type WorkItem, type generateWorkItemUrl } from './WorkItemUtils'; 

export interface PullRequest {
  id: number;
  title: string;
  url: string;
  author: string;
  workItems: WorkItem[]; 
}

export async function getPRInfo(
    pullRequestId: number,
    organization: string,
    project: string,
    repositoryId: string,
    accessToken: string
): Promise<PullRequest | null> {
    try {
        const prUrl = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}?includeWorkItemRefs=true&api-version=7.1`;
        tl.debug(`Fetching PR details for PR ${pullRequestId} from ${prUrl}`);

        const response = await fetch(prUrl, {
            headers: {
                'Authorization': `Basic ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            tl.warning(`Failed to fetch PR details for PR ${pullRequestId}: ${response.status} ${response.statusText}. Response: ${errorText}`);
            return null;
        }

        tl.debug(`Response status for PR ${pullRequestId}: ${response.status} ${response.statusText}`);

        const prJson = await response.json();
        
        // Validate required fields
        if (!prJson.title) {
            tl.warning(`PR ${pullRequestId} missing required title field`);
            return null;
        }

        const prResult: PullRequest = {
            id: pullRequestId,
            title: prJson.title,
            url: prJson._links?.web?.href || `https://dev.azure.com/${organization}/${project}/_git/pullrequest/${pullRequestId}`,
            author: prJson.createdBy?.displayName || prJson.createdBy?.uniqueName || 'Unknown',
            workItems: []
        };

        // Fetch work items if they exist
        if (prJson.workItemRefs && Array.isArray(prJson.workItemRefs)) {
            const workItemPromises = prJson.workItemRefs.map(async (workItemRef: any) => {
                if (!workItemRef?.id) {
                    tl.debug(`Skipping invalid work item reference: ${JSON.stringify(workItemRef)}`);
                    return null;
                }

                tl.debug(`Fetching work item details for WorkItemRef ${JSON.stringify(workItemRef)}`);

                const workItem = await getWorkItem(
                    workItemRef.id,
                    organization,
                    project,
                    accessToken
                );

                if (!workItem) {
                    tl.warning(`Failed to fetch WorkItem details for ${workItemRef.id}`);
                    return null;
                }

                return workItem;
            });

            const workItems = await Promise.all(workItemPromises);
            prResult.workItems = workItems.filter(wi => wi !== null);
        }
        
        return prResult;
    } catch (error) { 
        tl.error(`Error fetching PR details for PR ${pullRequestId}: ${error}`);
        return null;
    }
}

// TODO: Remove if the above works
function generatePRUrl(prId: string, collectionUri?: string, teamProject?: string): string {
    if (!collectionUri || !teamProject) return `#${prId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_git/pullrequest/${prId}`;
}