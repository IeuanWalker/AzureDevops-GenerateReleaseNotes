import tl = require("azure-pipelines-task-lib/task");
import { GenerateReleaseNotes } from './main';

export default async function run(): Promise<void> {
    try {
        console.log("Starting release notes generation task...");

        // Set variables
        let startCommit: string = tl.getInput('startCommit', true) as string;
        const endCommit: string = tl.getInput('endCommit', true) as string;
        const outputFileMarkdown: string = tl.getInput('outputFileMarkdown', true) as string;
        const outputFileHtml: string = tl.getInput('outputFileHtml', true) as string;
        const templateFileMarkdown: string | undefined = tl.getInput('templateFileMarkdown', false) || undefined;
        const templateFileHtml: string | undefined = tl.getInput('templateFileHtml', false) || undefined;
        const repoRoot: string = tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
        const systemAccessToken: string | undefined = tl.getVariable('System.AccessToken') || undefined;
        const project: string | undefined = tl.getVariable('System.TeamProject') || undefined;
        const apiUrl: string | undefined = tl.getVariable('System.TeamFoundationCollectionUri') || undefined;
        const repositoryId: string | undefined = tl.getVariable('Build.Repository.Name') || undefined;

        await GenerateReleaseNotes(
            startCommit,
            endCommit,
            outputFileMarkdown,
            outputFileHtml,
            repoRoot,
            `Bearer ${systemAccessToken}`,
            project,
            apiUrl,
            repositoryId,
            templateFileMarkdown,
            templateFileHtml
        );
    } catch (error: any) {
        tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
    }
}

run()
  .then((result) => {
    console.log("Tool exited");
  })
  .catch((err) => {
    console.error(err);
  });