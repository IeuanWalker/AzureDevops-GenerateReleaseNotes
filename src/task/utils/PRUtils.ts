import * as tl from 'azure-pipelines-task-lib';
import type { WorkItem } from './WorkItemUtils'; 

export interface PullRequest {
  id: number;
  title: string;
  url: string;
  author: string;
  workItems?: WorkItem[]; 
}

export async function getPRInfo(
    pullRequestId: number,
    organization: string,
    project: string,
    repositoryId?: string,
    accessToken?: string) : Promise<PullRequest> {
    try {

        organization = 'cardiffcouncilict';

        const prUrl = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repositoryId}/pullRequests/${pullRequestId}?includeWorkItemRefs=true&api-version=7.1`;
        tl.debug(`Fetching PR details for PR ${pullRequestId} from ${prUrl}`);

        const response = await fetch(prUrl, {
            headers: {
                'Authorization': `Basic ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if(!response.ok){
            const text = await response.text();
            tl.warning(`Failed to fetch PR details for PR ${pullRequestId}: ${response.status} ${response.statusText}. Response: ${text}`);
            throw new Error(`Failed to fetch PR details for PR ${pullRequestId}: ${response.status} ${response.statusText}`);
        }

        tl.debug(`Response status for PR ${pullRequestId}: ${response.status} ${response.statusText}`);
        

        const prJson = await response.json();
        let prResult: PullRequest = {
            id: pullRequestId,
            title: prJson.title,
            url: prJson._links?.web?.href || prUrl,
            author: prJson.createdBy?.displayName || prJson.createdBy?.uniqueName || ''
        };
        
        // TODO: Get work items for PR
        return prResult;
    }
    catch (error) { 
        tl.warning(`Error fetching PR details for PR ${pullRequestId}: ${error}`);
        
        throw new Error(`Failed to fetch PR details for PR ${pullRequestId}: ${error}`);
    }
}

// TODO: Remove if the above works
function generatePRUrl(prId: string, collectionUri?: string, teamProject?: string): string {
    if (!collectionUri || !teamProject) return `#${prId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_git/pullrequest/${prId}`;
}