// One viewer, separate historical timelines. Episode scripts also load from file://.
const archiveIndex=window.RatatoskrArchiveIndex;
const episodeDefaults=new Map([[embedded.seriesRecord||'zouka',defaults]]);
const episodeStates=new Map();
const episodeLoads=new Map();
let activeEpisode=embedded.seriesRecord||'zouka',archiveNavigation=0;
const seriesRecord=key=>archiveIndex.records.find(r=>r.key===key);
const archiveRoute=(key,post='',author='')=>'#'+new URLSearchParams({record:key,...(post?{post}:{}),...(author?{author}:{})}).toString();
const archiveImage=(value,scene)=>value?.startsWith('asset:')?scene.assets?.[value.slice(6)]||'':value||'';
const archivePerson=(person,scene)=>({...person,avatar:archiveImage(person.avatar,scene)});

function loadEpisode(key){
  if(episodeDefaults.has(key))return Promise.resolve(episodeDefaults.get(key));
  if(episodeLoads.has(key))return episodeLoads.get(key);
  const record=seriesRecord(key);
  if(!record)return Promise.reject(Error('Unknown timeline'));
  const promise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.dataset.episode=key;script.src=record.file;
    script.onload=()=>{
      const raw=window.RatatoskrEpisodeData?.[key];
      if(!raw){reject(Error('Timeline data unavailable'));return;}
      const scene=normalizeBrandIdentifiers(raw);episodeDefaults.set(key,scene);resolve(scene);
    };
    script.onerror=()=>{episodeLoads.delete(key);script.remove();reject(Error('Timeline could not be opened'));};
    document.head.append(script);
  });
  episodeLoads.set(key,promise);return promise;
}

async function archivedState(key){
  if(key===activeEpisode)return state;
  if(episodeStates.has(key))return episodeStates.get(key);
  const base=await loadEpisode(key);
  let snapshot=structuredClone(base);
  try{
    const cached=localStorage.getItem('ratatoskr:'+base.sceneId);
    if(cached){const raw=JSON.parse(cached);snapshot=validate({...raw,assets:raw.assets||base.assets});}
  }catch{}
  return snapshot;
}

function archiveLink(key,post='',label='',author=''){
  return `<a class="archive-link" href="${esc(archiveRoute(key,post,author))}">${label||L('Open timeline','TLを開く')} <span aria-hidden="true">↗</span></a>`;
}

function archiveCard(record){
  const n=record.news,day=record.daily;
  return `<article class="archive-card"><div class="archive-card-top"><span class="timeline-bookmark-label">${icon('bookmark')}${L('Saved timeline','保存したTL')}</span>${timestampHTML({id:record.key})}<span>${record.postCount} ${L('posts','件の投稿')}</span></div>
    <div class="archive-news-author">${avatar(n)}<div><strong data-user-content>${esc(n.name)}</strong><small>@${esc(n.handle)}</small></div></div>
    <a class="archive-headline" href="${esc(archiveRoute(record.key))}" data-user-content>${esc(localized(record,'title'))}</a>
    <p class="archive-news-text" data-user-content>${esc(localized(n,'text'))}</p>
    <div class="archive-day-heading">${L('Around the same time','その頃の投稿')}</div>
    <div class="archive-daily">${day.map(p=>`<a href="${esc(archiveRoute(record.key,p.id))}" class="archive-daily-post">${avatar(p)}<span><strong data-user-content>${esc(p.name)}</strong><span class="archive-daily-text" data-user-content>${esc(localized(p,'text'))}</span></span></a>`).join('')}</div>
    <div class="archive-card-bottom">${archiveLink(record.key)}<a class="text-link" href="${esc(archiveRoute(record.key,n.id))}">${L('Open the report','報道を開く')}</a></div></article>`;
}

