# Commit Range Release Notes Generator

This extension provides a task for Azure DevOps pipelines that generates release notes based on a range of commits in your repository.

## Features

- Generate release notes from a specified commit range
- Support for conventional commits with automatic grouping by type (features, fixes, docs, etc.)
- Customizable output using Handlebars templates
- Simple integration into your release pipeline

## Task Usage

Add the task to your pipeline:

```yaml
- task: CommitRangeReleaseNotes@1
  inputs:
    startCommit: 'v1.0.0'               # Previous release tag/commit
    endCommit: 'HEAD'                   # Current release (defaults to HEAD)
    outputFile: '$(Build.ArtifactStagingDirectory)/ReleaseNotes.md'
    conventionalCommits: true           # Enable commit type grouping
```

## Parameters

| Parameter | Description |
|-----------|-------------|
| `startCommit` | The SHA or reference (like a tag) for the start of the commit range (exclusive) |
| `endCommit` | The SHA or reference (like a tag) for the end of the commit range (inclusive) |
| `outputFile` | Path where the generated release notes will be saved |
| `templateFile` | (Optional) Path to a Handlebars template file for formatting the release notes |
| `repoRoot` | (Optional) Path to the root of the git repository, defaults to $(System.DefaultWorkingDirectory) |
| `conventionalCommits` | (Optional) Enable to group commits by conventional commit types (feature, fix, docs, etc.) |
| `failOnError` | (Optional) If true, the task will fail if any errors occur during release notes generation |

## Template Customization

You can provide your own Handlebars template to format the release notes. The template has access to the following data:

### When using conventional commits (`conventionalCommits: true`):

```json
{
  "features": [{ "hash": "abc123", "author": "Name", "subject": "Add feature", "date": "..." }],
  "fixes": [{ "hash": "def456", "author": "Name", "subject": "Fix bug", "date": "..." }],
  "docs": [...],
  "chores": [...],
  "other": [...],
  "all": [...],
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