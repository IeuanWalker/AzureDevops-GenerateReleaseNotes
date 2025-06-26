import util from 'util';
import child_process from 'child_process';
import fetch from 'node-fetch';
import * as tl from 'azure-pipelines-task-lib/task';

const execAsync = util.promisify(child_process.exec);

export function generatePRUrl(prId: string, collectionUri?: string, teamProject?: string): string {
    if (!collectionUri || !teamProject) return `#${prId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_git/pullrequest/${prId}`;
}

export async function findPullRequestForCommit(
    commitHash: string,
    collectionUri: string,
    teamProject: string,
    repoRoot: string,
    repositoryName?: string,
    accessToken?: string
): Promise<null | { id: string; title: string; url: string; author: string }> {
    try {
        const { stdout } = await execAsync(`git show --format="%s%n%b" -s ${commitHash}`, { cwd: repoRoot });
        const mergePattern = /Merged PR (\d+): (.+)/i;
        const match = mergePattern.exec(stdout);
        if (match) {
            const prId = match[1];
            const prTitle = match[2];
            // If API details are available, fetch PR details from Azure DevOps
            if (repositoryName && accessToken) {
                const prUrl = `${collectionUri.replace(/\/$/, '')}${teamProject}/_apis/git/repositories/${repositoryName}/pullRequests/${prId}?api-version=7.1-preview.1`;
                tl.debug(`Fetching PR details for PR ${prId} from ${prUrl}`);
                const res = await fetch(prUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (res.ok) {
                    const pr = await res.json();
                    return {
                        id: prId,
                        title: pr.title || prTitle,
                        url: pr._links?.web?.href || prUrl,
                        author: pr.createdBy?.displayName || pr.createdBy?.uniqueName || ''
                    };
                } else {
                    tl.warning(`Failed to fetch PR details for PR ${prId}: ${res.status} ${res.statusText}`);
                }
            }
            // Fallback to just using the parsed info
            return {
                id: prId,
                title: prTitle,
                url: generatePRUrl(prId, collectionUri, teamProject),
                author: ''
            };
        }
    } catch (err) {
        tl.warning(`findPullRequestForCommit error: ${err}`);
    }
    return null;
}

// Helper to get work items for a PR
export async function getWorkItemsForPullRequest(
    collectionUri: string,
    teamProject: string,
    repositoryName: string,
    prId: string,
    accessToken: string
): Promise<Array<{ id: string; url: string }>> {
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
