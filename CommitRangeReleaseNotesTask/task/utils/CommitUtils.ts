/**
 * Utility functions for interacting with the local Git repository.
 * Provides helpers for validating commits, counting commits, finding the first commit,
 * and retrieving commit logs in a given range. Used by the release notes generator task.
 */

import util = require('util');
import child_process = require('child_process');
import type { PullRequest } from './PRUtils'; 
import type { WorkItem } from './WorkItemUtils'; 

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

// The format variable defines how each commit is displayed in the output of the git log command.
// It uses the --pretty=format: option to specify a custom format for each commit line.

// --pretty=format:"%h|%an|%ae|%at|%s"

// %h = abbreviated commit hash
// %an = author name
// %ae = author email
// %at = author date (UNIX timestamp)
// %s = commit subject (message title)
// Fields are separated by | for easy parsing.
export async function getCommitsInRange(
    startCommit: string,
    endCommit: string,
    repoRoot: string
): Promise<Commit[]> {
    try {
        const { stdout } = await execAsync(
            `git log ${startCommit}..${endCommit} --pretty=format:"%h|%an|%ae|%at|%s|%b---END---"`,
            { cwd: repoRoot }
        );
        return parseGitLog(stdout);
    } catch {
        // Try symmetric difference
        const { stdout } = await execAsync(
            `git log ${startCommit}...${endCommit} --pretty=format:"%h|%an|%ae|%at|%s|%b---END---"`,
            { cwd: repoRoot }
        );
        return parseGitLog(stdout);
    }
}

// Helper function to parse git log output into Commit[]
function parseGitLog(log: string): Commit[] {
    if (!log.trim()) return [];
    // Split by the custom commit separator
    return log.split('---END---\n').filter(Boolean).map(line => {
        // Remove any trailing newlines and split by first five pipes
        const [hash, author, email, date, subject, ...bodyParts] = line.trim().split('|');
        const body = bodyParts.join('|').replace(/\n+$/, '');
        return {
            hash,
            author,
            email,
            date: new Date(parseInt(date, 10) * 1000).toISOString(),
            subject,
            body,
        } as Commit;
    });
}


export interface Commit {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  body: string;
  workItems?: WorkItem[];
  commitUrl?: string;
  pullRequest?: PullRequest;
}