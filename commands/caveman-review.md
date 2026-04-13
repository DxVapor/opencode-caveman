Review the current diff or specified file for code quality issues.

Run: git diff HEAD

Output findings as a flat list. Each item: [file:line] [issue]. No preamble, no summary,
no score. Severity prefix: CRIT / WARN / NIT. Stop after listing. Do not suggest rewrites
unless CRIT. If no issues found, output: "clean".
