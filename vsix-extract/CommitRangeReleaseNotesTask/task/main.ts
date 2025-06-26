import * as tl from 'azure-pipelines-task-lib/task';
import path from 'path';
import fs from 'fs';
import { validateCommit, getCommitCount, getFirstCommit, getCommitsInRange } from './utils/gitUtils';
import { parseWorkItems, generateWorkItemUrl } from './workItemUtils';
import { findPullRequestForCommit, generatePRUrl } from './prUtils';
import { registerHelpers, handlebars } from './templateUtils';
import { defaultSimpleTemplate, defaultConventionalTemplate } from './templates';
import * as commitGrouper from './utils/commitGrouper';

registerHelpers();

export default async function run(): Promise<void> {
    try {
        let startCommit: string = tl.getInput('startCommit', true) as string;
        const endCommit: string = tl.getInput('endCommit', true) as string;
        const outputFile: string = tl.getInput('outputFile', true) as string;
        const templateFile: string | undefined = tl.getInput('templateFile', false) || undefined;
        const repoRoot: string = tl.getInput('repoRoot', false) || tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
        const conventionalCommits: boolean = tl.getBoolInput('conventionalCommits', false);
        const failOnError: boolean = tl.getBoolInput('failOnError', false);
        const generateWorkItemLinks: boolean = tl.getBoolInput('generateWorkItemLinks', false);
        const generatePRLinks: boolean = tl.getBoolInput('generatePRLinks', false);
        const generateCommitLinks: boolean = tl.getBoolInput('generateCommitLinks', false);
        const teamProject: string | undefined = tl.getVariable('System.TeamProject') || undefined;
        const collectionUri: string | undefined = tl.getVariable('System.TeamFoundationCollectionUri') || undefined;
        const repositoryName: string | undefined = tl.getVariable('Build.Repository.Name') || undefined;

        process.chdir(repoRoot);
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
        if (!await validateCommit(endCommit, repoRoot)) {
            tl.setResult(tl.TaskResult.Failed, `Invalid end commit: ${endCommit}`);
            return;
        }
        let format = '--pretty=format:"%h|%an|%ae|%at|%s"';
        if (conventionalCommits) format = '--pretty=format:"%h|%an|%ae|%at|%s|%b"';
        let stdout: string;
        try {
            stdout = await getCommitsInRange(startCommit, endCommit, format, repoRoot);
        } catch {
            if (failOnError) {
                tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
                return;
            }
            fs.writeFileSync(outputFile, 'No changes in this release');
            return;
        }
        if (!stdout) {
            if (failOnError) {
                tl.setResult(tl.TaskResult.Failed, 'No commits found in the specified range');
                return;
            }
            fs.writeFileSync(outputFile, 'No changes in this release');
            return;
        }
        const commits = stdout.split('\n').filter(line => line.trim() !== '').map(line => {
            const parts = line.split('|');
            const timestamp = parseInt(parts[3]);
            const date = isNaN(timestamp) ? new Date(0) : new Date(timestamp * 1000);
            const subject = (parts[4] || '').replace(/"/g, '');
            const body = parts.length > 5 ? parts.slice(5).join('|').replace(/"/g, '') : '';
            const fullMessage = `${subject}\n${body}`.trim();
            const commit: any = {
                hash: (parts[0] || '').replace(/"/g, ''),
                author: parts[1] || '',
                email: parts[2] || '',
                date: date.toISOString(),
                subject,
                body
            };
            if (generateWorkItemLinks) {
                commit.workItems = parseWorkItems(fullMessage);
                if (collectionUri && teamProject) {
                    commit.workItems.forEach((wi: any) => {
                        wi.url = generateWorkItemUrl(wi.id, collectionUri, teamProject);
                    });
                }
            }
            if (generateCommitLinks && collectionUri && teamProject && repositoryName) {
                commit.commitUrl = `${collectionUri.replace(/\/$/, '')}/${teamProject}/_git/${repositoryName}/commit/${commit.hash}`;
            }
            return commit;
        });
        if (generatePRLinks && collectionUri && teamProject) {
            for (const commit of commits) {
                commit.pullRequest = await findPullRequestForCommit(commit.hash, collectionUri, teamProject, repoRoot);
            }
        }
        const allWorkItems: any[] = [];
        const allPullRequests: any[] = [];
        commits.forEach(commit => {
            if (commit.workItems) {
                commit.workItems.forEach((wi: any) => {
                    if (!allWorkItems.find(existing => existing.id === wi.id)) {
                        allWorkItems.push(wi);
                    }
                });
            }
            if (commit.pullRequest) {
                if (!allPullRequests.find(existing => existing.id === commit.pullRequest.id)) {
                    allPullRequests.push(commit.pullRequest);
                }
            }
        });
        let releaseData: any = {
            commits,
            workItems: allWorkItems,
            pullRequests: allPullRequests,
            startCommit,
            endCommit,
            generatedDate: new Date().toISOString(),
            repositoryName,
            teamProject,
            collectionUri
        };
        if (conventionalCommits) {
            const grouped = commitGrouper.groupCommitsByType(commits);
            releaseData.features = grouped.features;
            releaseData.fixes = grouped.fixes;
            releaseData.docs = grouped.docs;
            releaseData.chores = grouped.chores;
            releaseData.other = grouped.other;
        }
        let template: string;
        const hasValidTemplateFile = templateFile && templateFile.trim() !== '' && fs.existsSync(templateFile) && fs.statSync(templateFile).isFile();
        if (hasValidTemplateFile) {
            template = fs.readFileSync(templateFile, 'utf8');
        } else {
            template = conventionalCommits ? defaultConventionalTemplate : defaultSimpleTemplate;
        }
        const templateFunc = handlebars.compile(template);
        const releaseNotes = templateFunc(releaseData);
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputFile, releaseNotes);
        tl.setVariable('ReleaseNotes', releaseNotes);
        tl.setResult(tl.TaskResult.Succeeded, 'Release notes generated successfully');
    } catch (error: any) {
        tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
    }
}
