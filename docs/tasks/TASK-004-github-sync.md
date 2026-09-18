# TASK-004 · GitHub同步与CI

- 状态：Blocked（Git 同步已恢复；GitHub 账单问题阻止 CI 启动）
- 远端：[XDwudi/snappy_bird1](https://github.com/XDwudi/snappy_bird1)
- 远端可见性：public（API读取得知，未修改）
- 提交身份：XDwudi；邮箱与用户提供一致，仅写入本仓库配置

## 已完成

- 建立本地main初始提交`7b86202`及注释标签`v0.1.0`。
- 新策划在`docs/roguelike-design`分支独立保存。
- GitHub CLI账户XDwudi已登录，API能够读取目标仓库。
- origin已配置为用户给出的HTTPS地址；未创建其他仓库、未修改可见性。

## 推送实际结果

2026-09-18依次尝试默认HTTPS、HTTP/1.1、使用当前gh凭据的HTTP/1.1推送main。
前两次分别返回SSL连接超时、Empty reply from server；第三次等待超过2分钟仍无结果，已终止该次推送。
通过GitHub API再次查询main返回409“Git Repository is empty”，没有把推送尝试记作成功。
`gh run list`返回空列表。CI配置已存在，但未有远端运行结果；保护分支未配置。

## 恢复动作

网络恢复后，在当前仓库执行：

```sh
git push -u origin main
git push origin v0.1.0
git push -u origin docs/roguelike-design
gh run list --repo XDwudi/snappy_bird1 --limit 5
```

然后建立策划评审PR，保留main工程基线；无需重复询问指定远端的同步授权。
不得用force push或重建远端历史作为网络错误的解决办法。

## 2026-09-18 同步恢复

- 工作分支：`codex/restore-github-sync`；在独立 worktree 中记录，保留原型分支未提交文件。
- 负责文件：本任务卡、`docs/tasks/BOARD.md`、`README.md`；不修改玩法或平台代码。
- 诊断：历史错误是 HTTPS 超时/空响应；本轮 GitHub 查询可通，现有 GitHub CLI 账号与权限有效。
- 修复：仅在本仓库 Git 配置中给 origin 指定现有本机 HTTP 代理，并使用现有 GitHub CLI 凭据助手。配置不包含令牌，不写入版本库；代理客户端需保持运行。
- 推送前扫描全部两个历史提交，未发现本地真实 AppID；`wechat.local.json` 已被忽略。
- 原子推送成功：`main`、`docs/roguelike-design`、注释标签 `v0.1.0`。
- 远端复核：main 为 `7b86202648687bfe34214a3f1fa251be33ca1062`；策划分支为 `e1991bc5b86a0f19f17c59aeb04bdc6a870df07f`；v0.1.0 解引用后与 main 一致。
- 未提交的原型任务卡与玩法文件没有被纳入提交或推送。
- 推送后运行列表为空，确认 Actions 已启用后手动触发 [CI 35368484974](https://github.com/XDwudi/snappy_bird1/actions/runs/35368484974)。作业未启动、没有执行任何步骤，GitHub 注释原文：`The job was not started because your account is locked due to a billing issue.` 需账号所有者处理账单锁定后重跑；这不是 Git 推送或代码检查失败。分支保护与策划评审仍待完成。
- 本轮仅同步既有提交并更新文档，变更文档格式检查、19 个相对链接及 `git diff --check` 通过；独立 worktree 执行 `npm run check` 通过（格式、类型、架构、策划静态检查与 10 项测试）。本轮不重复执行游戏构建或真机测试。
