# Snappy Bird

Flappy Bird单指飞行＋roguelike构筑的微信小游戏，CommonJS / Canvas 2D，无npm运行依赖。

当前 **v1.9.0 构筑与玩法体验**（2026-10-03）：单局3组件＋6被动、六路线专精/进化、六Boss机关重做、章间调整与续局；升级采用“点选预览＋底部确认”，解决幸运六卡误触。[完整变更与验证](docs/iterations/迭代_v1.9.0_构筑与玩法体验.md)。手机体验验收及微信上传由用户手动完成。

## 运行

微信开发者工具导入本目录，选择“小游戏”，使用自己的AppID。运行 `node scripts/prepare_wechat.js` 后重新打开项目，确保测试/文档不进入上传包；本机配置不入Git。主包约2.91MB、资源分包约3.82MB。

点击拍翅；升级时上下滑动查看，点卡只预选，再点底部确认。每局2次重掷；Boss后可以继续、有限换装或保存退出，主页提供继续旅程。离开休息点后清除旧检查点，战斗过程不保存。

## 玩法

- 73历史卡ID迁移为71张可获取卡＋管感/先知免费UI；一局最多3组件、6被动、1专精、2进化，不再无限收集全池或凑旧派系属性。
- 六Boss考题：拆根减压、锁定诱撞、双卵抉择、跟随暖流、双阀进入、按序断路。可击杀或坚持到时限通关；六章结束主动选择结算或无尽。
- 一次升级后至少6秒有效飞行，经验可积累等待；每Boss一次成长奖励，不连弹祝福。章间2次调整支持组件/被动同时替换、等额转移等级和处理失效进化。
- 固定60Hz逻辑、后台暂停；保存原候选/随机状态/一次性资源。新最高分与旧规则历史分分开，本地战报解释本局构筑和死亡原因。
- 生机收割沿用用户确认规则：冷却中达标保留计数，冷却结束后下一次击杀再治疗。

## 验证

```sh
node test/test_v190.js
node test/test_lifecycle_v190.js
node test/test_projectile_hits.js
node test/reachability_v190.js
node test/matrix_v190.js
node test/progression_v190.js
node test/sim_v190.js 16 2000
node scripts/check_package.js
# 本地有 @napi-rs/canvas 和中文字体时：
node test/render_v190.js
```

74项逻辑、生命周期、轨迹、物理路径和多屏Canvas检查通过；108场Boss对照、12组完整成长探针、48局自然模型结果已归档。对照/成长探针屏蔽扣血，不能视为真人通关；自然模型最远第3章。手机性能、12人理解度和含无尽的真人P90≤30分钟尚未验收，未上传微信。旧版本测试留作历史规格，不适用于本版全部新规则。

## 交接

- [1.9.0实现、数值与验证](docs/iterations/迭代_v1.9.0_构筑与玩法体验.md) · [六Boss新机关](docs/audits/v190/six-bosses.png) · [幸运六卡确认](docs/audits/v190/selected-320.png)

- [1.8.6审查逐项修复](docs/iterations/迭代_v1.8.6_审查修复.md) · [顶部危险区](docs/audits/v186/top-hazards.png) · [修订卡面](docs/audits/v186/clarified-cards.png)

- [1.8.5视觉辨识审计与预览](docs/iterations/迭代_v1.8.5_视觉辨识与反馈.md)

- [1.8.4机制、技能审查与试玩结果](docs/iterations/迭代_v1.8.4_Boss破甲与构筑平衡.md)

- [1.8.3美术改造与验证](docs/iterations/迭代_v1.8.3_像素冒险美术改造.md)
- [六章实际画面](docs/audits/v183/six-chapters.png) · [飞行画面](docs/audits/v183/flight.png) · [短屏选卡](docs/audits/v183/cards-6-top.png)
- [素材目录、提示词与维护说明](docs/art/v1.8.3_素材说明.md)

- [1.8.2成长与操控基础](docs/iterations/迭代_v1.8.2_成长与操控平衡修订.md)
- [修订后技能卡](docs/audits/v182-balance/cards-short-screen.png)

- [1.8.2玩法、数值与验收](docs/iterations/迭代_v1.8.2_Boss压力与遭遇节奏.md)
- [1.8.2六套Boss指引](docs/audits/v182/boss-guides.png)
- [1.8.2精英画面](docs/audits/v182/elites.png)

- [1.8.1玩法、数值与验收](docs/iterations/迭代_v1.8.1_Boss机关与精英.md)
- [1.8.1六种机关](docs/audits/v181/six-chapters.png)
- [1.8.1精英画面](docs/audits/v181/elites.png)
- [项目现状](docs/STATE.md)
- [1.8.0设计、数值与验证](docs/iterations/迭代_v1.8.0_六章与无尽.md)
- [1.8.0历史技能与Boss审查](docs/audits/技能与Boss审查_1.8.0.md)
- [1.8.0历史画面](docs/audits/v180/six-chapters.png)
- [1.8.0历史模拟](docs/audits/v180/endless-simulation.json)

仓库：https://github.com/XDwudi/snappy_bird1.git 。当前参数入口：`game/config/CampaignConfig.js`、`CampaignAbilities.js`、`GameConfig.js`、`game/systems/EndlessScaling.js`。
