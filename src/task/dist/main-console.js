"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const tl = __importStar(require("azure-pipelines-task-lib"));
const main_1 = require("./main");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            tl.debug("Starting release notes generation task...");
            var argv = require("minimist")(process.argv.slice(2));
            // Set variables
            const startCommit = argv["startCommit"];
            const endCommit = argv["endCommit"];
            const outputFile = argv["outputFile"];
            const templateFile = argv["templateFile"] || undefined;
            const repoRoot = argv["repoRoot"];
            const systemAccessToken = argv["systemAccessToken"];
            const teamProject = argv["teamProject"];
            const repositoryName = argv["repositoryName"];
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
            yield (0, main_1.GenerateReleaseNotes)(startCommit, endCommit, outputFile, repoRoot, encodedSystemAccessToken, teamProject, repositoryName, templateFile);
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
