(function(root){
'use strict';
const fields=[
 ['paper','背景'],['card','パネル'],['field','入力欄'],['ink','文字'],['muted','補助文字'],['line','枠線'],
 ['accent','強調文字'],['primary','ボタン背景'],['primaryInk','ボタン文字'],['tint','選択・補助背景'],
 ['rail','サイドバー・しおり背景'],['railInk','サイドバー・しおり文字'],
 ['warningBg','警告背景'],['warningInk','警告文字'],['errorBg','エラー背景'],['errorInk','エラー文字']
];
const presets={
 light:{paper:'#f4f5f0',card:'#ffffff',field:'#fafbf7',ink:'#202e2b',muted:'#6c7975',line:'#dce3da',accent:'#376950',primary:'#376950',primaryInk:'#ffffff',tint:'#edf4e4',rail:'#13251f',railInk:'#e4eee7',warningBg:'#fbf3e4',warningInk:'#8d6231',errorBg:'#fbefeb',errorInk:'#a34c43'},
 dark:{paper:'#101c17',card:'#1b2d24',field:'#14251c',ink:'#e2eee6',muted:'#aabdb1',line:'#3b5546',accent:'#a0d6a9',primary:'#397453',primaryInk:'#ffffff',tint:'#293f2e',rail:'#0a1812',railInk:'#d1e2d4',warningBg:'#513e27',warningInk:'#f5d3a1',errorBg:'#52302d',errorInk:'#ffd2ca'}
};
const cssKeys={paper:'--paper',card:'--card',field:'--field',ink:'--ink',muted:'--muted',line:'--line',accent:'--green',primary:'--primary-bg',primaryInk:'--primary-ink',tint:'--tint',rail:'--dark',railInk:'--rail-ink',warningBg:'--warning-bg',warningInk:'--warning-ink',errorBg:'--error-bg',errorInk:'--error-ink'};
const validColor=x=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x);
function preset(base){base=base==='dark'?'dark':'light';return {version:2,base,colors:{...presets[base]}};}
function read(raw,legacy){
 let data=null;try{data=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){}
 const base=data&&['light','dark'].includes(data.base)?data.base:legacy==='dark'?'dark':'light',settings=preset(base);
 if(data&&data.version===2&&data.colors&&typeof data.colors==='object'&&!Array.isArray(data.colors))for(const [key] of fields)if(validColor(data.colors[key]))settings.colors[key]=data.colors[key].toLowerCase();
 return settings;
}
function withColor(settings,key,value){if(!fields.some(([k])=>k===key)||!validColor(value))return settings;return {...settings,colors:{...settings.colors,[key]:value.toLowerCase()}};}
function customized(settings){return fields.some(([key])=>settings.colors[key].toLowerCase()!==presets[settings.base][key]);}
function apply(doc,settings){const root=doc.documentElement;root.dataset.theme=settings.base;for(const [key,variable] of Object.entries(cssKeys))root.style.setProperty(variable,settings.colors[key]);}
function nativeMessage(settings){const c=settings.colors;return 'theme:v2|'+[c.rail,c.railInk,c.primary,c.primaryInk,c.card,c.ink,c.line,c.paper].join('|');}
const api={fields,presets,preset,read,withColor,validColor,customized,apply,nativeMessage};
if(typeof module!=='undefined')module.exports=api;root.UlfTheme=api;
})(globalThis);
