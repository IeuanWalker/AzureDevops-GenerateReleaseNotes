const tl = require('azure-pipelines-task-lib/task');
const path = require('path');
const fs = require('fs');
const { validateCommit, getCommitCount, getFirstCommit, getCommitsInRange } = require('./gitUtils');
const { parseWorkItems, generateWorkItemUrl } = require('./workItemUtils');
const { findPullRequestForCommit, generatePRUrl } = require('./prUtils');
const { registerHelpers, handlebars } = require('./templateUtils');
const { defaultSimpleTemplate, defaultConventionalTemplate } = require('./templates');
const commitGrouper = require('./utils/commitGrouper');

registerHelpers();

async function run() {
    try {
        let startCommit = tl.getInput('startCommit', true);
        const endCommit = tl.getInput('endCommit', true);
        const outputFile = tl.getInput('outputFile', true);
        const templateFile = tl.getInput('templateFile', false);
        const repoRoot = tl.getInput('repoRoot', false) || tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
        const conventionalCommits = tl.getBoolInput('conventionalCommits', false);
        const failOnError = tl.getBoolInput('failOnError', false);
        const generateWorkItemLinks = tl.getBoolInput('generateWorkItemLinks', false);
        const generatePRLinks = tl.getBoolInput('generatePRLinks', false);
        const generateCommitLinks = tl.getBoolInput('generateCommitLinks', false);
        const teamProject = tl.getVariable('System.TeamProject');
        const collectionUri = tl.getVariable('System.TeamFoundationCollectionUri');
        const repositoryName = tl.getVariable('Build.Repository.Name');

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
        let stdout;
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
            const commit = {
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
                    commit.workItems.forEach(wi => {
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
        const allWorkItems = [];
        const allPullRequests = [];
        commits.forEach(commit => {
            if (commit.workItems) {
                commit.workItems.forEach(wi => {
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
        let releaseData = {
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
        let template;
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
    } catch (error) {
        tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
    }
}

module.exports = run;
