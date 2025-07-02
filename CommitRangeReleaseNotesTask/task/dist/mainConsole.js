"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const main_1 = require("./main");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Starting release notes generation task...");
            var argv = require("minimist")(process.argv.slice(2));
            // Set variables
            const startCommit = argv["startCommit"];
            const endCommit = argv["endCommit"];
            const outputFileMarkdown = argv["outputFileMarkdown"];
            const outputFileHtml = argv["outputFileHtml"];
            const templateFileMarkdown = argv["templateFileMarkdown"] || undefined;
            const templateFileHtml = argv["templateFileHtml"] || undefined;
            const repoRoot = argv["repoRoot"];
            const systemAccessToken = argv["systemAccessToken"];
            const project = argv["project"];
            const repositoryId = argv["repositoryId"];
            const apiUrl = argv["apiUrl"];
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
            yield (0, main_1.GenerateReleaseNotes)(startCommit, endCommit, outputFileMarkdown, outputFileHtml, repoRoot, `Basic ${encodedSystemAccessToken}`, project, apiUrl, repositoryId, templateFileMarkdown, templateFileHtml);
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
        }
    });
}
exports.default = run;
run()
    .then((result) => {
    console.log("Tool exited");
})
    .catch((err) => {
    console.error(err);
});
