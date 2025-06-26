import util from 'util';
import child_process from 'child_process';

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
    repoRoot: string
): Promise<null | { id: string; title: string; url: string; author: string }> {
    try {
        const { stdout } = await execAsync(`git show --format="%s%n%b" -s ${commitHash}`, { cwd: repoRoot });
        const mergePattern = /Merged PR (\d+): (.+)/i;
        const match = mergePattern.exec(stdout);
        if (match) {
            const prId = match[1];
            const prTitle = match[2];
            return {
                id: prId,
                title: prTitle,
                url: generatePRUrl(prId, collectionUri, teamProject),
                author: ''
            };
        }
    } catch {}
    return null;
}
