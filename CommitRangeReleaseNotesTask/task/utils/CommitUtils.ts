/**
 * Utility functions for interacting with the local Git repository.
 * Provides helpers for validating commits, counting commits, finding the first commit,
 * and retrieving commit logs in a given range. Used by the release notes generator task.
 */

import util = require('util');
import child_process = require('child_process');
import tl = require("azure-pipelines-task-lib/task");
import type { PullRequest } from './PRUtils'; 
import type { WorkItem } from './WorkItemUtils'; 

const execAsync = util.promisify(child_process.exec);

export async function validateCommit(commit: string, repoRoot: string): Promise<boolean> {
    if (!commit?.trim()) {
        return false;
    }
    
    try {
        await execAsync(`git rev-parse --verify ${commit}`, { cwd: repoRoot });
        return true;
    } catch (error) {
        tl.debug(`Invalid commit ${commit}: ${error}`);
        return false;
    }
}

export async function getCommitCount(repoRoot: string): Promise<number> {
    try {
        const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: repoRoot });
        const count = parseInt(stdout.trim(), 10);
        if (isNaN(count)) {
            throw new Error('Invalid commit count returned from git');
        }
        return count;
    } catch (error) {
        tl.error(`Failed to get commit count: ${error}`);
        throw error;
    }
}

export async function getFirstCommit(repoRoot: string): Promise<string> {
    try {
        const { stdout } = await execAsync('git rev-list --max-parents=0 HEAD', { cwd: repoRoot });
        const firstCommit = stdout.trim();
        if (!firstCommit) {
            throw new Error('No commits found in repository');
        }
        return firstCommit;
    } catch (error) {
        tl.error(`Failed to get first commit: ${error}`);
        throw error;
    }
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
    
    try {
        // Split by the custom commit separator
        return log.split('---END---\n').filter(Boolean).map(line => {
            // Remove any trailing newlines and split by first five pipes
            const parts = line.trim().split('|');
            if (parts.length < 5) {
                tl.warning(`Malformed git log entry: ${line}`);
                return null;
            }
            
            const [hash, author, email, date, subject, ...bodyParts] = parts;
            const body = bodyParts.join('|').replace(/\n+$/, '');
            
            // Validate timestamp
            const timestamp = parseInt(date, 10);
            if (isNaN(timestamp)) {
                tl.warning(`Invalid timestamp in commit ${hash}: ${date}`);
            }
            
            return {
                hash: hash || '',
                author: author || 'Unknown',
                email: email || '',
                date: isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp * 1000).toISOString(),
                subject: subject || '',
                body: body || '',
            } as Commit;
        }).filter(commit => commit !== null);
    } catch (error) {
        tl.error(`Error parsing git log: ${error}`);
        return [];
    }
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