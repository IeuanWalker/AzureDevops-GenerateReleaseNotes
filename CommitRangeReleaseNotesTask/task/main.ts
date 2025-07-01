import tl = require("azure-pipelines-task-lib/task");
import path = require('path');
import fs = require('fs');
import { validateCommit, getCommitCount, getFirstCommit, getCommitsInRange } from './utils/CommitUtils';
import { PullRequest, getPRInfo } from './utils/PRUtils';
import { registerHelpers, handlebars, defaultTemplate } from './utils/TemplateUtils';
import type { Commit } from './utils/CommitUtils'; 
import { WorkItem } from './utils/WorkItemUtils';

registerHelpers();

export async function GenerateReleaseNotes(
    startCommit: string,
    endCommit: string,
    outputFile: string,
    repoRoot: string,
    systemAccessToken: string,
    project: string,
    organization: string,
    repositoryId: string,
    templateFile?: string
): Promise<void> {
    // Input validation
    if (!startCommit?.trim() || !endCommit?.trim()) {
        tl.setResult(tl.TaskResult.Failed, 'Start and end commits are required');
        return;
    }
    
    if (!outputFile?.trim()) {
        tl.setResult(tl.TaskResult.Failed, 'Output file path is required');
        return;
    }
    
    if (!fs.existsSync(repoRoot)) {
        tl.setResult(tl.TaskResult.Failed, `Repository root does not exist: ${repoRoot}`);
        return;
    }

    // Validate repo root
    try {
        process.chdir(repoRoot);
    } catch (error) {
        tl.setResult(tl.TaskResult.Failed, `Failed to change to repository directory: ${error}`);
        return;
    }

    // Validate start commit
    if (!await validateCommit(startCommit, repoRoot)) {
        if (startCommit.includes('HEAD~') || startCommit.includes('HEAD^')) {
            try {
                const availableCommits = await getCommitCount(repoRoot);
                if (availableCommits < 10) {
                    startCommit = await getFirstCommit(repoRoot);
                }
                if (!await validateCommit(startCommit, repoRoot)) {
                    tl.setResult(tl.TaskResult.Failed, `Invalid start commit after fallback: ${startCommit}`);
                    return;
                }
            } catch (error) {
                tl.setResult(tl.TaskResult.Failed, `Error resolving start commit: ${error}`);
                return;
            }
        } else {
            tl.setResult(tl.TaskResult.Failed, `Invalid start commit: ${startCommit}`);
            return;
        }
    }

    // Validate end commit
    if (!await validateCommit(endCommit, repoRoot)) {
        tl.setResult(tl.TaskResult.Failed, `Invalid end commit: ${endCommit}`);
        return;
    }
    
    // Get list of commits
    let commits: Commit[];
    try {
        commits = await getCommitsInRange(startCommit, endCommit, repoRoot);
    } catch (error) {
        tl.setResult(tl.TaskResult.Failed, `Failed to get commits in range: ${error}`);
        return;
    }
    
    if (!commits || commits.length === 0) {
        tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
        return;
    }

    tl.debug(`Found ${commits.length} commits in range ${startCommit}..${endCommit}`);

    // Process commits to extract PR information
    const mergePattern = /Merged PR (\d+): (.+)/i;
    const prProcessingPromises = commits.map(async (commit) => {
        const match = mergePattern.exec(commit.subject);

        if (!match) {
            tl.debug(`Commit ${commit.hash} does not match PR merge pattern: ${commit.subject}`);
            return;
        }

        const prId = match[1];
        
        if (!systemAccessToken || !project || !repositoryId) {
            tl.warning(`Missing required parameters for PR ${prId} - skipping PR details fetch`);
            return;
        }

        try {
            const pr = await getPRInfo(
                Number(prId),
                organization,
                project,
                repositoryId,
                systemAccessToken
            );
            
            if (pr) {
                commit.pullRequest = pr;
                tl.debug(`Successfully fetched PR ${prId} with ${pr.workItems.length} work items`);
            } else {
                tl.warning(`Failed to fetch PR details for PR ${prId}`);
            }
        } catch (err) {
            tl.warning(`Error fetching PR details for PR ${prId}: ${err}`);
        }
    });

    // Wait for all PR processing to complete
    await Promise.all(prProcessingPromises);

    // Get all pull requests from commits (flattened, unique by id)
    const allPullRequests = commits
        .map(c => c.pullRequest)
        .filter((pr): pr is PullRequest => pr !== undefined && pr !== null)
        .filter((pr, idx, arr) => arr.findIndex(x => x.id === pr.id) === idx);

    // Get all work items from all pull requests (flattened, unique by id)
    const allWorkItems = allPullRequests
        .flatMap(pr => pr.workItems || [])
        .filter((wi, idx, arr) => arr.findIndex(x => x.id === wi.id) === idx);

    tl.debug(`Found ${allPullRequests.length} unique pull requests and ${allWorkItems.length} unique work items`);

    // Data for Handlebars template
    const releaseData: TemplateData = {
        commits,
        workItems: allWorkItems,
        pullRequests: allPullRequests,
        startCommit,
        endCommit,
        generatedDate: new Date().toISOString(),
        repositoryId,
        project
    };

    // Log release data for debugging (truncated)
    tl.debug(`Release data summary: ${commits.length} commits, ${allPullRequests.length} PRs, ${allWorkItems.length} work items`);

    // Get template
    let template: string;
    try {
        const hasValidTemplateFile = templateFile && 
            templateFile.trim() !== '' && 
            fs.existsSync(templateFile) && 
            fs.statSync(templateFile).isFile();
            
        if (hasValidTemplateFile) {
            template = fs.readFileSync(templateFile, 'utf8');
            tl.debug(`Using custom template: ${templateFile}`);
        } else {
            template = defaultTemplate;
            tl.debug('Using default template');
        }
    } catch (error) {
        tl.warning(`Error reading template file: ${error}. Using default template.`);
        template = defaultTemplate;
    }

    // Generate release notes
    let releaseNotes: string;
    try {
        const templateFunc = handlebars.compile(template);
        releaseNotes = templateFunc(releaseData);
    } catch (error) {
        tl.setResult(tl.TaskResult.Failed, `Failed to generate release notes from template: ${error}`);
        return;
    }

    // Save release notes to file
    try {
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputFile, releaseNotes, 'utf8');
        tl.debug(`Release notes written to: ${outputFile}`);
    } catch (error) {
        tl.setResult(tl.TaskResult.Failed, `Failed to write release notes to file: ${error}`);
        return;
    }

    // Set pipeline variable and result
    tl.setVariable('ReleaseNotes', releaseNotes);
    tl.setResult(tl.TaskResult.Succeeded, `Release notes generated successfully with ${commits.length} commits, ${allPullRequests.length} PRs, and ${allWorkItems.length} work items`);
}

interface TemplateData {
    commits: Commit[];
    workItems: WorkItem[];
    pullRequests: PullRequest[];
    startCommit: string;
    endCommit: string;
    generatedDate: string;
    repositoryId?: string;
    project?: string;
}
