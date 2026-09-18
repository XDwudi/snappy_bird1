# 版本管理

## 本地基线与远端

默认主分支 `main`。工程基线版本为 `0.1.0`，标签 `v0.1.0` 代表工程准备完成，不是微信上线。
提交身份仅配置在当前仓库；origin 指向用户提供的 [GitHub 仓库](https://github.com/XDwudi/snappy_bird1)。
后续任务采用短分支；禁止覆盖远端已有历史。远端 CI 和保护规则实际状态由 TASK-004 跟踪。

建议私有远端。托管方应设置 main：禁止强推/删除、PR 合并、要求 CI 的 `verify` 检查通过。
有独立评审者时要求至少一名评审；单人阶段保留自审记录。配置文件不等于保护规则已经生效。

## 日常开发

```sh
git switch main
git switch -c feat/task-005-core-loop
# 完成任务，执行 npm run verify 后，按文件暂存
git add <本任务文件>
git commit -m "feat(game): add core game loop"
```

分支：`feat/task-xxx-topic`、`fix/task-xxx-topic`、`docs/topic`、`chore/topic`。
使用短分支和小 PR，默认 squash merge 保持一个任务一个主线提交，不维护长期 develop 分支。
禁止 `git reset --hard`、覆写用户修改和未经授权的 force push。

提交标题：`type(scope): 描述`，类型为 feat/fix/docs/refactor/test/build/ci/chore/perf/revert。
本地钩子通过 `npm run hooks:install` 启用（配置仅当前仓库）；pre-commit 跑 `npm run check`，
commit-msg 检查标题。CI 仍是共享门禁，不能依赖每位开发者都安装钩子。

## 版本规则

使用 `MAJOR.MINOR.PATCH`。初始 `0.1.0` 是工程基线；功能增量提升 minor，修复提升 patch。
`1.0.0` 留给首个正式稳定版本；候选版可用 `0.2.0-rc.1`，实际上传版本命名须核对微信工具要求。
破坏性接口或存档格式变更必须在 CHANGELOG 和 ADR 中说明，不能仅改版本号。

发布候选准备流程：

1. 建立发布准备分支，完成任务和必要平台验证。
2. `npm version minor --no-git-tag-version`（或 patch），同步 package 和 lockfile。
3. 整理 CHANGELOG、设备记录和发布清单，执行 `npm run verify`，提交版本变更。
4. 合并后在干净 checkout 执行 `npm ci` 和完整验证；生成候选发布包。
5. 验收后 `git tag -a vX.Y.Z -m "vX.Y.Z"`，按授权推送标签。
6. 上传、审核、发布遵循 `docs/RELEASE.md`；标签存在不代表已上线。

## 回退与追溯

开发回退优先 `git revert <commit>`，保留历史。旧版本重现应另建 worktree：
`git worktree add ../snappy-bird-repro vX.Y.Z`，执行 `npm ci` 后重建。
每次候选包留存提交 SHA、版本、基础库、AppID 对应环境、包哈希和验证记录。
线上回退依据微信后台实际支持的版本操作执行，Git 回退本身不会回退已上线应用。
有存档/后端后另写兼容与迁移方案，避免代码回退导致旧数据不可读。
