// Simple test console for CommitRangeReleaseNotes
// Usage: node console/index.js <startCommit> <endCommit> <outputFile> [templateFile]

const path = require('path');
const fs = require('fs');
const main = require('../CommitRangeReleaseNotesTask/task/main');

async function runConsole() {
    const [,, startCommit, endCommit, outputFile, templateFile] = process.argv;
    if (!startCommit || !endCommit || !outputFile) {
        console.error('Usage: node console/index.js <startCommit> <endCommit> <outputFile> [templateFile]');
        process.exit(1);
    }
    // Patch the task-lib to allow running outside Azure DevOps
    const tl = require('azure-pipelines-task-lib/task');
    tl.getInput = (name, required) => {
        switch (name) {
            case 'startCommit': return startCommit;
            case 'endCommit': return endCommit;
            case 'outputFile': return outputFile;
            case 'templateFile': return templateFile || '';
            case 'conventionalCommits': return 'false';
            case 'failOnError': return 'true';
            case 'generateWorkItemLinks': return 'true';
            case 'generatePRLinks': return 'true';
            case 'generateCommitLinks': return 'true';
            case 'useDevopsApis': return 'false';
            default: return '';
        }
    };
    tl.getBoolInput = (name, required) => tl.getInput(name, required) === 'true';
    tl.getVariable = (name) => {
        if (name === 'System.DefaultWorkingDirectory') return process.cwd();
        return '';
    };
    tl.setVariable = (name, value) => { console.log(`Set variable: ${name} = ${value}`); };
    tl.setResult = (result, message) => {
        if (result === tl.TaskResult.Succeeded) {
            console.log('SUCCESS:', message);
        } else {
            console.error('FAILED:', message);
        }
    };
    await main.default();
}

runConsole();