function renderArchive(){
  const records=archiveIndex.records.filter(r=>!query||[r.title,r.titleJa,r.news.text,r.news.textJa,...r.daily.flatMap(p=>[p.name,p.text,p.textJa])].join(' ').toLowerCase().includes(query));
  $('#composer').hidden=true;$('#scopeNote').hidden=true;$('#accountStatus').hidden=true;
  $('#archiveBar').hidden=true;$('#viewBanner').innerHTML='';
  $('#context').innerHTML=`<span>${records.length} ${L('timelines','件のタイムライン')}</span>`;
  setFeedMarkup(records.length?records.map(archiveCard).join(''):`<div class="empty">${L('No matching timelines.','該当するタイムラインがありません。')}</div>`);
  $('#threadInfo').innerHTML=`<div class="side-heading">${L('SAVED TIMELINES','保存したタイムライン')}</div><p class="side-intro">${L('Save the whole conversation.','会話の流れを、まるごと保存。')}</p><p class="side-caption">${L('Bookmark a timeline to return to its posts and replies.','TLを丸ごとブックマーク。その頃の投稿も、返信も、ここから読み返せます。')}</p>`;
  $('#referenceTrail').innerHTML=`<div class="side-heading">${L('BOOKMARKS','ブックマーク')}</div>${archiveIndex.records.map(r=>`<div class="archive-side-item">${archiveLink(r.key,'',esc(localized(r,'title')))}</div>`).join('')}`;
  $('#threadAttachments').innerHTML='';
}

function renderArchiveBar(){
  const bar=$('#archiveBar'),record=seriesRecord(activeEpisode);
  $('#discover').closest('.side-block').hidden=view==='archive';
  bar.hidden=['archive','bookmarks'].includes(view);
  if(bar.hidden||!record)return;
  bar.innerHTML=`<a href="#bookmarks" class="archive-return">← ${L('Bookmarks','ブックマーク')}</a><span class="archive-period">${timestampHTML({id:record.key})}<span data-user-content>${esc(localized(record,'title'))}</span></span>`;
}

function renderBookmarkTabs(){
  $('#pageTitle').textContent=L('Bookmarks','ブックマーク');
  $('#pageSubtitle').textContent=L('Your saved timelines and posts.','保存したタイムラインと投稿。');
  $('#tabs').hidden=false;
  $('#tabs').innerHTML=`<button class="${view==='archive'?'active':''}" data-action="archive" aria-pressed="${view==='archive'}">${L('Timelines','タイムライン')}</button><button class="${view==='bookmarks'?'active':''}" data-action="bookmarks" aria-pressed="${view==='bookmarks'}">${L('Posts','投稿')}</button>`;
  if(view==='bookmarks'){
    $('#scopeNote').hidden=false;
    $('#scopeNote').textContent=L('Saved posts in: ','保存した投稿：')+localized(seriesRecord(activeEpisode),'title');
  }
}

const episodeRenderContent=renderContent;
renderContent=function(){
  if(view==='archive'){renderBase();renderArchive();}
  else episodeRenderContent();
  renderArchiveBar();
  if(['archive','bookmarks'].includes(view))renderBookmarkTabs();
  syncArchiveRoute();
};

function syncArchiveRoute(){
  if(view==='archive'){
    if(location.hash&&location.hash!=='#bookmarks')history.replaceState(null,'','#bookmarks');
    return;
  }
  const route=new URLSearchParams({record:activeEpisode});
  if(view!=='all')route.set('view',view);
  if(['conversation','quotes'].includes(view)&&focusedPost)route.set('post',focusedPost);
  if(view==='thread'&&selectedThread)route.set('thread',selectedThread);
  if(query)route.set('q',query);
  const hash='#'+route.toString();
  if(location.hash!==hash)history.replaceState(null,'',hash);
}

