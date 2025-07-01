import * as Handlebars from 'handlebars';
export { Handlebars as handlebars };
import fs = require('fs');
import path = require('path');

export function registerHelpers(): void {
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