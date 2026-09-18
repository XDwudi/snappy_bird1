# TASK-004 · GitHub同步与CI

- 状态：In Progress（权限及main同步已恢复，开发分支CI待记录）
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

## 本轮恢复检查

2026-09-18：GitHub API确认当前账号对目标仓库admin/push为true；HTTPS接口可连接。使用gh凭据、HTTP/1.1和有界低速超时推送main成功，返回Everything up-to-date并建立origin/main跟踪。
因此目前未发现GitHub权限拒绝。此前已观察到的是TLS超时/Empty reply；不能据此把原因归结为仓库无写权限。
推送前扫描本地AppID隔离和全部Git历史，开发包/个人配置不会同步GitHub。保留main基线，首版在开发分支交付试玩。
