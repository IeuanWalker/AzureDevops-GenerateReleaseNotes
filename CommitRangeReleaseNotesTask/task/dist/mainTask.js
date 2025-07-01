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
            // Set variables
            let startCommit = tl.getInput('startCommit', true);
            const endCommit = tl.getInput('endCommit', true);
            const outputFile = tl.getInput('outputFile', true);
            const templateFile = tl.getInput('templateFile', false) || undefined;
            const repoRoot = tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
            const systemAccessToken = tl.getVariable('System.AccessToken') || undefined;
            const project = tl.getVariable('System.TeamProject') || undefined;
            const apiUrl = tl.getVariable('System.TeamFoundationCollectionUri') || undefined;
            const repositoryId = tl.getVariable('Build.Repository.Name') || undefined;
            yield (0, main_1.GenerateReleaseNotes)(startCommit, endCommit, outputFile, repoRoot, systemAccessToken, project, apiUrl, repositoryId, templateFile);
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
