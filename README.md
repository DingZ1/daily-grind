# Daily Grind

Daily Grind 是一个用于记录工作日、加班、节假日和季度目标完成情况的 Vue 3 单页应用。它适合个人按天维护加班记录，自动计算有效加班时长，并按季度查看目标进度。

## 项目用途

本项目主要解决日常加班记录分散、统计口径不统一、季度目标不易追踪的问题。用户可以通过日历视图选择日期，录入开始和结束时间，系统会根据内置规则计算有效加班时长，并汇总到季度进度中。

## 核心功能

- 日历视图：按月份浏览日期，并快速选择某一天录入或编辑记录。
- 加班计算：区分工作日、周末、节假日和调休上班日，按规则扣除休息时间。
- 有效时长规则：少于 1 小时不计入有效加班，满足条件后按 0.5 小时向下取整。
- 季度查询：在顶部摘要中按年份和 Q1-Q4 切换季度，日历、图表、记录表和导出范围会同步切换。
- 季度进度：未设置计划时，满格为额定时长；设置计划后，满格为计划时长，并在进度条上标出额定时长分割点。
- 季度目标：额定时长按季度标准工作日 × 1.36 计算，也支持手动设置计划时长。
- 统计展示：查看季度实际时长、计划时长、额定时长、剩余时长、完成率和相关图表。
- 记录管理：查看、编辑、删除加班记录，并支持备注。
- 数据持久化：默认保存到浏览器本地缓存，支持绑定 JSON 数据文件自动同步。
- 导入导出：支持导出季度记录为 Excel，也支持从 Excel 或 CSV 导入记录。
- 主题设置：默认使用低调柔和主题，也支持浅色、暗色和跟随系统切换，并随数据一起保存。
- 节假日数据：内置 2026 年节假日和调休数据，用于日期类型判断。

## 技术栈

- Vue 3
- Vite
- Pinia
- Vue Router
- Element Plus
- Day.js
- VueUse

## 本地运行

请使用 Node 20。

```bash
npm ci
npm run dev
```

生产构建：

```bash
npm run build
```

本地预览生产构建：

```bash
npm run preview
```

## 数据说明

应用数据包含：

- 工作时间设置
- 每日加班记录
- 季度计划时长
- 主题设置

默认情况下，数据保存在浏览器 `localStorage` 中。支持 File System Access API 的浏览器还可以绑定 `daily-grind-data.json`，之后每次保存记录都会自动同步到该 JSON 文件。

主题设置默认值为 `soft`（柔和）。旧版本缓存或 JSON 数据中如果仍保存旧默认值 `auto`，系统会在读取时迁移为柔和主题；用户在新版本中主动选择“跟随系统”后仍会继续保存为 `auto`。

每日加班记录按 `YYYY-MM-DD` 保存，季度计划按 `YYYY-Qn` 保存。例如：

```json
{
  "records": {
    "2026-01-05": {
      "date": "2026-01-05",
      "overtimeHours": 2
    }
  },
  "quarterTargets": {
    "2026-Q1": 80
  }
}
```

节假日数据不保存在用户 JSON 中，当前内置在 `src/data/holidays/`。没有对应年份节假日数据时，系统会按周一到周五为工作日、周六周日为周末兜底计算额定时长。

## Supabase 账号与云同步配置

应用使用 Supabase Auth 管理邮箱注册、登录、邮箱验证和密码重置，业务数据存储在 PostgreSQL 的 `user_snapshots` 表中。浏览器只保留按用户 ID 隔离的离线缓存和待同步快照；Supabase Row Level Security 会限制每个账号只能访问自己的数据。

1. 在 Supabase 创建一个新项目，并保持 Email/Password 登录和 Confirm email 开启。
2. 在 Supabase SQL Editor 执行 `supabase/migrations/202607170001_auth_snapshots_and_wallpapers.sql`。该迁移会创建快照表、私有锁屏壁纸 Bucket 和对应的 RLS Policy。
3. 复制 `.env.example` 为 `.env.local`，填写 Project URL 和 Publishable Key：

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

4. 在 Supabase Authentication 的 URL Configuration 中，把本地地址和 GitHub Pages 正式地址加入 Redirect URLs，例如：

```text
http://localhost:5173/
https://<github-user>.github.io/<repository>/
```

5. 在 GitHub 仓库的 Settings → Secrets and variables → Actions → Variables 中添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。Pages 工作流会在构建时注入它们。

Publishable Key 会出现在浏览器构建产物中，这是 Supabase 前端客户端的预期用法；不要把 `service_role` Key 或数据库密码写入任何 `VITE_` 环境变量。

登录后连续 1 小时没有键盘、鼠标、滚轮或触摸操作会自动退出。网络断开时应用会进入锁屏；恢复联网后，需要用当前账号的登录密码重新验证。锁屏密码不会保存到浏览器。

自动化测试：

```bash
npm run test
```

## 提交功能说明

后续每次提交代码时，请同步更新本节，用一行说明本次提交的功能、修复或文档变化。建议提交前先补充表格，再一起提交。

| 日期 | 提交标识 | 类型 | 功能说明 |
| --- | --- | --- | --- |
| 2026-07-18 | 待提交 | 功能 | 密码重置邮件增加 60 秒发送冷却、倒计时提示，并在刷新和多标签页间保持限制。 |
| 2026-07-18 | 待提交 | 修复 | JSON 文件改为先只读导入，写权限失败时仍保留数据并明确提示自动写回状态。 |
| 2026-07-18 | 待提交 | 功能 | 新增 Supabase 邮箱账号、云端快照同步、断网安全锁屏、账号隔离缓存与专属锁屏壁纸。 |
| 2026-06-25 | 待提交 | 功能 | 新增当天打卡分段与本月考勤统计，支持迟到扣款和请假明细动态计算。 |
| 2026-06-24 | 待提交 | 文档 | 新增 update-readme-on-commit 项目级 Codex skill，用于在每次提交前把本次变更摘要写入 README。 |
| 2026-06-24 | 待提交 | 修复 | 将旧版本线上缓存中的默认主题迁移为柔和主题，并补充主题默认值说明。 |
| 2026-06-24 | ff9399c | 功能 | 增加某年某季度查询、计划/额定/实际时长进度条，并优化季度摘要和数据保存卡片样式。 |
| 2026-06-24 | 待提交 | 文档 | 新增 README，说明项目用途、核心功能、运行方式和后续提交说明规范。 |

填写建议：

- 日期：使用 `YYYY-MM-DD`。
- 提交标识：提交前可写 `待提交`，提交后可替换为 commit hash 或 PR 编号。
- 类型：可使用 `功能`、`修复`、`文档`、`样式`、`重构`、`构建` 等。
- 功能说明：简要描述本次提交带来的用户可见变化或维护价值。

示例：

| 日期 | 提交标识 | 类型 | 功能说明 |
| --- | --- | --- | --- |
| 2026-06-24 | abc1234 | 功能 | 增加季度目标手动设置能力，并将目标保存到 JSON 数据文件。 |

## 目录结构

```text
src/
  assets/styles/      全局样式和主题变量
  components/         日历、表格、图表、编辑抽屉等通用组件
  composables/        日历、主题、季度统计等组合式逻辑
  constants/          加班规则和日期类型常量
  data/holidays/      节假日数据
  layouts/            页面布局
  pages/              路由级页面
  services/           本地存储、文件同步、导入导出服务
  stores/             Pinia 状态管理
  utils/              日期、节假日、加班计算工具
```
