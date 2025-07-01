# Commit Range Release Notes Generator
An Azure DevOps extension that generates release notes from commit ranges in Git repositories. This task analyzes merge commits to extract pull request information and associated work items, creating comprehensive release notes with proper Azure DevOps links.

## Features
- **Git-based Analysis**: Extract release notes directly from Git commit history
- **Pull Request Detection**: Automatically identifies merge commits and fetches PR details via Azure DevOps API
- **Work Item Integration**: Discovers work items linked to pull requests and includes them in release notes
- **Flexible Templates**: Customizable Handlebars templates with built-in helpers

## How It Works
The extension analyzes Git commits in a specified range, looking for merge commits that follow the pattern `Merged PR {id}: {title}`. For each identified pull request, it:

1. Fetches PR details from Azure DevOps API
2. Retrieves associated work items
3. Generates formatted release notes using Handlebars templates

## Task Usage

### Basic Usage
```yaml
- task: CommitRangeReleaseNotes@1
  inputs:
    startCommit: 'v1.0.0'
    endCommit: 'HEAD'
    outputFile: '$(Build.ArtifactStagingDirectory)/ReleaseNotes.md'
```

### With Custom Template
```yaml
- task: CommitRangeReleaseNotes@1
  inputs:
    startCommit: 'v1.0.0'
    endCommit: 'v1.1.0'
    outputFile: 'release-notes.md'
    templateFile: 'templates/custom-release-notes.hbs'
```

## Parameters
| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `startCommit` | SHA or reference for the start of commit range (exclusive) | ✅ | - |
| `endCommit` | SHA or reference for the end of commit range (inclusive) | ✅ | `HEAD` |
| `outputFile` | Path where generated release notes will be saved | ✅ | `$(Build.ArtifactStagingDirectory)/ReleaseNotes.md` |
| `templateFile` | Path to custom Handlebars template file | ❌ | Built-in template |

## Sample Output

```markdown
# Release Notes

Generated on 7/1/2025 from v1.0.0 to HEAD

Repository: **MyProject**

## Summary
- **3** Pull requests
- **5** work items
    - **Tasks**: 2
    - **Bugs**: 3

## 📋 Work Items
### User Storys
- [1234](https://dev.azure.com/org/project/_workitems/edit/1234) - Add user authentication by John Doe
- [1235](https://dev.azure.com/org/project/_workitems/edit/1235) - Implement dashboard by Jane Smith

### Bugs
- [1236](https://dev.azure.com/org/project/_workitems/edit/1236) - Fix login validation by John Doe
- [1237](https://dev.azure.com/org/project/_workitems/edit/1237) - Resolve timeout issues by Jane Smith
- [1238](https://dev.azure.com/org/project/_workitems/edit/1238) - Fix null reference exception by Bob Wilson

## 🔀 Pull Requests
- [PR 42](https://dev.azure.com/org/project/_git/pullrequest/42) - Add user authentication feature by John Doe ([1234](https://dev.azure.com/org/project/_workitems/edit/1234), [1236](https://dev.azure.com/org/project/_workitems/edit/1236))
- [PR 43](https://dev.azure.com/org/project/_git/pullrequest/43) - Implement new dashboard by Jane Smith ([1235](https://dev.azure.com/org/project/_workitems/edit/1235))
- [PR 44](https://dev.azure.com/org/project/_git/pullrequest/44) - Bug fixes and improvements by Bob Wilson ([1237](https://dev.azure.com/org/project/_workitems/edit/1237), [1238](https://dev.azure.com/org/project/_workitems/edit/1238))
```

## Template Customization
The task uses Handlebars templates to format output. You can provide a custom template file or use the built-in default template.

### Template Data Structure
Your template has access to the following data:

```typescript
interface TemplateData {
  commits: Commit[];
  workItems: WorkItem[];
  pullRequests: PullRequest[];
  startCommit: string;
  endCommit: string;
  generatedDate: string;
  repositoryId?: string;
  project?: string;
}

interface Commit {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  body: string;
  pullRequest?: PullRequest;
}

interface PullRequest {
  id: number;
  title: string;
  url: string;
  author: string;
  workItems: WorkItem[];
}

interface WorkItem {
  id: string;
  title: string;
  workItemType: string; // e.g., "User Story", "Bug", "Task"
  url: string;
  assignedTo: {
    displayName: string;
    uniqueName: string;
    imageUrl: string;
  };
}
```

### Built-in Handlebars Helpers
- `{{workItemLink workItem}}` - Creates markdown link: `[123](url)`
- `{{pullRequestLink pullRequest}}` - Creates markdown link: `[PR 42](url)`
- `{{commitLink commit}}` - Creates markdown link for commit (if commitUrl available)
- `{{shortHash hash}}` - Truncates commit hash to 7 characters
- `{{formatDate isoDate}}` - Formats ISO date for display
- `{{groupBy items "field"}}` - Groups array items by specified field

### Custom Template Example
```handlebars
# Release Notes - v{{endCommit}}

**Generated:** {{formatDate generatedDate}}
**Commit Range:** {{startCommit}}..{{endCommit}}
**Project:** {{project}}

---

## 📊 Summary
{{#if pullRequests.length}}
- {{pullRequests.length}} pull request(s) merged
{{/if}}
{{#if workItems.length}}
- {{workItems.length}} work item(s) resolved
{{/if}}

{{#if workItems.length}}
## 🎯 Work Items by Type
{{#groupBy workItems "workItemType"}}
### {{key}}
{{#each items}}
- {{workItemLink this}} - {{title}}{{#if assignedTo.displayName}} ({{assignedTo.displayName}}){{/if}}
{{/each}}
{{/groupBy}}
{{/if}}

{{#if pullRequests.length}}
## 🔀 Pull Requests
{{#each pullRequests}}
### {{pullRequestLink this}} - {{title}}
**Author:** {{author}}
{{#if workItems.length}}
**Work Items:** {{#each workItems}}{{workItemLink this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{/each}}
{{/if}}
```

## Console Usage
The task can also be run from the command line for testing:

```bash
node dist/mainConsole.js \
  --startCommit "v1.0.0" \
  --endCommit "HEAD" \
  --outputFile "release-notes.md" \
  --repoRoot "/path/to/repo" \
  --systemAccessToken "your-token" \
  --project "your-project" \
  --repositoryId "your-repo" \
  --apiUrl "https://dev.azure.com/your-org"
```