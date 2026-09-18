# TASK-003 · 微信工具接入与平台验证

- 状态：Blocked（Nightly模拟器启动异常与微信服务TLS断连；AppID已配置）
- 已授权：用户明确允许调用微信开发者工具测试和执行上传
- 未授权范围：不能从“上传”推断直接提交审核或正式发布

## 2026-09-18实际检查

- 已找到 `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`。
- 本机应用CFBundleShortVersionString为36.6.0；这是安装包标识，不当作微信基础库版本。
- `cli islogin` 返回 `{"login":true}`，HTTP服务可连接，本次监听38189（动态值，不写死到脚本）。
- 已读取CLI的open/upload帮助；upload需要project、version、desc。
- `cli open --project /Users/lxd/project/gpt/snappy_bird/dist` 返回code10“AppID不存在”，当前产物是touristappid。
- 该CLI即使业务失败也可能返回进程退出码0，因此今后必须同时检查输出中的错误对象和业务结果。
- 尚未成功导入并编译、查看实际游戏画面、真机预览或上传。已请求用户提供AppID，不需要AppSecret。

## 待完成

- [ ] 配置真实AppID和实际基础库，记录环境
- [ ] 在工具中启动、触摸、隐藏/恢复验证
- [ ] iOS与Android真机验证
- [ ] 生成候选并按现有授权上传开发版本，记录版本/提交/结果

当前产物仅工程启动页；若上传它，版本说明必须明确“工程验证，无玩法”，不能冒充可玩版本。

## v0.2.0 本轮接入更新

- 用户已提供AppID，只保存于忽略的wechat.local.json及dist，源码不含真实值。
- 本机工具界面版本2.02.2609102 Nightly，基础库固定3.17.1，CLI已登录；真实项目open成功。
- 模拟器仍显示“Cannot convert undefined or null to object / something wrong in electron appservice”；对照官方示例补充配置字段后仍未恢复。
- preview两次返回ECONNRESET，在获取AppID权限时TLS连接断开；进程仍可能返回0，未生成可用二维码。
- 本机浏览器同一构建包能启动并响应菜单/暂停/结算；这不能定位微信错误根因，也不能代替真机验证。
- 开发上传结果将在候选提交后记录；正式审核/发布未执行。
- 下一步：恢复微信工具正常启动与服务连接，验证AppID账号确属小游戏并完成iOS/Android测试。无需AppSecret。
