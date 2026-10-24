# 05: Close the web contributor page

Status: blocked
Type: task
Who: a session
Blocked by: the owner saying testers have the app

- `/contribute/` no longer serves the recorder: one line ("ParaPo's contributor app is for invited testers.") and nothing else; the service worker stops caching the recorder, and an installed web copy updates to that line.
- A phone with unsent recordings in the web page's storage: the line adds "You have N recordings not sent — open this page in the app's download link to keep them" only if a migration path exists; otherwise say plainly they stay on this browser. (Decide with the owner before building.)
- `check-build.mjs` and the e2e suites updated; the contributor page's code stays in the repo (the app builds it).
