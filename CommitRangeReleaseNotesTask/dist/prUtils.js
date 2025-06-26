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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPullRequestForCommit = exports.generatePRUrl = void 0;
const util_1 = __importDefault(require("util"));
const child_process_1 = __importDefault(require("child_process"));
const execAsync = util_1.default.promisify(child_process_1.default.exec);
function generatePRUrl(prId, collectionUri, teamProject) {
    if (!collectionUri || !teamProject)
        return `#${prId}`;
    const baseUrl = collectionUri.replace(/\/$/, '');
    return `${baseUrl}/${teamProject}/_git/pullrequest/${prId}`;
}
exports.generatePRUrl = generatePRUrl;
function findPullRequestForCommit(commitHash, collectionUri, teamProject, repoRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { stdout } = yield execAsync(`git show --format="%s%n%b" -s ${commitHash}`, { cwd: repoRoot });
            const mergePattern = /Merged PR (\d+): (.+)/i;
            const match = mergePattern.exec(stdout);
            if (match) {
                const prId = match[1];
                const prTitle = match[2];
                return {
                    id: prId,
                    title: prTitle,
                    url: generatePRUrl(prId, collectionUri, teamProject),
                    author: ''
                };
            }
        }
        catch (_a) { }
        return null;
    });
}
exports.findPullRequestForCommit = findPullRequestForCommit;
