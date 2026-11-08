(function(__YggBig){
(function(root){'use strict';const items=typeof module!=='undefined'&&module.exports?require('./shop-catalogue'):root.YggShopItems;
const price=i=>items[i]?.cost;
function buy(state,index,quantity=1){if(![1,10,100].includes(quantity)||!state.rescue?.completed||(__YggBig.eq(index,1))||!(__YggBig.isInteger(index))||!items[index]||state.dreamShop)return false;const cost=(__YggBig.mul(price(index),quantity)),owned=state.inventory?.[index]||0;if(!(__YggBig.isFinite(cost))||(__YggBig.lt(state.credits||0,cost))||(__YggBig.gt((__YggBig.add(owned,quantity)),9999)))return false;(typeof module!=='undefined'&&module.exports?require('./engine.js'):root.YggEngine).refreshQuestUnlocks(state);state.inventory||={};(__YggBig.assign(state,"credits","sub",()=>(cost)));state.inventory[index]=(__YggBig.add(owned,quantity));return true;}
// Retired catalogue slots 4..20 remain in saves, but cannot be purchased.
function validate(raw,state){const inventory=raw.inventory??{};if(!inventory||typeof inventory!=='object'||Array.isArray(inventory))throw Error('所持品が正しくありません。');state.inventory={};for(const [key,count] of Object.entries(inventory)){const i=Number(key);if((__YggBig.ne(String(i),key))||!(__YggBig.isInteger(i))||((__YggBig.lt(i,0))||(__YggBig.gt(i,20)))||!(__YggBig.isInteger(count))||(__YggBig.lt(count,0))||(__YggBig.gt(count,9999)))throw Error('所持品が正しくありません。');if(count)state.inventory[key]=count;}}
const api={items,price,buy,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YggShop=api;})(typeof globalThis!=='undefined'?globalThis:this);

})(typeof module!=="undefined"&&module.exports?require("./huge.js"):globalThis.YggHuge);
