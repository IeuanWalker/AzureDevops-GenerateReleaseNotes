# Release Notes Generator
An Azure DevOps extension that generates release notes from commit ranges in Git repositories. This task analyses merge commits to extract pull request information and associated work items, creating comprehensive release notes with proper Azure DevOps links.

Only works with squash merges, as it operates based on the commit message. i.e it finds the PR ID from the commit message in the following format `Merged PR {id}: {title}`. It then uses Azure DevOps APIs to get the PR data and the attached work items.

## Features
- **Git-based**: Extract release notes directly from Git commit history
- **Pull Request Detection**: Automatically identifies merge commits and fetches PR details via Azure DevOps API
- **Work Item Integration**: Discovers work items linked to pull requests and includes them in release notes
- **Flexible Templates**: Customizable Handlebars templates with built-in helpers

## How It Works
The extension analyses Git commits in a specified range, looking for merge commits that follow the pattern `Merged PR {id}: {title}`. For each identified pull request, it:

1. Fetches PR details from Azure DevOps API
2. Retrieves associated work items
3. Generates formatted release notes using Handlebars templates

## Task Usage

### Basic Usage
```yaml
- task: ReleaseNotes@2
  inputs:
    startCommit: 'v1.0.0'
    endCommit: 'HEAD'
    outputFileMarkdown: '$(Build.ArtifactStagingDirectory)/release-notes.md'
    outputFileHtml: '$(Build.ArtifactStagingDirectory)/release-notes.html'
```

### With Custom Template
```yaml
- task: ReleaseNotes@2
  inputs:
    startCommit: 'v1.0.0'
    endCommit: 'v1.1.0'
    outputFileMarkdown: '$(Build.ArtifactStagingDirectory)/release-notes.md'
    outputFileHtml: '$(Build.ArtifactStagingDirectory)/release-notes.html'
    templateFileMarkdown: 'templates/custom-release-notes.hbs'
    templateFileHtml: 'templates/custom-release-notes.hbs'
```

## Parameters
| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `startCommit` | Commit reference for the start of the range (exclusive). Can be a commit hash, git tag, or a ref like `HEAD` or `HEAD~xx` | ✅ | - |
| `endCommit` | Commit reference for the end of the range (inclusive). Can be a commit hash, git tag, or a ref like `HEAD` or `HEAD~xx` | ✅ | `HEAD` |
| `outputFileMarkdown` and `outputFileHtml` | Path where generated release notes will be saved | ✅ | `$(Build.ArtifactStagingDirectory)/release-notes.html` and `$(Build.ArtifactStagingDirectory)/release-notes.html` |
| `templateFileMarkdown` and `templateFileHtml` | Path to custom Handlebars template file | ❌ | Built-in template |

### Supported commit reference formats for `startCommit` and `endCommit`
- Commit hash (e.g., `a1b2c3d`)
- Git tag (e.g., `v1.0.0`)
- `HEAD` or `HEAD~xx` (where `xx` is the number of commits before HEAD)

## Output
The [default markdown template](https://github.com/IeuanWalker/AzureDevops-GenerateReleaseNotes/blob/master/CommitRangeReleaseNotesTask/task/defaultTemplateMarkdown.hbs) outputs the following format - 
```markdown
## 📊 Summary
- **3** Pull Requests
- **5** Work Items
  - **Tasks**: 2
  - **Bugs**: 3

---

## 📋 Work Items
### Tasks (2)
| ID                                                             | Title                   | Assignee   | Linked PRs                                                  |
| -------------------------------------------------------------- | ----------------------- | ---------- | ----------------------------------------------------------- |
| [1234](https://dev.azure.com/org/project/_workitems/edit/1234) | Add user authentication | John Doe   | [42](https://dev.azure.com/org/project/_git/pullrequest/42) |
| [1235](https://dev.azure.com/org/project/_workitems/edit/1235) | Implement dashboard     | Jane Smith | [43](https://dev.azure.com/org/project/_git/pullrequest/43) |

### Bugs (3)
| ID                                                             | Title                    | Assignee   | Linked PRs                                                  |
| -------------------------------------------------------------- | ------------------------ | ---------- | ----------------------------------------------------------- |
| [1236](https://dev.azure.com/org/project/_workitems/edit/1236) | Fix login validation     | John Doe   | [42](https://dev.azure.com/org/project/_git/pullrequest/42) |
| [1237](https://dev.azure.com/org/project/_workitems/edit/1237) | Resolve timeout issues   | Jane Smith | [44](https://dev.azure.com/org/project/_git/pullrequest/44) |
| [1238](https://dev.azure.com/org/project/_workitems/edit/1238) | Fix null reference error | Bob Wilson | [44](https://dev.azure.com/org/project/_git/pullrequest/44) |

---

## 🔀 Pull Requests
| ID                                                          | Title                           | Author     | Linked Work Items                                                                                                              |
| ----------------------------------------------------------- | ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [42](https://dev.azure.com/org/project/_git/pullrequest/42) | Add user authentication feature | John Doe   | [1234](https://dev.azure.com/org/project/_workitems/edit/1234), [1236](https://dev.azure.com/org/project/_workitems/edit/1236) |
| [43](https://dev.azure.com/org/project/_git/pullrequest/43) | Implement new dashboard         | Jane Smith | [1235](https://dev.azure.com/org/project/_workitems/edit/1235)                                                                 |
| [44](https://dev.azure.com/org/project/_git/pullrequest/44) | Bug fixes and improvements      | Bob Wilson |
```

It also generates an interactive html version using this [template.](https://github.com/IeuanWalker/AzureDevops-GenerateReleaseNotes/blob/master/CommitRangeReleaseNotesTask/task/defaultTemplateHtml.hbs)

## Template Customisation
The task uses Handlebars templates to format output. You can provide a custom template file or use the built-in default template.

### Template Data Structure
Your template has access to the following data:

```typescript
interface TemplateData {
  commits: Commit[];
  workItems: WorkItemList[];
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

interface WorkItemList {
    id: string;
    title: string;
    workItemType: string; 
    url: string;
    assignedTo: {
      displayName: string;
      uniqueName: string;
      imageUrl: string;
    };
    pullRequests: PullRequest[];
}
```

### Built-in Handlebars Helpers
- [Handlebars helpers](https://github.com/helpers/handlebars-helpers) is built in and loaded by default
- A [custom grouping](https://github.com/IeuanWalker/AzureDevops-GenerateReleaseNotes/blob/master/CommitRangeReleaseNotesTask/task/utils/TemplateUtils.ts) handler is included, `{{groupBy items "field"}}` - Groups array items by specified field

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

## Local testing
The task can also be run from the command line for testing.

- Clone the repo
- Run `npm run build`, in the `CommitRangeReleaseNotesTask` folder
- Run the following command from the folder `CommitRangeReleaseNotesTask\task\dist`
```cmd
node ./mainConsole.js 
  --startCommit "v1.0.0" 
  --endCommit "HEAD" 
  --outputFileMarkdown "C:\release-notes.md" 
  --outputFileHtml "C:\release-notes.html" 
  --repoRoot "\path\to\repo" 
  --systemAccessToken "your-token" 
  --project "your-project" 
  --repositoryId "your-repo" 
  --apiUrl "https://dev.azure.com/your-org"
```
> To test locally, the `systemAccessToken` will need to be a [Personal Access Token (PAT)](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows).
