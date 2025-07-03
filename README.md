# Release Notes Generator
[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/IeuanWalker.ReleaseNotesGenerator)](https://marketplace.visualstudio.com/items?itemName=IeuanWalker.ReleaseNotesGenerator)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/stars/IeuanWalker.ReleaseNotesGenerator)](https://marketplace.visualstudio.com/items?itemName=IeuanWalker.ReleaseNotesGenerator)

An Azure DevOps extension that generates release notes from a git commit range. This task analyses merge commits to extract the pull request IDs, which are then used to call Azure DevOps APIs to get the pull request data and the associated work items.

Only works with squash merges, as it operates based on the commit message. It finds the PR ID from commit messages in the format: `Merged PR {id}: {title}`.

## How to use it
- Install the extension - https://marketplace.visualstudio.com/items?itemName=IeuanWalker.ReleaseNotesGenerator
- Then add the task to the pipeline - 
```yaml
- task: ReleaseNotes@2
  inputs:
    startCommit: 'v1.0.0'
    endCommit: 'HEAD'
    outputFileMarkdown: '$(Build.ArtifactStagingDirectory)/release-notes.md'
    outputFileHtml: '$(Build.ArtifactStagingDirectory)/release-notes.html'
```
- Once the task has finished both a markdown and a html file will be generated. Which can then be used/ saved -
```yaml
- task: PublishBuildArtifacts@1
  inputs:
    PathtoPublish: '$(Build.ArtifactStagingDirectory)'
    ArtifactName: 'release-notes'
    publishLocation: 'Container'
```

## Parameters
| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `startCommit` | Commit reference for the start of the range (exclusive). Can be a commit hash, git tag, or a ref like `HEAD` or `HEAD~xx` | ✅ | - |
| `endCommit` | Commit reference for the end of the range (inclusive). Can be a commit hash, git tag, or a ref like `HEAD` or `HEAD~xx` | ✅ | `HEAD` |
| `outputFileMarkdown` | Path for markdown output | ✅ | `$(Build.ArtifactStagingDirectory)/release-notes.md` |
| `outputFileHtml`     | Path for HTML output     | ✅ | `$(Build.ArtifactStagingDirectory)/release-notes.html` |
| `templateFileMarkdown` and `templateFileHtml` | Path to custom Handlebars template file | ❌ | Built-in template |

### Supported commit reference formats for `startCommit` and `endCommit`
- Commit hash (e.g., `a1b2c3d`)
- Git tag (e.g., `v1.0.0`)
- `HEAD` or `HEAD~xx` (where `xx` is the number of commits before HEAD)

## Output
The task generates both a markdown and an interactive HTML file, using the default templates. You can see the default templates here - [Markdown](https://github.com/IeuanWalker/AzureDevops-GenerateReleaseNotes/blob/master/CommitRangeReleaseNotesTask/task/defaultTemplateMarkdown.hbs)/ [HTML](https://github.com/IeuanWalker/AzureDevops-GenerateReleaseNotes/blob/master/CommitRangeReleaseNotesTask/task/defaultTemplateHtml.hbs).

Here is what the templates look like - 
| Markdown | HTML |
|---|---|
| ![image](https://github.com/user-attachments/assets/f39bb498-41a0-4514-9c25-007246b7b62e) | ![screencapture-file-C-Users-ieuan-Downloads-release-notes-8-html-2025-07-03-15_15_02](https://github.com/user-attachments/assets/4b2529a8-4597-460f-b90d-341677c3153a) |

## Template Customisation
The task uses Handlebars templates to format output. You can provide a custom template file or use the built-in default template.
There are some built-in Handlebars helpers - 
- [Handlebars helpers](https://github.com/helpers/handlebars-helpers) are built in and loaded by default
- A [custom grouping](https://github.com/IeuanWalker/AzureDevops-GenerateReleaseNotes/blob/master/CommitRangeReleaseNotesTask/task/utils/TemplateUtils.ts) handler is included, `{{groupBy items "field"}}` - Groups array items by specified field

### Template Data Structure
Your template has access to the following data, via `TemplateData` object:

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

## Local testing
The task can also be run from the command line for testing out custom templates.

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
