const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('boulder uses one party-wide impact even across separated party rows',()=>{
 const element=()=>({dataset:{},children:[],style:{values:{},setProperty(k,v){this.values[k]=v;}},setAttribute(){},append(n){this.children.push(n);}});
 const window={},context={window,document:{createElement:element},performance:{now:()=>1000},innerWidth:1200};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/duo-view.js'),'utf8'),context);
 const arena=element();arena.offsetWidth=1200;arena.getBoundingClientRect=()=>({left:0,top:0,width:600,height:300,bottom:300});
 const node=element();node.dataset.duoKind='chikira';node.getBoundingClientRect=()=>({left:500,top:100,width:80,height:150});
 const targets=[{left:20,right:90,top:80,bottom:220,width:70,height:140},{left:250,right:340,top:130,bottom:270,width:90,height:140}].map(r=>({getBoundingClientRect:()=>r}));
 const layer=window.YggDuoView.attack(node,{kind:'boulder',duration:2},arena,targets);
 const rocks=layer.children.filter(x=>x.className.includes('duo-rock-down'));assert.equal(rocks.length,1);
 assert.ok(parseFloat(rocks[0].style.values['--rock-width'])>=(340-20)/.5);
 assert.equal(layer.children.filter(x=>x.className.includes('duo-rock-up')).length,1);
});
