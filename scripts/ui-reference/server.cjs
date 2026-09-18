const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname,'../..');
async function serve() {
  await fs.mkdir(path.join(root,'.tmp/vela-evidence/0.3.13-b/f1'),{recursive:true});
  const server=http.createServer(async(req,res)=>{
    try {
      const url=decodeURIComponent(req.url.split('?')[0]);
      if(url==='/favicon.ico'){res.statusCode=204;res.end();return;}
      if(url==='/client/launcher-fixture'){res.setHeader('Content-Type','text/html');res.end('<input id="untouched" value="production draft sentinel"><button id="launch" onclick="UIReferenceLauncher.open()">Launch</button><script>window.I18n={t:k=>k};</script><script src="js/uiReferenceLauncher.js"></script>');return;}
      if(url==='/delta') { res.setHeader('Content-Type','text/html');res.end('<link rel="stylesheet" href="/lab/styles.css"><link rel="stylesheet" href="/lab/registry.css"><div class="plugin" style="width:100vw;height:100vh"><div class="registry-root" style="height:100%" id="r"></div></div><script type="module">import {RegistryView} from "/lab/registry-view.js";window.v=new RegistryView(document.querySelector("#r"),"registry");</script>');return; }
      const lab=url.startsWith('/lab/'),base=lab?path.join(root,'.tmp/vela-evidence/0.3.13-b/lab-source/dist'):root;
      const file=path.resolve(base,'.'+(lab?url.slice(4):url));
      if(!file.startsWith(base+path.sep))throw Error('outside root');
      const body=await fs.readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(body);
    }catch{res.statusCode=404;res.end('Not found');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>server.close(r))};
}
module.exports={serve,root};
