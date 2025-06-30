import * as Handlebars from 'handlebars';
export { Handlebars as handlebars };
import { readFileSync } from 'fs';
import { join } from 'path';

export function registerHelpers(): void {
    Handlebars.registerHelper('workItemLink', function (workItem: { id: string; url: string }) {
        return new Handlebars.SafeString(`[${workItem.id}](${workItem.url})`);
    });
    Handlebars.registerHelper('commitLink', function (commit: { hash: string; commitUrl?: string }) {
        if (commit.commitUrl) {
            return new Handlebars.SafeString(`[${commit.hash}](${commit.commitUrl})`);
        }
        return commit.hash;
    });
    Handlebars.registerHelper('pullRequestLink', function (pr: { id: string; url: string }) {
        return new Handlebars.SafeString(`[PR ${pr.id}](${pr.url})`);
    });
    Handlebars.registerHelper('shortHash', function (hash: string, length = 7) {
        return hash.substring(0, length);
    });
    Handlebars.registerHelper('formatDate', function (isoDate: string) {
        return new Date(isoDate).toLocaleDateString();
    });
}

export const defaultTemplate = readFileSync(
  join(__dirname, '..', '..', 'defaultTemplate.hbs'),
  'utf-8'
);