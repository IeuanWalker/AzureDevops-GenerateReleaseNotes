import tl = require("azure-pipelines-task-lib/task");
import { getWorkItem, type WorkItem } from './WorkItemUtils';
import { printJson } from "./JsonOutput";

export interface PullRequest {
  id: number;
  title: string;
  description: string;
  url: string;
  author: PrAuthor;
  workItems: WorkItem[]; 
}
export interface PrAuthor {
    displayName: string;
    uniqueName: string;
    imageUrl: string;
}

export async function getPRInfo(
    pullRequestId: number,
    apiUrl: string,
    project: string,
    repositoryId: string,
    accessToken: string
): Promise<PullRequest | null> {
    try {
        const prUrl = `${apiUrl}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}?includeWorkItemRefs=true&api-version=7.1`;
        console.log(`Fetching PR details for PR ${pullRequestId} from ${prUrl}`);

        const response = await fetch(prUrl, {
            headers: {
                'Authorization': accessToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Failed to fetch PR details for PR ${pullRequestId}: ${response.status} ${response.statusText}. Response: ${errorText}`);
            return null;
        }

        console.log(`Response status for PR ${pullRequestId}: ${response.status} ${response.statusText}`);

        const prJson = await response.json();
        
        // Validate required fields
        if (!prJson.title) {
            console.warn(`PR ${pullRequestId} missing required title field`);
            return null;
        }

        const webUrl =
            prJson.repository?.webUrl
                ? `${prJson.repository.webUrl}/pullrequest/${pullRequestId}`
                : (prJson._links?.web?.href || `${apiUrl}/${project}/_git/pullrequest/${pullRequestId}`);

        const prAuthor: PrAuthor = {
            displayName: prJson.createdBy?.displayName || '',
            uniqueName: prJson.createdBy?.uniqueName || '',
            imageUrl: prJson.createdBy?.imageUrl 
                || prJson.createdBy?._links?.avatar?.href 
                || '',
        };
        const prResult: PullRequest = {
            id: pullRequestId,
            title: prJson.title,
            description: prJson.description || '',
            url: webUrl,
            author: prAuthor,
            workItems: []
        };

        // Fetch work items if they exist
        if (prJson.workItemRefs && Array.isArray(prJson.workItemRefs)) {
            const workItemPromises = prJson.workItemRefs.map(async (workItemRef: any) => {
                if (!workItemRef?.id) {
                    console.log(`Skipping invalid work item reference: ${JSON.stringify(workItemRef)}`);
                    return null;
                }

                console.log(`Fetching work item details for WorkItemRef ${JSON.stringify(workItemRef)}`);

                const workItem = await getWorkItem(
                    workItemRef.id,
                    apiUrl,
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
        console.error(`Error fetching PR details for PR ${pullRequestId}: ${error}`);
        return null;
    }
}