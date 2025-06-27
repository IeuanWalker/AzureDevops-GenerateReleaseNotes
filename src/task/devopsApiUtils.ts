import fetch from 'node-fetch';
import * as tl from 'azure-pipelines-task-lib';

function joinUrl(...parts: string[]): string {
    return parts.map((p, i) => {
        if (i === 0) return p.replace(/\/+$/, '');
        return p.replace(/^\/+/, '').replace(/\/+$/, '');
    }).join('/') + '/';
}

export async function getPullRequestsForCommit(collectionUri: string, teamProject: string, repositoryName: string, commitId: string, accessToken: string) {
    const url = joinUrl(collectionUri, teamProject, '_apis/git/repositories', repositoryName, 'commits', commitId, 'pullRequests') + '?api-version=7.1-preview.1';
    tl.debug(`Fetching PRs for commit ${commitId} from ${url}`);
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) {
        const text = await res.text();
        tl.error(`Failed to fetch PRs for commit ${commitId}: ${res.status} ${res.statusText} - ${text}`);
        throw new Error(`Failed to fetch PRs for commit ${commitId}`);
    }
    const data = await res.json();
    return data.value || [];
}

export async function getWorkItemsForPullRequest(collectionUri: string, teamProject: string, repositoryName: string, pullRequestId: string, accessToken: string) {
    const url = joinUrl(collectionUri, teamProject, '_apis/git/repositories', repositoryName, 'pullRequests', pullRequestId, 'workitems') + '?api-version=7.1-preview.1';
    tl.debug(`Fetching work items for PR ${pullRequestId} from ${url}`);
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) {
        const text = await res.text();
        tl.error(`Failed to fetch work items for PR ${pullRequestId}: ${res.status} ${res.statusText} - ${text}`);
        throw new Error(`Failed to fetch work items for PR ${pullRequestId}`);
    }
    const data = await res.json();
    return data.value || [];
}
