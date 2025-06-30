import * as tl from 'azure-pipelines-task-lib';
import { GenerateReleaseNotes } from './main';

export default async function run(): Promise<void> {
    try {
        // Set variables
        let startCommit: string = tl.getInput('startCommit', true) as string;
        const endCommit: string = tl.getInput('endCommit', true) as string;
        const outputFile: string = tl.getInput('outputFile', true) as string;
        const templateFile: string | undefined = tl.getInput('templateFile', false) || undefined;
        const repoRoot: string = tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
        const systemAccessToken: string | undefined = tl.getVariable('System.AccessToken') || undefined;
        const teamProject: string | undefined = tl.getVariable('System.TeamProject') || undefined;
        const repositoryName: string | undefined = tl.getVariable('Build.Repository.Name') || undefined;

        await GenerateReleaseNotes(
            startCommit,
            endCommit,
            outputFile,
            repoRoot,
            systemAccessToken,
            teamProject,
            repositoryName,
            templateFile
        );
    } catch (error: any) {
        tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
    }
}