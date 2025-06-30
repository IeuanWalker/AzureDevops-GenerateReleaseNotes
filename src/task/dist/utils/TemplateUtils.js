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
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTemplate = exports.registerHelpers = exports.handlebars = void 0;
const Handlebars = __importStar(require("handlebars"));
exports.handlebars = Handlebars;
const fs_1 = require("fs");
const path_1 = require("path");
function registerHelpers() {
    Handlebars.registerHelper('workItemLink', function (workItem) {
        return new Handlebars.SafeString(`[${workItem.id}](${workItem.url})`);
    });
    Handlebars.registerHelper('commitLink', function (commit) {
        if (commit.commitUrl) {
            return new Handlebars.SafeString(`[${commit.hash}](${commit.commitUrl})`);
        }
        return commit.hash;
    });
    Handlebars.registerHelper('pullRequestLink', function (pr) {
        return new Handlebars.SafeString(`[PR ${pr.id}](${pr.url})`);
    });
    Handlebars.registerHelper('shortHash', function (hash, length = 7) {
        return hash.substring(0, length);
    });
    Handlebars.registerHelper('formatDate', function (isoDate) {
        return new Date(isoDate).toLocaleDateString() + ' ' + new Date(isoDate).toLocaleTimeString();
    });
    // GroupBy helper
    Handlebars.registerHelper('groupBy', function (items, field, options) {
        if (!Array.isArray(items))
            return '';
        const groups = {};
        items.forEach(item => {
            const key = item[field] || 'Other';
            if (!groups[key])
                groups[key] = [];
            groups[key].push(item);
        });
        let result = '';
        Object.keys(groups).forEach(key => {
            result += options.fn({ key, items: groups[key] });
        });
        return result;
    });
}
exports.registerHelpers = registerHelpers;
exports.defaultTemplate = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '..', '..', 'defaultTemplate.hbs'), 'utf-8');
