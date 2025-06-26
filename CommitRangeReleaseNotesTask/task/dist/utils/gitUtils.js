"use strict";
/**
 * gitUtils.ts
 *
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommitsInRange = exports.getFirstCommit = exports.getCommitCount = exports.validateCommit = void 0;
const util_1 = __importDefault(require("util"));
const child_process_1 = __importDefault(require("child_process"));
const execAsync = util_1.default.promisify(child_process_1.default.exec);
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
function getCommitsInRange(startCommit, endCommit, format, repoRoot) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { stdout } = yield execAsync(`git log ${startCommit}..${endCommit} ${format}`, { cwd: repoRoot });
            return stdout;
        }
        catch (_a) {
            // Try symmetric difference
            const { stdout } = yield execAsync(`git log ${startCommit}...${endCommit} ${format}`, { cwd: repoRoot });
            return stdout;
        }
    });
}
exports.getCommitsInRange = getCommitsInRange;
