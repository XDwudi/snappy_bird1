// 本地配置含 AppID，不入 Git；导入项目后运行本脚本恢复打包排除项。
const fs = require('fs')
const path = require('path')

function prepare(configPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const pack = config.packOptions || (config.packOptions = {})
  const ignore = pack.ignore || (pack.ignore = [])
  const rules = [
    ...['test', 'docs', 'scripts', 'node_modules', '.git', '.workbuddy'].map(value => ({ type: 'folder', value })),
    ...['README.md', '.gitignore', '.DS_Store', 'preview_qr.png', '项目规范.txt'].map(value => ({ type: 'file', value }))
  ]
  for (const rule of rules) {
    if (!ignore.some(item => item.type === rule.type && item.value === rule.value)) ignore.push(rule)
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
}

if (require.main === module) {
  prepare(path.resolve(__dirname, '../project.config.json'))
  console.log('已更新微信打包排除项；请重新打开项目后手动上传。')
}
module.exports = prepare
