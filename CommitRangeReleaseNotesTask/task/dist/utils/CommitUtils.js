"use strict";
/**
 * Utility functions for interacting with the local Git repository.
 * Provides helpers for validating commits, counting commits, finding the first commit,
 * and retrieving commit logs in a given range. Used by the release notes generator task.
 */
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
exports.getCommitsInRange = exports.getFirstCommit = exports.getCommitCount = exports.validateCommit = void 0;
const util = require("util");
const child_process = require("child_process");
const execAsync = util.promisify(child_process.exec);
function validateCommit(commit, repoRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield execAsync(`git rev-parse --verify ${commit}`, { cwd: repoRoot });
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
exports.validateCommit = validateCommit;
function getCommitCount(repoRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        const { stdout } = yield execAsync('git rev-list --count HEAD', { cwd: repoRoot });
        return parseInt(stdout.trim());
    });
}
exports.getCommitCount = getCommitCount;
function getFirstCommit(repoRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        const { stdout } = yield execAsync('git rev-list --max-parents=0 HEAD', { cwd: repoRoot });
        return stdout.trim();
    });
}
exports.getFirstCommit = getFirstCommit;
// The format variable defines how each commit is displayed in the output of the git log command.
// It uses the --pretty=format: option to specify a custom format for each commit line.
// --pretty=format:"%h|%an|%ae|%at|%s"
// %h = abbreviated commit hash
// %an = author name
// %ae = author email
// %at = author date (UNIX timestamp)
// %s = commit subject (message title)
// Fields are separated by | for easy parsing.
function getCommitsInRange(startCommit, endCommit, repoRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { stdout } = yield execAsync(`git log ${startCommit}..${endCommit} --pretty=format:"%h|%an|%ae|%at|%s|%b---END---"`, { cwd: repoRoot });
            return parseGitLog(stdout);
        }
        catch (_a) {
            // Try symmetric difference
            const { stdout } = yield execAsync(`git log ${startCommit}...${endCommit} --pretty=format:"%h|%an|%ae|%at|%s|%b---END---"`, { cwd: repoRoot });
            return parseGitLog(stdout);
        }
    });
}
exports.getCommitsInRange = getCommitsInRange;
// Helper function to parse git log output into Commit[]
function parseGitLog(log) {
    if (!log.trim())
        return [];
    // Split by the custom commit separator
    return log.split('---END---\n').filter(Boolean).map(line => {
        // Remove any trailing newlines and split by first five pipes
        const [hash, author, email, date, subject, ...bodyParts] = line.trim().split('|');
        const body = bodyParts.join('|').replace(/\n+$/, '');
        return {
            hash,
            author,
            email,
            date: new Date(parseInt(date, 10) * 1000).toISOString(),
            subject,
            body,
        };
    });
}
