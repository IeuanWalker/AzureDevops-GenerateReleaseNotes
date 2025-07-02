import tl = require("azure-pipelines-task-lib/task");
import path = require('path');
import fs = require('fs');
import { validateCommit, getCommitCount, getFirstCommit, getCommitsInRange } from './utils/CommitUtils';
import { PullRequest, getPRInfo } from './utils/PRUtils';
import { registerHelpers, handlebars, defaultTemplate } from './utils/TemplateUtils';
import type { Commit } from './utils/CommitUtils'; 
import { WorkItem, WorkItemAssignedTo } from './utils/WorkItemUtils';
import { printJson } from './utils/JsonOutput';

registerHelpers();

export async function GenerateReleaseNotes(
    startCommit: string,
    endCommit: string,
    outputFile: string,
    repoRoot: string,
    systemAccessToken: string,
    project: string,
    apiUrl: string,
    repositoryId: string,
    templateFile?: string
): Promise<void> {
    // Variables
    console.log();
    console.log('VARIABLES');
    console.log(`Start Commit: ${startCommit}`);
    console.log(`End Commit: ${endCommit}`);
    console.log(`Output File: ${outputFile}`);
    console.log(`Repository Root: ${repoRoot}`);
    console.log(`System Access Token: ${systemAccessToken ? 'Provided' : 'Not Provided'}`);
    console.log(`Project: ${project}`);
    console.log(`ApiUrl: ${apiUrl}`);
    console.log(`Repository ID: ${repositoryId}`);
    console.log(`Template File: ${templateFile ? templateFile : 'Default'}`);
    console.log();

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

    console.log();
    console.log(`Found ${commits.length} commits in range ${startCommit}..${endCommit}`);
    console.log();

    // Process commits to extract PR information
    const mergePattern = /Merged PR (\d+): (.+)/i;
    const prProcessingPromises = commits.map(async (commit) => {
        const match = mergePattern.exec(commit.subject);

        if (!match) {
            console.warn(`Commit ${commit.hash} does not match PR merge pattern: ${commit.subject}`);
            return;
        }

        const prId = match[1];
        
        if (!systemAccessToken || !project || !repositoryId) {
            console.warn(`Missing required parameters for PR ${prId} - skipping PR details fetch`);
            return;
        }

        try {
            const pr = await getPRInfo(
                Number(prId),
                apiUrl,
                project,
                repositoryId,
                systemAccessToken
            );
            
            if (pr) {
                commit.pullRequest = pr;
                console.log(`Successfully fetched PR ${prId} with ${pr.workItems.length} work items`);
            } else {
                console.warn(`Failed to fetch PR details for PR ${prId}`);
            }
        } catch (err) {
            console.warn(`Error fetching PR details for PR ${prId}: ${err}`);
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
    const allWorkItems = getDistinctWorkItemListFromPRs(allPullRequests);

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

    printJson(releaseData);

    // Get template
    let template: string;
    try {
        const hasValidTemplateFile = templateFile && 
            templateFile.trim() !== '' && 
            fs.existsSync(templateFile) && 
            fs.statSync(templateFile).isFile();
            
        if (hasValidTemplateFile) {
            template = fs.readFileSync(templateFile, 'utf8');
            console.log(`Using custom template: ${templateFile}`);
        } else {
            template = defaultTemplate;
            console.log('Using default template');
        }
    } catch (error) {
        console.warn(`Error reading template file: ${error}. Using default template.`);
        template = defaultTemplate;
    }


    template += `
---

_Generated by [IeuanWalker.ReleaseNotesGenerator](https://marketplace.visualstudio.com/items?itemName=IeuanWalker.ReleaseNotesGenerator)_`

    // Generate release notes
    let releaseNotes: string;
    try {
        require('handlebars-helpers')({ handlebars });
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
        console.log(`Release notes written to: ${outputFile}`);
    } catch (error) {
        tl.setResult(tl.TaskResult.Failed, `Failed to write release notes to file: ${error}`);
        return;
    }

    tl.setResult(tl.TaskResult.Succeeded, `Release notes generated successfully with ${commits.length} commits, ${allPullRequests.length} PRs, and ${allWorkItems.length} work items`);
}

function getDistinctWorkItemListFromPRs(prs: PullRequest[]): WorkItemList[] {
    const workItemMap = new Map<string, WorkItemList>();

    for (const pr of prs) {
        for (const workItem of pr.workItems || []) {
            if (!workItemMap.has(workItem.id)) {
                workItemMap.set(workItem.id, {
                    id: workItem.id,
                    title: workItem.title,
                    workItemType: workItem.workItemType,
                    url: workItem.url,
                    assignedTo: workItem.assignedTo,
                    pullRequests: [pr]
                });
            } else {
                const wiList = workItemMap.get(workItem.id)!;
                if (!wiList.pullRequests.some(existingPr => existingPr.id === pr.id)) {
                    wiList.pullRequests.push(pr);
                }
            }
        }
    }

    return Array.from(workItemMap.values());
}



interface TemplateData {
    commits: Commit[];
    workItems: WorkItemList[];
    pullRequests: PullRequest[];
    startCommit: string;
    endCommit: string;
    generatedDate: string;
    repositoryId?: string;
    project?: string;
}

interface WorkItemList {
    id: string;
    title: string;
    workItemType: string; 
    url: string;
    assignedTo: WorkItemAssignedTo;
    pullRequests: PullRequest[];
  }