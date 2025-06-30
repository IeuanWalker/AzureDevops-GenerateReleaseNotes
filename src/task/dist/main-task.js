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
            // Set variables
            let startCommit = tl.getInput('startCommit', true);
            const endCommit = tl.getInput('endCommit', true);
            const outputFile = tl.getInput('outputFile', true);
            const templateFile = tl.getInput('templateFile', false) || undefined;
            const repoRoot = tl.getVariable('System.DefaultWorkingDirectory') || process.cwd();
            const systemAccessToken = tl.getVariable('System.AccessToken') || undefined;
            const teamProject = tl.getVariable('System.TeamProject') || undefined;
            const repositoryName = tl.getVariable('Build.Repository.Name') || undefined;
            yield (0, main_1.GenerateReleaseNotes)(startCommit, endCommit, outputFile, repoRoot, systemAccessToken, teamProject, repositoryName, templateFile);
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Release notes generation failed: ${error.message}`);
        }
    });
}
exports.default = run;
