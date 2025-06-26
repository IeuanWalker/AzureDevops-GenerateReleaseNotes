const util = require('util');
const child_process = require('child_process');
const execAsync = util.promisify(child_process.exec);

async function validateCommit(commit, repoRoot) {
    try {
        await execAsync(`git rev-parse --verify ${commit}`, { cwd: repoRoot });
        return true;
    } catch {
        return false;
    }
}

async function getCommitCount(repoRoot) {
    const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: repoRoot });
    return parseInt(stdout.trim());
}

async function getFirstCommit(repoRoot) {
    const { stdout } = await execAsync('git rev-list --max-parents=0 HEAD', { cwd: repoRoot });
    return stdout.trim();
}

async function getCommitsInRange(startCommit, endCommit, format, repoRoot) {
    try {
        const { stdout } = await execAsync(`git log ${startCommit}..${endCommit} ${format}`, { cwd: repoRoot });
        return stdout;
    } catch {
        // Try symmetric difference
        const { stdout } = await execAsync(`git log ${startCommit}...${endCommit} ${format}`, { cwd: repoRoot });
        return stdout;
    }
}

module.exports = {
    validateCommit,
    getCommitCount,
    getFirstCommit,
    getCommitsInRange,
};
