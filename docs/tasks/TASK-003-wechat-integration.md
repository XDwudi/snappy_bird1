# TASK-003 · 微信工具接入与平台验证

- 状态：Blocked（缺真实小游戏AppID；不是缺操作授权）
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
