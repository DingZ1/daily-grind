---
name: update-readme-on-commit
description: Keep README.md updated with a concise summary of the current commit. Use when preparing any git commit, updating the README change-log or "提交功能说明" table, writing commit notes, or when the user asks to record what changed in this commit.
---

# Update README on Commit

## Purpose

Before every commit, update `README.md` so the repository records what the current change set modified.

## Workflow

1. Inspect the real change set with `git status --short`, `git diff --stat`, and, when files are staged, `git diff --cached --stat`.
2. Read the touched files that affect the summary. Do not summarize from filenames alone when behavior changed.
3. Write one concise README entry in the repository's existing language. For this repository, use Chinese.
4. Prefer the existing `## 提交功能说明` table in `README.md`. If it is missing, create it instead of adding a second change-log section.
5. Insert the newest entry at the top of the table, directly after the separator row.
6. Stage `README.md` together with the files it describes before committing.

## Entry Rules

- `日期`: Use local date in `YYYY-MM-DD`.
- `提交标识`: Use `待提交` before the commit exists. Replace it with a short commit hash only when the workflow explicitly amends or updates the entry after commit.
- `类型`: Prefer one of `功能`, `修复`, `文档`, `样式`, `重构`, `构建`, `测试`, `配置`.
- `功能说明`: Use one sentence focused on user-visible behavior or maintenance value. Avoid implementation trivia unless the change is internal-only.
- Do not include secrets, private paths, or noisy generated output.
- If the only pending change is an already-correct README entry, do not add a duplicate.

## Helper Script

Use `scripts/update_readme_change_log.py` to insert or update the table row:

```bash
python .codex/skills/update-readme-on-commit/scripts/update_readme_change_log.py --type 文档 --summary "新增提交前 README 变更说明流程。"
```

On Windows without a system Python, use the Codex bundled Python executable if available.

Common options:

- `--readme README.md`: Target README path. Defaults to `README.md`.
- `--date YYYY-MM-DD`: Override the local date.
- `--commit VALUE`: Override `待提交`.
- `--type VALUE`: Set the change type.
- `--summary TEXT`: Required summary for a new row.
- `--replace-latest-commit HASH`: Replace the first `待提交` row's commit identifier with `HASH`.
- `--dry-run`: Print the resulting README without writing it.

After running the script, review the diff and refine the summary manually if needed.
