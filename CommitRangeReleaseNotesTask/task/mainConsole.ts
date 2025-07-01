import tl = require("azure-pipelines-task-lib/task");
import { GenerateReleaseNotes } from './main';

export default async function run(): Promise<void> {
    try {
        console.log("Starting release notes generation task...");

        var argv = require("minimist")(process.argv.slice(2));

        // Set variables
        const startCommit: string = argv["startCommit"] as string;
        const endCommit: string = argv["endCommit"] as string;
        const outputFile: string = argv["outputFile"] as string;
        const templateFile: string | undefined = argv["templateFile"] as string || undefined;
        const repoRoot: string = argv["repoRoot"] as string;
        const systemAccessToken: string = argv["systemAccessToken"];
        const project: string = argv["project"];
        const repositoryId: string = argv["repositoryId"] as string;
        const apiUrl: string = argv["apiUrl"] as string;

        // Validate repoRoot exists
        if (!tl.exist(repoRoot)) {
            throw new Error(`Repository root directory does not exist: ${repoRoot}`);
        }
        if (!tl.exist(`${repoRoot}/.git`)) {
            throw new Error(`The specified directory is not a valid Git repository: ${repoRoot}`);
        }

        // TODO: Validate devops variables - systemAccessToken, teamProject, repositoryName
        // Test api call

        const encodedSystemAccessToken = Buffer.from(`:${systemAccessToken}`).toString('base64');

        await GenerateReleaseNotes(
            startCommit,
            endCommit,
            outputFile,
            repoRoot,
            encodedSystemAccessToken,
            project,
            apiUrl,
            repositoryId,
            templateFile
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