# Commit Range Release Notes Generator

This extension provides a task for Azure DevOps pipelines that generates release notes based on a range of commits in your repository. It offers functionality similar to the popular GenerateReleaseNotes extension by rfennell, but works directly from commit history rather than the release environment.

## Features

- **Commit-based**: Generate release notes from any commit range, not just releases
- **Work Item Integration**: Automatically parse and link work items from commit messages (AB#123, #123, etc.)
- **Pull Request Detection**: Find and link pull requests associated with commits
- **Clickable Links**: Generate Azure DevOps links for commits, work items, and pull requests
- **Conventional Commits**: Support for grouping commits by type (features, fixes, docs, etc.)
- **Flexible Templates**: Customizable output using Handlebars templates with built-in helpers
- **Robust Error Handling**: Graceful handling of shallow clones and missing history

## Task Usage

### Basic Usage
```yaml
- task: CommitRangeReleaseNotes@1
  inputs:
    startCommit: 'v1.0.0'               # Previous release tag/commit
    endCommit: 'HEAD'                   # Current release (defaults to HEAD)
    outputFile: '$(Build.ArtifactStagingDirectory)/ReleaseNotes.md'
```

### Full Featured Usage
```yaml
- task: CommitRangeReleaseNotes@1
  inputs:
    startCommit: 'v1.0.0'
    endCommit: 'HEAD'
    outputFile: '$(Build.ArtifactStagingDirectory)/ReleaseNotes.md'
    conventionalCommits: true           # Enable commit type grouping
    generateWorkItemLinks: true         # Parse and link work items
    generatePRLinks: true               # Find and link pull requests
    generateCommitLinks: true           # Generate clickable commit links
    templateFile: 'templates/release-notes.hbs'  # Custom template
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `startCommit` | The SHA or reference (like a tag) for the start of the commit range (exclusive) | *Required* |
| `endCommit` | The SHA or reference (like a tag) for the end of the commit range (inclusive) | `HEAD` |
| `outputFile` | Path where the generated release notes will be saved | *Required* |
| `templateFile` | (Optional) Path to a Handlebars template file for formatting the release notes | Default template |
| `repoRoot` | (Optional) Path to the root of the git repository | `$(System.DefaultWorkingDirectory)` |
| `conventionalCommits` | Enable to group commits by conventional commit types | `false` |
| `generateWorkItemLinks` | Parse commit messages for work item references and generate links | `true` |
| `generatePRLinks` | Attempt to find and link pull requests associated with commits | `true` |
| `generateCommitLinks` | Generate clickable links for commit hashes | `true` |
| `failOnError` | If true, the task will fail if any errors occur during generation | `true` |

## Work Item Integration

The task automatically parses commit messages for work item references in these formats:
- `AB#123` - Azure Boards style
- `#123` - Simple hash style  
- `work item 123` - Natural language style

These are converted to clickable links like: `[123](https://dev.azure.com/org/project/_workitems/edit/123)`

## Sample Output

```markdown
# Release Notes

Generated on 12/26/2024 from v1.0.0 to HEAD

Repository: **MyProject**

## Summary
- **15** commits
- **3** work items
- **2** pull requests

## 📋 Work Items

* [1234](https://dev.azure.com/org/project/_workitems/edit/1234)
* [1235](https://dev.azure.com/org/project/_workitems/edit/1235)

## 🔀 Pull Requests

* [PR 42](https://dev.azure.com/org/project/_git/pullrequest/42) - Add new feature

## 🚀 Features

* **Add user authentication** - John Doe ([abc123](https://dev.azure.com/org/project/_git/repo/commit/abc123))
  - Work Items: [1234](https://dev.azure.com/org/project/_workitems/edit/1234)
  - Pull Request: [PR 42](https://dev.azure.com/org/project/_git/pullrequest/42)

## 🐛 Bug Fixes

* **Fix login validation** - Jane Smith ([def456](https://dev.azure.com/org/project/_git/repo/commit/def456))
  - Work Items: [1235](https://dev.azure.com/org/project/_workitems/edit/1235)
```

## Template Customization

You can provide your own Handlebars template to format the release notes. The template has access to the following data:

### Available Data Objects

```json
{
  "commits": [
    {
      "hash": "abc123",
      "author": "John Doe", 
      "email": "john@example.com",
      "date": "2024-12-26T10:00:00.000Z",
      "subject": "feat: add user authentication",
      "body": "Implemented OAuth 2.0 authentication\n\nCloses AB#1234",
      "workItems": [{"id": "1234", "url": "https://dev.azure.com/..."}],
      "commitUrl": "https://dev.azure.com/.../commit/abc123",
      "pullRequest": {"id": "42", "title": "Add authentication", "url": "..."}
    }
  ],
  "workItems": [{"id": "1234", "url": "https://dev.azure.com/..."}],
  "pullRequests": [{"id": "42", "title": "Add authentication", "url": "..."}],
  "features": [...],    // When conventionalCommits: true
  "fixes": [...],       // When conventionalCommits: true  
  "docs": [...],        // When conventionalCommits: true
  "chores": [...],      // When conventionalCommits: true
  "other": [...],       // When conventionalCommits: true
  "startCommit": "v1.0.0",
  "endCommit": "HEAD",
  "generatedDate": "2024-12-26T12:00:00.000Z",
  "repositoryName": "MyProject",
  "teamProject": "MyTeamProject",
  "collectionUri": "https://dev.azure.com/myorg/"
}
```

### Built-in Handlebars Helpers

The task provides several helpful Handlebars helpers:

- `{{workItemLink workItem}}` - Generates a markdown link to a work item
- `{{commitLink commit}}` - Generates a markdown link to a commit  
- `{{pullRequestLink pullRequest}}` - Generates a markdown link to a pull request
- `{{shortHash hash}}` - Truncates a commit hash to 7 characters
- `{{formatDate isoDate}}` - Formats an ISO date string for display

### Custom Template Example

```handlebars
# Release {{repositoryName}} v{{endCommit}}

{{#if workItems.length}}
## 🎯 Resolved Work Items
{{#each workItems}}
- {{workItemLink this}}
{{/each}}
{{/if}}

## 📝 Changes
{{#each commits}}
- {{subject}} ({{commitLink this}}) by {{author}}
{{#if workItems.length}}  - Addresses: {{#each workItems}}{{workItemLink this}}{{/each}}{{/if}}
{{/each}}
```

## Comparison to rfennell's GenerateReleaseNotes

This extension provides similar functionality to the popular GenerateReleaseNotes extension but with key differences:

| Feature | This Extension | rfennell Extension |
|---------|----------------|-------------------|
| **Data Source** | Git commit history | Azure DevOps Release/Build API |
| **Work Item Links** | ✅ Parsed from commit messages | ✅ From API associations |
| **Pull Request Links** | ✅ Detected from merge commits | ✅ From API associations |
| **Commit Links** | ✅ Generated URLs | ✅ From API data |
| **Template Engine** | ✅ Handlebars | ✅ Handlebars (v3+) |
| **Conventional Commits** | ✅ Built-in grouping | ➖ Manual template logic |
| **Shallow Clone Support** | ✅ Automatic fallback | ➖ Requires full history |
| **Cross-Platform** | ✅ Node.js based | ✅ Node.js based (v3+) |
| **Custom Date Ranges** | ✅ Any commit range | ➖ Build/Release based only |

**Choose this extension when:**
- You want to generate release notes from any commit range, not just builds/releases
- You work with shallow clones or limited history
- You prefer commit-message-based work item tracking
- You want simpler setup without API permissions

**Choose rfennell's extension when:**
- You need full Azure DevOps API integration
- You want work items and PRs automatically discovered via API
- You work exclusively within Azure DevOps release pipelines
- You need advanced features like WIQL queries or manual test plans

## Installation

1. Download the latest `.vsix` file from the releases page
2. Install it in your Azure DevOps organization via the Extensions marketplace
3. Add the task to your pipeline YAML or classic editor

## Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Package extension
tfx extension create --manifest-globs vss-extension.json
```

## Contributing

This extension is open source. Feel free to submit issues and enhancement requests!,
  "startCommit": "v1.0.0",
  "endCommit": "v1.1.0",
  "generatedDate": "2023-01-01T00:00:00.000Z"
}
```

### When using regular commits:

```json
{
  "commits": [
    { "hash": "abc123", "author": "Name", "subject": "Commit message", "date": "..." },
    ...
  ],
  "startCommit": "v1.0.0",
  "endCommit": "v1.1.0",
  "generatedDate": "2023-01-01T00:00:00.000Z"
}
```

## Example Template

```handlebars
# Release Notes ({{startCommit}} to {{endCommit}})

Generated on: {{generatedDate}}

{{#if features.length}}
## 🚀 Features

{{#each features}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
{{/if}}

{{#if fixes.length}}
## 🐛 Bug Fixes

{{#each fixes}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
{{/if}}

{{#if other.length}}
## Other Changes

{{#each other}}
* **{{subject}}** - {{author}} ({{hash}})
{{/each}}
{{/if}}
```