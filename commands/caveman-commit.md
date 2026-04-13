Generate a terse git commit message for staged changes.

Run: git diff --cached

Summarize changes as a conventional commit message (type: description). One line, no body,
no bullet points. type must be one of: feat, fix, refactor, chore, docs, test, build, ci.
Output only the commit message — no explanation, no "here is your commit message", no quotes.