function foreignReferenceHTML(pid,post){
  const key=post.quoteEpisode,record=seriesRecord(key),q=post.quoteSnapshot;
  return `<details class="reference-card archive-reference" data-reference="${esc(pid)}" data-episode="${esc(key)}"><summary aria-label="${esc(L('Expand earlier post','過去の投稿を展開'))}"><span class="reference-kicker">${L('QUOTED FROM AN EARLIER TIMELINE','過去のタイムラインからの引用')}<span class="reference-chevron">⌄</span></span>${q?`<span class="reference-author">${avatar(q)}<strong data-user-content>${esc(q.name)}</strong><span class="muted">@${esc(q.handle)}</span></span><span class="reference-snippet" data-user-content>${esc(localized(q,'text').slice(0,190))}</span>`:''}<span class="reference-hint" data-user-content>${esc(record?localized(record,'title'):L('Earlier post','過去の投稿'))}</span></summary><div class="reference-expanded"></div></details>`;
}

async function expandForeignReference(details){
  details.dataset.loaded='loading';
  const pane=details.querySelector('.reference-expanded');
  pane.innerHTML=`<p class="side-caption">${L('Loading…','読み込み中…')}</p>`;
  try{
    const key=details.dataset.episode,scene=await archivedState(key),p=scene.posts.find(p=>p.id===details.dataset.reference);
    if(!details.isConnected)return;
    if(!p)throw Error('Post unavailable');
    const person=archivePerson(p,scene),thread=scene.threads.find(t=>t.id===p.thread);
    pane.innerHTML=`<article class="inline-post"><div class="inline-post-author">${avatar(person)}<strong data-user-content>${esc(p.name)}</strong>${timestampHTML(p)}</div><div class="inline-post-thread" data-user-content>${esc(localized(thread,'name'))}</div><div class="quote-text" data-user-content>${esc(localized(p,'text'))}</div><div class="archive-card-bottom">${archiveLink(key,p.id,L('Read this conversation','この会話を読む'))}<button class="text-link" data-action="archive-quote" data-record="${esc(key)}" data-id="${esc(p.id)}">${L('Quote','引用する')}</button></div></article><button class="text-link" data-action="collapse-reference">${L('Collapse post','投稿を折りたたむ')} ↑</button>`;
    details.dataset.loaded='true';
  }catch{pane.innerHTML=`<p>${L('This post could not be loaded.','投稿を読み込めませんでした。')}</p>`;delete details.dataset.loaded;}
}

async function composeArchiveQuote(key,pid){
  const destinationEpisode=activeEpisode,scene=await archivedState(key),source=scene.posts.find(p=>p.id===pid);
  if(activeEpisode!==destinationEpisode||!source)return;
  if(key===activeEpisode){composePost(pid,'quote');return;}
  const q=archivePerson(source,scene);
  const destination=state.threads.find(t=>t.owner===state.profile.handle)?.id||state.threads[0].id;
  openDialog(L('Quote an earlier post','過去の投稿を引用する'),`<form id="archiveQuoteForm"><div class="compose-identity">${avatar(state.profile)}<strong data-user-content>${esc(state.profile.name)}</strong></div><label class="field">${L('Destination thread','投稿先のスレッド')}<select name="destination">${state.threads.map(t=>`<option value="${esc(t.id)}" ${t.id===destination?'selected':''}>${esc(localized(t,'name'))}</option>`).join('')}</select></label><blockquote class="archive-compose-source"><strong data-user-content>${esc(q.name)}</strong><p data-user-content>${esc(localized(q,'text'))}</p><small data-user-content>${esc(localized(seriesRecord(key),'title'))}</small></blockquote><label class="field">${L('Your message','投稿本文')}<textarea name="message" required rows="5" maxlength="10000"></textarea></label><div class="dialog-actions"><button type="button" class="secondary" data-action="close">${L('Cancel','キャンセル')}</button><button class="primary" type="submit">${L('Post','投稿する')}</button></div></form>`);
  $('#archiveQuoteForm').onsubmit=e=>{
    e.preventDefault();const form=new FormData(e.target),text=String(form.get('message')||'').trim(),tid=String(form.get('destination'));
    if(!text||activeEpisode!==destinationEpisode||!threadById(tid))return;
    remember();
    const snapshot={name:q.name,handle:q.handle,initials:q.initials,color:q.color,avatar:q.avatar,verified:q.verified,text:q.text||'',textJa:q.textJa||''};
    state.posts.unshift({...state.profile,id:id(),notice:'',noticeJa:'',thread:tid,time:'now',text:state.language==='en'?text:'',textJa:state.language==='ja'?text:'',parentId:'',replyTo:'',quoteId:pid,quoteEpisode:key,quoteSnapshot:snapshot,quoteExcerpt:'',quoteExcerptJa:'',replies:0,quotes:0,reposts:0,likes:0,views:0});
    threadById(tid).following=true;persist();closeDialog();selectedThread=tid;changeView('thread');
    toast(L('Post saved.','投稿を保存しました。'));
  };
}

