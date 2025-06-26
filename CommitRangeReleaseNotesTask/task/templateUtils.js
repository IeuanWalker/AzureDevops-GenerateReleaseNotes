const handlebars = require('handlebars');

function registerHelpers() {
    handlebars.registerHelper('workItemLink', function (workItem) {
        return new handlebars.SafeString(`[${workItem.id}](${workItem.url})`);
    });
    handlebars.registerHelper('commitLink', function (commit) {
        if (commit.commitUrl) {
            return new handlebars.SafeString(`[${commit.hash}](${commit.commitUrl})`);
        }
        return commit.hash;
    });
    handlebars.registerHelper('pullRequestLink', function (pr) {
        return new handlebars.SafeString(`[PR ${pr.id}](${pr.url})`);
    });
    handlebars.registerHelper('shortHash', function (hash, length = 7) {
        return hash.substring(0, length);
    });
    handlebars.registerHelper('formatDate', function (isoDate) {
        return new Date(isoDate).toLocaleDateString();
    });
}

module.exports = {
    registerHelpers,
    handlebars,
};
