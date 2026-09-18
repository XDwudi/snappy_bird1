import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const page = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>风羽远征 · 本地试玩</title><style>*{box-sizing:border-box}html,body{margin:0;height:100%;background:#162d36;overflow:hidden}body{display:grid;place-items:center}canvas{display:block;width:min(100vw,450px);height:100dvh;touch-action:none;box-shadow:0 0 100px #070f1555}</style><canvas id="game"></canvas><script>
const c=document.getElementById('game'), listeners={};
function size(){const r=c.getBoundingClientRect();return {windowWidth:r.width,windowHeight:r.height,pixelRatio:devicePixelRatio};}
window.wx={createCanvas:()=>c,getWindowInfo:size};
for(const n of ['Hide','Show','WindowResize','TouchStart']){wx['on'+n]=fn=>listeners[n]=fn;wx['off'+n]=fn=>{if(listeners[n]===fn)delete listeners[n]};}
c.addEventListener('pointerdown',e=>{e.preventDefault();const r=c.getBoundingClientRect();listeners.TouchStart?.({changedTouches:[{clientX:e.clientX-r.left,clientY:e.clientY-r.top}]});});
window.addEventListener('resize',()=>listeners.WindowResize?.());
document.addEventListener('visibilitychange',()=>listeners[document.hidden?'Hide':'Show']?.());
document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();const s=size();listeners.TouchStart?.({changedTouches:[{clientX:s.windowWidth*.25,clientY:s.windowHeight*.5}]});}});
</script><script src="/game.js"></script></html>`;
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(page);
  } else if (req.url === '/game.js') {
    try {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.end(await readFile('dist/game.js'));
    } catch {
      res.statusCode = 503;
      res.end('Build first.');
    }
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});
server.listen(5173, '127.0.0.1', () =>
  console.log(
    'Local preview: http://127.0.0.1:5173 — same game bundle, browser wx adapter; not WeChat validation. No config or AppID served.',
  ),
);
