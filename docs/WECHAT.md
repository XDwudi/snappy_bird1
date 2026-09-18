# 微信接入与本地运行

## 项目类型

当前输出为微信小游戏。它使用 `game.js`、`game.json` 和 Canvas 运行接口；
普通小程序页面项目需要不同入口和生命周期，二者不能靠改项目名称互换。
文件结构参考 [微信官方示例](https://github.com/wechat-miniprogram/minigame-demo/blob/master/project.config.json)。

## 接入步骤

1. 在微信公众平台确认账号类型是小游戏，获得 AppID 和项目开发权限。
2. 安装微信开发者工具；选择团队要验证的明确基础库版本，记录工具版本。
3. 安装 Node.js 24，执行 `npm ci`、`npm run verify`。
4. 执行 `npm run configure:wechat -- --appid <你的AppID> --lib-version <实际基础库版本>`。
   命令只写入忽略的 `wechat.local.json`，不会注册账号或修改微信后台。
5. 执行 `npm run dev`，在开发者工具中导入项目 **`dist/`**。
6. 检查启动文本、点击反馈、切后台和恢复、竖屏与像素比例。
7. 用实际账号完成 iOS / Android 真机预览并填写 `docs/templates/DEVICE_TEST.md`。

没有账号也可执行所有 Node 工程检查和打包；开发包用 `touristappid` 占位。
不保证当前开发者工具允许游客小游戏预览，更不能用游客配置完成上传与正式发布。

## 配置优先级

环境变量 `WECHAT_APPID` / `WECHAT_LIB_VERSION` → `wechat.local.json` → 开发默认值。
普通 build 允许未指定基础库（跟随工具），发布 build 必须指定一个 `x.y.z` 版本。
正式最低兼容基础库须在 M1 根据实际 API 和设备测试决定，不能根据类型定义版本推断。

AppID 是项目标识，不是 AppSecret。构建只读取上述两个白名单字段；
AppSecret、上传私钥和服务端密钥不进入客户端、Git、任务卡或构建产物。
本机CLI调用与授权见 [WECHAT_CLI](WECHAT_CLI.md)，当前没有服务端鉴权能力。

## 生成物

```text
dist/
  game.js                # 单文件运行入口
  game.js.map            # 仅开发构建；上传配置中排除
  game.json              # 游戏配置
  project.config.json    # 开发者工具导入配置
  build-info.json        # 版本、提交、工作区状态、入口哈希；上传时排除
  assets/                # 运行资源
```

不要编辑 dist：构建会清空并重建。改源文件或 config 后重新构建。
watch 自动处理 TypeScript 依赖变化；配置/仅素材变化后需重新运行构建。

## 发布信息复核

账号主体、类目、隐私说明、资质材料、包体限制和审核流程以实际账号后台及
[微信官方文档](https://developers.weixin.qq.com/minigame/dev/guide/) 为准。
本次未登录后台、未验证当前账号的发布权限，不将工程准备视为已满足发布要求。
