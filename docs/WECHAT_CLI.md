# 本机微信开发者工具CLI

2026-09-18通过已安装官方CLI的`--help`、`islogin`和`open`实际核查。
本机入口：`/Applications/wechatwebdevtools.app/Contents/MacOS/cli`。

## 常用调用

```sh
# 检查登录、查看当前命令帮助
/Applications/wechatwebdevtools.app/Contents/MacOS/cli islogin
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --help
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload --help

# 构建后打开当前工程
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /Users/lxd/project/gpt/snappy_bird/dist

# 生成预览二维码（真实AppID/权限必须可用）
/Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /Users/lxd/project/gpt/snappy_bird/dist

# 以下仅为准备好的上传示例，尚未执行
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project /Users/lxd/project/gpt/snappy_bird/dist \
  --version 0.1.0 \
  --desc '工程验证：启动页、无玩法；以实际候选commit为准' \
  --info-output /private/tmp/snappy-bird-upload-info.json
```

上传前先`npm run verify`，再`npm run build:release`，核对最终包与Git提交，并在工具内完成适用验证。
示例版本和描述应改为实际候选信息；不能直接复制示例把未验收设计当游戏版本上传。
输出含code/message错误时视为失败，不能仅依赖CLI进程退出码。

## 当前状态与授权

用户已授权测试和上传，无需重复请求操作许可；必要AppID尚缺，已提出信息请求。
游客AppID导入被拒，尚未验证游戏画面或上传。收到AppID后继续接入即可。
不要把服务端口直接暴露到公网；无需读取、提交或要求用户发送AppSecret。
上传开发版本与正式审核发布分开记录；当前授权不自动包含对外正式发布。

官方入口：[小游戏CLI文档](https://developers.weixin.qq.com/minigame/dev/devtools/cli.html)。
本次网页读取不可用，以上命令以当前本机官方CLI实际帮助为依据；工具升级后先查看帮助。
