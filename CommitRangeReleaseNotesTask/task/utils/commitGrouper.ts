interface Commit {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  body: string;
}

interface GroupedCommits {
  features: Commit[];
  fixes: Commit[];
  docs: Commit[];
  chores: Commit[];
  other: Commit[];
  all: Commit[];
}

export function groupCommitsByType(commits: Commit[]): GroupedCommits {
  const result: GroupedCommits = {
    features: [],
    fixes: [],
    docs: [],
    chores: [],
    other: [],
    all: commits
  };

  for (const commit of commits) {
    const subject = commit.subject.toLowerCase();
    
    if (subject.startsWith('feat') || subject.startsWith('feature')) {
      result.features.push(commit);
    } else if (subject.startsWith('fix') || subject.startsWith('bug')) {
      result.fixes.push(commit);
    } else if (subject.startsWith('doc') || subject.startsWith('docs')) {
      result.docs.push(commit);
    } else if (subject.startsWith('chore') || subject.startsWith('build') || subject.startsWith('ci')) {
      result.chores.push(commit);
    } else {
      result.other.push(commit);
    }
  }

  return result;
}