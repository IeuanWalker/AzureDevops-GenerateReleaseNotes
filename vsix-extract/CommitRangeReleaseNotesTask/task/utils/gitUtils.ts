/**
 * gitUtils.ts
 *
 * Utility functions for interacting with the local Git repository.
 * Provides helpers for validating commits, counting commits, finding the first commit,
 * and retrieving commit logs in a given range. Used by the release notes generator task.
 */

import util from 'util';
import child_process from 'child_process';

const execAsync = util.promisify(child_process.exec);

export async function validateCommit(commit: string, repoRoot: string): Promise<boolean> {
    try {
        await execAsync(`git rev-parse --verify ${commit}`, { cwd: repoRoot });
        return true;
    } catch {
        return false;
    }
}

export async function getCommitCount(repoRoot: string): Promise<number> {
    const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: repoRoot });
    return parseInt(stdout.trim());
}

export async function getFirstCommit(repoRoot: string): Promise<string> {
    const { stdout } = await execAsync('git rev-list --max-parents=0 HEAD', { cwd: repoRoot });
    return stdout.trim();
}

export async function getCommitsInRange(
    startCommit: string,
    endCommit: string,
    format: string,
    repoRoot: string
): Promise<string> {
    try {
        const { stdout } = await execAsync(`git log ${startCommit}..${endCommit} ${format}`, { cwd: repoRoot });
        return stdout;
    } catch {
        // Try symmetric difference
        const { stdout } = await execAsync(`git log ${startCommit}...${endCommit} ${format}`, { cwd: repoRoot });
        return stdout;
    }
}
