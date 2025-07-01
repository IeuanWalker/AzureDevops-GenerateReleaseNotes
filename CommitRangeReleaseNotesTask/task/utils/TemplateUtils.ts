import * as Handlebars from 'handlebars';
export { Handlebars as handlebars };
import fs = require('fs');
import path = require('path');

export function registerHelpers(): void {
    Handlebars.registerHelper('workItemLink', function (workItem: { id: string; url: string }) {
        if (!workItem?.id || !workItem?.url) return workItem?.id || 'Unknown';
        return new Handlebars.SafeString(`[${workItem.id}](${workItem.url})`);
    });
    
    Handlebars.registerHelper('commitLink', function (commit: { hash: string; commitUrl?: string }) {
        if (!commit?.hash) return 'Unknown';
        if (commit.commitUrl) {
            return new Handlebars.SafeString(`[${commit.hash}](${commit.commitUrl})`);
        }
        return commit.hash;
    });
    
    Handlebars.registerHelper('pullRequestLink', function (pr: { id: string; url: string }) {
        if (!pr?.id || !pr?.url) return pr?.id || 'Unknown';
        return new Handlebars.SafeString(`[PR ${pr.id}](${pr.url})`);
    });
    
    Handlebars.registerHelper('shortHash', function (hash: string, length = 7) {
        if (!hash || typeof hash !== 'string') return 'Unknown';
        return hash.substring(0, Math.max(1, length));
    });
    
    Handlebars.registerHelper('formatDate', function (isoDate: string) {
        if (!isoDate) return 'Unknown';
        try {
            const date = new Date(isoDate);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return 'Invalid Date';
        }
    });

    // GroupBy helper
    Handlebars.registerHelper('groupBy', function(items: any[], field: string, options: any) {
        if (!Array.isArray(items) || !field) return '';
        const groups: Record<string, any[]> = {};
        items.forEach(item => {
            if (!item || typeof item !== 'object') return;
            const key = item[field] || 'Other';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        let result = '';
        Object.keys(groups).forEach(key => {
            result += options.fn({ key, items: groups[key] });
        });
        return result;
    });
}

export const defaultTemplate = fs.readFileSync(
  path.join(__dirname, '..', '..', 'defaultTemplate.hbs'),
  'utf-8'
);