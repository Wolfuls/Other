/* Native Udonarium character archive; all processing stays on this device. */
(function(root){
'use strict';
const xml=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const data=(name,value,attrs='')=>`<data name="${xml(name)}"${attrs}>${xml(value)}</data>`;
function build(character,Y,imageId){
 const c=Y.clone(character),s=c.state;
 const number=(v,label)=>{if(!Number.isSafeInteger(v))throw Error(label+'の数値を確認してください。');return v;};
 const fields=[['HP',number(s.hp,'HP'),number(s.hpMax,'最大HP')],['PP',number(s.pp,'PP'),number(s.ppMax,'最大PP')],['暴走率',number(s.rage,'暴走率')],['因子D',number(s.factor,'因子D')],['行動値',number(Y.effective(c,'initiative').fixed,'行動値')]];
 let resources=fields.map(([k,v,max])=>max===undefined?data(k,v):data(k,max,` type="numberResource" currentValue="${v}"`)).join('\n');
 resources+=data('情報',s.info||'');
 const extras=data('総消費PP',s.spent)+['spe','karma'].map(k=>data(k==='spe'?'SPE':'カルマ',Y.resourceCopy(c,k).replace(/^(SPE|カルマ) /,''))).join('\n');
 const keys=['hit','dodge','ss','melee','weapon','power','defense','resist','precision','spec'];
 const checks=keys.map(k=>{const v=Y.effective(c,k),fixed=number(v.fixed,k),dice=number(v.dice,k);return data(Y.labels[k],['hit','dodge','ss','melee','weapon','power'].includes(k)?`${dice}D6${fixed>=0?'+':''}${fixed}`:fixed);}).join('\n');
 const skills=Object.entries(c.stats.skills||{}).map(([k,v])=>data(k,number(v,k))).join('\n');
 const palette=['命中','回避','SS'].map(k=>`cf {${k}} ${k}`).join('\n');
 return `<?xml version="1.0" encoding="UTF-8"?>\n<character location.name="table" location.x="0" location.y="0" posZ="0" rotate="0" roll="0">\n<data name="character">\n<data name="image">${data('imageIdentifier',imageId,' type="image"')}</data>\n<data name="common">${data('name',c.name)}${data('size',1)}</data>\n<data name="detail">\n<data name="リソース">${resources}</data>\n<data name="使用状況">${extras}</data>\n<data name="能力値">${checks}${data('活性タイプ',c.activation)}${data('被ダメージ軽減',Y.damageReduction(c))}</data>\n<data name="探索技能">${skills}</data>\n<data name="メモ">${data('能力値について','書き出し時点のBP・活性・盤面の補正を反映。暴走率や補正を変更した場合、判定値も更新してください。増強型の軽減は防御力に加算していません。',' type="note"')}</data>\n</data></data>\n<chat-palette dicebot="Yggdrasill">${xml(palette)}</chat-palette>\n</character>`;
}
async function archive(character,Y,Zip,image){
 const z=new Zip();z.file('data.xml',build(character,Y,image.id));z.file(image.id+'.png',image.base64,{base64:true});
 return z.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
const api={build,archive};if(typeof module!=='undefined')module.exports=api;root.UlfToken=api;
})(globalThis);
