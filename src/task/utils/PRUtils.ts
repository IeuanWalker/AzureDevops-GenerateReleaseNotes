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
    prId: number,
    collectionUri: string,
    teamProject: string,
    repositoryName?: string,
    accessToken?: string) : Promise<PullRequest> {
    
    const prUrl = `${collectionUri.replace(/\/$/, '')}${teamProject}/_apis/git/repositories/${repositoryName}/pullRequests/${prId}?api-version=7.1-preview.1`;
    tl.debug(`Fetching PR details for PR ${prId} from ${prUrl}`);

    const response = await fetch(prUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if(!response.ok){
        tl.warning(`Failed to fetch PR details for PR ${prId}: ${response.status} ${response.statusText}`);
    }

    const prJson = await response.json();
    let prResult: PullRequest = {
        id: prId,
        title: prJson.title,
        url: prJson._links?.web?.href || prUrl,
        author: prJson.createdBy?.displayName || prJson.createdBy?.uniqueName || ''
    };
    
    // TODO: Get work items for PR

    return prResult;
}

// TODO: Remove if the above works
function generatePRUrl(prId: string, collectionUri?: string, teamProject?: string): string {
    if (!collectionUri || !teamProject) return `#${prId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_git/pullrequest/${prId}`;
}