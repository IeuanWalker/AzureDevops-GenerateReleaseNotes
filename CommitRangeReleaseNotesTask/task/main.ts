import * as tl from 'azure-pipelines-task-lib';
import path from 'path';
import fs from 'fs';
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
    teamProject: string,
    repositoryName: string,
    templateFile?: string
): Promise<void> {
    // Validate repo root
    process.chdir(repoRoot);

    // Validate start commit
    if (!await validateCommit(startCommit, repoRoot)) {
        if (startCommit.includes('HEAD~') || startCommit.includes('HEAD^')) {
            const availableCommits = await getCommitCount(repoRoot);
            if (availableCommits < 10) {
                startCommit = await getFirstCommit(repoRoot);
            }
            if (!await validateCommit(startCommit, repoRoot)) {
                tl.setResult(tl.TaskResult.Failed, `Invalid start commit: ${startCommit}`);
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
    } catch {
        tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
        return;
    }
    if (!commits || commits.length === 0) {
        tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
        return;
    }

    await Promise.all(commits.map(async commit => {
        const mergePattern = /Merged PR (\d+): (.+)/i;
        const match = mergePattern.exec(commit.subject);

        if (!match) {
            tl.debug(`Commit ${commit.subject} does not match PR merge pattern`);
            return null;
        }

        const prId = match[1];
        const prTitle = match[2];

        try {
            let pr = await getPRInfo(
                Number(prId),
                'cardiffcouncilict',
                teamProject,
                repositoryName,
                systemAccessToken
            );
            if (pr == null) {
                tl.warning(`Failed to fetch PR details for PR ${prId}`);
                return;
            }

            commit.pullRequest = pr;
        } catch (err) {
            tl.warning(`Error fetching PR details for PR ${prId}: ${err}`);
            return null;
        }
    }));

    // Get all pull requests from commits (flattened, unique by id)
    const allPullRequests = commits
        .map(c => c.pullRequest)
        .filter(pr => pr) // remove undefined/null
        .filter((pr, idx, arr) => arr.findIndex(x => x.id === pr.id) === idx);

    // Get all work items from all pull requests (flattened, unique by id)
    const allWorkItems = allPullRequests
        .flatMap(pr => pr.workItems || [])
        .filter((wi, idx, arr) => arr.findIndex(x => x.id === wi.id) === idx);

    // Data for Handlebars template
    let releaseData: TemplateData = {
        commits,
        workItems: allWorkItems,
        pullRequests: allPullRequests,
        startCommit,
        endCommit,
        generatedDate: new Date().toISOString(),
        repositoryName,
        teamProject
    };


JSON.stringify(releaseData, null, 2)
  .split('\n')
  .forEach(line => tl.debug(line));

    // Get template
    let template: string;
    const hasValidTemplateFile = templateFile && templateFile.trim() !== '' && fs.existsSync(templateFile) && fs.statSync(templateFile).isFile();
    if (hasValidTemplateFile) {
        template = fs.readFileSync(templateFile, 'utf8');
    } else {
        template = defaultTemplate;
    }

    // Generate release notes
    const templateFunc = handlebars.compile(template);
    const releaseNotes = templateFunc(releaseData);

    // Save release notes to file
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputFile, releaseNotes);
    tl.setVariable('ReleaseNotes', releaseNotes);
    tl.setResult(tl.TaskResult.Succeeded, 'Release notes generated successfully');
}

interface TemplateData {
    commits: Commit[];
    workItems: WorkItem[];
    pullRequests: PullRequest[];
    startCommit: string;
    endCommit: string;
    generatedDate: string;
    repositoryName?: string;
    teamProject?: string;
}