async function navigateArchive(){
  const token=++archiveNavigation,hash=location.hash.slice(1),params=new URLSearchParams(hash);
  if(!hash||hash==='archive'||hash==='bookmarks'){
    if($('#dialog').open)closeDialog();view='archive';query='';$('#search').value='';render();window.scrollTo(0,0);return;
  }
  const key=params.get('record');if(!seriesRecord(key))return;
  const language=state.language,theme=state.theme;
  try{
    const base=await loadEpisode(key);if(token!==archiveNavigation)return;
    if(key!==activeEpisode){
      persist();episodeStates.set(activeEpisode,state);
      defaults=base;state=episodeStates.get(key)||structuredClone(base);
      storageKey='ratatoskr:'+base.sceneId;
      if(!episodeStates.has(key))try{const raw=localStorage.getItem(storageKey);if(raw)state=validate(JSON.parse(raw));}catch{}
      activeEpisode=key;state.language=language;state.theme=theme;
      applySceneUpdates();state.seriesRecord=key;undoState=null;
    }
    if($('#dialog').open)closeDialog();
    const post=params.get('post'),author=params.get('author'),requestedView=params.get('view');
    focusedPost=post&&state.posts.some(p=>p.id===post)?post:'';
    selectedThread=params.get('thread')||'';query=(params.get('q')||(author?'from:'+author:'')).toLowerCase();$('#search').value=query;
    view=focusedPost?(requestedView==='quotes'?'quotes':'conversation'):['home','profile','threads','bookmarks'].includes(requestedView)?requestedView:requestedView==='thread'&&threadById(selectedThread)?'thread':'all';
    render();window.scrollTo(0,0);
  }catch{if(token===archiveNavigation)toast(L('This timeline could not be opened. Check that its files are present.','この頃のTLを開けませんでした。ファイルの配置を確認してください。'));}
}

const episodeActions=actions;
actions=function(a,i){if(a==='archive'){if(location.hash==='#bookmarks')navigateArchive();else location.hash='bookmarks';return;}return episodeActions(a,i);};
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action="archive-quote"]');
  if(b)composeArchiveQuote(b.dataset.record,b.dataset.id).catch(()=>toast(L('The source post could not be opened.','引用元の投稿を開けませんでした。')));
});
window.addEventListener('hashchange',navigateArchive);

// Exports keep the current record and its edits; the other timelines remain in the folder.
state.seriesRecord=activeEpisode;
episodeStates.set(activeEpisode,state);
if(location.hash||!embedded.initialView||embedded.initialView==='archive')navigateArchive();
else{
  view=['home','all','profile','threads','bookmarks','thread','conversation','quotes'].includes(embedded.initialView)?embedded.initialView:'all';
  selectedThread=embedded.initialThread||'';focusedPost=embedded.initialPost||'';
  if(view==='thread'&&!threadById(selectedThread))view='all';
  render();
}
if(embedded.initialCapture)captureMode(true);
