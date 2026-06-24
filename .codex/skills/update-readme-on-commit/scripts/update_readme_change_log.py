#!/usr/bin/env python3
"""Update README.md with a one-line commit change summary."""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path


SECTION_NAMES = {
    '提交功能说明',
    '变更记录',
    '更新记录',
    'Change Log',
    'Changelog',
}
TABLE_HEADER = '| 日期 | 提交标识 | 类型 | 功能说明 |'
TABLE_SEPARATOR = '| --- | --- | --- | --- |'
DEFAULT_INTRO = '后续每次提交代码时，请同步更新本节，用一行说明本次提交的功能、修复或文档变化。'


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Insert a README change-log row for the current commit.')
    parser.add_argument('--readme', default='README.md', help='README path to update.')
    parser.add_argument('--date', default=dt.date.today().isoformat(), help='Entry date, default: today.')
    parser.add_argument('--commit', default='待提交', help='Commit identifier, default: 待提交.')
    parser.add_argument('--type', default='文档', help='Change type, such as 功能, 修复, 文档, 配置.')
    parser.add_argument('--summary', help='One-line change summary for a new row.')
    parser.add_argument('--replace-latest-commit', help='Replace the first 待提交 row with this commit id.')
    parser.add_argument('--dry-run', action='store_true', help='Print the updated README instead of writing it.')
    return parser.parse_args()


def normalize_line(line: str) -> str:
    return line.strip().lstrip('\ufeff')


def escape_cell(value: str) -> str:
    value = ' '.join(value.split())
    return value.replace('|', r'\|')


def format_row(date: str, commit: str, change_type: str, summary: str) -> str:
    return (
        f'| {escape_cell(date)} | {escape_cell(commit)} | '
        f'{escape_cell(change_type)} | {escape_cell(summary)} |'
    )


def is_heading(line: str) -> bool:
    return bool(re.match(r'^##\s+\S+', normalize_line(line)))


def heading_name(line: str) -> str | None:
    match = re.match(r'^##\s+(.+?)\s*$', normalize_line(line))
    return match.group(1) if match else None


def find_section(lines: list[str]) -> tuple[int | None, int | None]:
    for index, line in enumerate(lines):
        name = heading_name(line)
        if name in SECTION_NAMES:
            end = len(lines)
            for next_index in range(index + 1, len(lines)):
                if is_heading(lines[next_index]):
                    end = next_index
                    break
            return index, end
    return None, None


def parse_table_cells(line: str) -> list[str]:
    stripped = normalize_line(line)
    if not stripped.startswith('|') or not stripped.endswith('|'):
        return []
    return [cell.strip() for cell in stripped.strip('|').split('|')]


def is_change_table_header(line: str) -> bool:
    cells = parse_table_cells(line)
    return len(cells) >= 4 and cells[:4] in (
        ['日期', '提交标识', '类型', '功能说明'],
        ['Date', 'Commit', 'Type', 'Summary'],
    )


def is_separator(line: str) -> bool:
    cells = parse_table_cells(line)
    return bool(cells) and all(re.fullmatch(r':?-{3,}:?', cell) for cell in cells)


def find_table(lines: list[str], start: int, end: int) -> tuple[int | None, int | None]:
    for index in range(start + 1, end):
        if is_change_table_header(lines[index]):
            separator = index + 1 if index + 1 < end and is_separator(lines[index + 1]) else None
            return index, separator
    return None, None


def append_section(lines: list[str], row: str) -> list[str]:
    if lines and normalize_line(lines[-1]):
        lines.append('')
    return lines + [
        '## 提交功能说明',
        '',
        DEFAULT_INTRO,
        '',
        TABLE_HEADER,
        TABLE_SEPARATOR,
        row,
    ]


def insert_row(lines: list[str], row: str, summary: str, allow_duplicate: bool = False) -> list[str]:
    section_start, section_end = find_section(lines)
    if section_start is None or section_end is None:
        return append_section(lines, row)

    if not allow_duplicate:
        for line in lines[section_start:section_end]:
            if summary in line:
                return lines

    header, separator = find_table(lines, section_start, section_end)
    if header is None or separator is None:
        insert_at = section_start + 1
        block = ['', DEFAULT_INTRO, '', TABLE_HEADER, TABLE_SEPARATOR, row]
        return lines[:insert_at] + block + lines[insert_at:]

    insert_at = separator + 1
    return lines[:insert_at] + [row] + lines[insert_at:]


def replace_latest_commit(lines: list[str], commit: str) -> tuple[list[str], bool]:
    for index, line in enumerate(lines):
        cells = parse_table_cells(line)
        if len(cells) >= 4 and cells[1] == '待提交':
            cells[1] = commit
            lines[index] = '| ' + ' | '.join(escape_cell(cell) for cell in cells[:4]) + ' |'
            return lines, True
    return lines, False


def main() -> int:
    args = parse_args()
    readme = Path(args.readme)
    if not readme.exists():
        print(f'README not found: {readme}', file=sys.stderr)
        return 1

    text = readme.read_text(encoding='utf-8-sig')
    newline = '\r\n' if '\r\n' in text else '\n'
    lines = text.splitlines()

    if args.replace_latest_commit:
        lines, replaced = replace_latest_commit(lines, args.replace_latest_commit)
        if not replaced:
            print('No 待提交 row found to replace.', file=sys.stderr)
            return 1
    else:
        if not args.summary:
            print('--summary is required unless --replace-latest-commit is used.', file=sys.stderr)
            return 1
        row = format_row(args.date, args.commit, args.type, args.summary)
        lines = insert_row(lines, row, args.summary)

    output = newline.join(lines) + newline
    if args.dry_run:
        print(output, end='')
    else:
        readme.write_text(output, encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
