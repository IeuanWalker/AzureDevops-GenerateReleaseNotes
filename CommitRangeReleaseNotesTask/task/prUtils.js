const util = require('util');
const child_process = require('child_process');
const execAsync = util.promisify(child_process.exec);

function generatePRUrl(prId, collectionUri, teamProject) {
    if (!collectionUri || !teamProject) return `#${prId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_git/pullrequest/${prId}`;
}

async function findPullRequestForCommit(commitHash, collectionUri, teamProject, repoRoot) {
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

module.exports = {
    generatePRUrl,
    findPullRequestForCommit,
};
