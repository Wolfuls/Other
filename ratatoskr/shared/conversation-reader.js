// Reading a reply opens its exchange. Writing a reply remains an explicit action.
let conversationReturn=null;

function readerReferenceLinks(p,numbers){
  const refs=[{id:p.parentId,label:L('Reply to','返信先')},{id:localQuoteId(p)!==p.parentId?localQuoteId(p):'',label:L('Quoted source','引用元')}];
  return refs.filter(r=>r.id).map(r=>{
    const target=state.posts.find(q=>q.id===r.id);
    if(!target)return `<p class="reader-reference-missing">${L('The referenced post is unavailable.','参照元の投稿は表示できません。')}</p>`;
    return `<button class="reader-reference" data-action="reader-jump" data-id="${esc(r.id)}"><span>${r.label} · ${numbers.has(r.id)?'#'+numbers.get(r.id)+' ':''}<strong data-user-content>${esc(target.name)}</strong></span><span class="reader-reference-text" data-user-content>${esc(inlineSnippet(target,80))}</span></button>`;
  }).join('')+(p.quoteEpisode&&p.quoteEpisode!==activeEpisode?foreignReferenceHTML(p.quoteId,p):'');
}

function conversationReaderHTML(scope,selected){
  const numbers=new Map(scope.posts.map((p,i)=>[p.id,i+1]));
  return scope.posts.map(p=>postHTML(p,{numbers,selected:selected.id})).join('');
}

function renderConversationReader(){
  const selected=state.posts.find(p=>p.id===focusedPost);
  if(!selected){setFeedMarkup(`<div class="empty">${L('This post is unavailable.','この投稿は表示できません。')}</div>`);return;}
  const scope=conversationScope(selected.id,'',true),participants=new Set(scope.posts.map(p=>p.handle));
  $('#pageTitle').textContent=L('Conversation','会話');
  $('#pageSubtitle').textContent=L('Follow this exchange from the beginning.','このやり取りを、最初の発言から。');
  $('#context').innerHTML=`<span>${scope.posts.length} ${L('posts','件の投稿')} · ${participants.size} ${L('participants','人')}</span><span>${L('Oldest first','古い発言から表示')}</span>`;
  const backLabel=conversationReturn?.query?L('Back to results','検索結果に戻る'):conversationReturn?.view==='profile'?L('Back to profile','プロフィールに戻る'):conversationReturn?.view==='bookmarks'?L('Back to saved posts','保存した投稿に戻る'):L('Back to timeline','TLに戻る');
  $('#viewBanner').innerHTML=`<section class="reader-guide"><div class="reader-navigation"><button class="text-link" data-action="reader-back">← ${backLabel}</button><button class="text-link" data-action="reader-jump" data-id="${esc(scope.posts[0].id)}">${L('Read from the start','最初から読む')}</button><button class="text-link" data-action="reader-jump" data-id="${esc(selected.id)}">${L('Jump to selected post','選んだ投稿へ')} ↓</button></div><p>${L('Earlier posts, replies, and the exchanges continued through quotes. Select a reply target or quoted source to move to that post.','前の発言から、返信や引用で続いたやり取りまで。返信先・引用元を押すと、その発言へ移動します。')}</p><div class="reader-selected-summary"><span>${L('Opened from','ここから開いた会話')}</span><strong data-user-content>${esc(selected.name)}</strong><span data-user-content>${esc(inlineSnippet(selected,100))}</span></div></section>`;
  setFeedMarkup(conversationReaderHTML(scope,selected)+`<div class="reader-end"><button class="text-link" data-action="reader-back">← ${backLabel}</button><button class="secondary" data-action="write-reply" data-id="${esc(selected.id)}">${L('Write a reply','返信を書く')}</button></div>`);
}

const beforeReaderContent=renderContent;
renderContent=function(){
  if(view!=='conversation')return beforeReaderContent();
  renderBase();renderConversationReader();
};

function rememberConversationReturn(pid){
  const feed=$('#feed'),cards=[...feed.querySelectorAll(':scope > article.post')];
  const visible=p=>{const r=p.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;};
  const anchor=cards.find(p=>p.dataset.post===pid&&visible(p))||cards.find(visible);
  conversationReturn={episode:activeEpisode,view,selectedThread,focusedPost,query,scrollY:window.scrollY,
    anchor:anchor?.dataset.post||'',offset:anchor?.getBoundingClientRect().top||0,
    nodes:[...feed.childNodes],markup:feedMarkup.get(feed),rows:feedPostMarkup.get(feed)};
}

const beforeReaderOpen=openConversation;
openConversation=function(pid,mode='conversation'){
  if(!['conversation','quotes'].includes(view))rememberConversationReturn(pid);
  if($('#dialog').open)closeDialog();
  beforeReaderOpen(pid,mode);
};

function jumpWithinConversation(pid){
  const target=[...$('#feed').querySelectorAll(':scope > article.post')].find(p=>p.dataset.post===pid);
  if(!target){openConversation(pid);return;}
  $('#feed').querySelectorAll('.reader-jump-focus').forEach(p=>p.classList.remove('reader-jump-focus'));
  target.classList.add('reader-jump-focus');target.focus({preventScroll:true});
  const header=$('.feed-header'),sticky=['sticky','fixed'].includes(getComputedStyle(header).position);
  target.style.scrollMarginTop=(sticky?header.getBoundingClientRect().height+12:12)+'px';
  target.scrollIntoView({block:'start',behavior:'instant'});
}

function returnFromConversation(){
  const saved=conversationReturn,selected=focusedPost;
  conversationReturn=null;
  if(!saved||saved.episode!==activeEpisode){
    changeView('all');
    requestAnimationFrame(()=>{
      const target=[...$('#feed').querySelectorAll(':scope > article.post')].find(p=>p.dataset.post===selected);
      target?.scrollIntoView({block:'center',behavior:'instant'});
    });return;
  }
  view=saved.view;selectedThread=saved.selectedThread;focusedPost=saved.focusedPost;query=saved.query;$('#search').value=query;
  const feed=$('#feed');feed.replaceChildren(...saved.nodes);
  feedMarkup.set(feed,saved.markup);if(saved.rows)feedPostMarkup.set(feed,saved.rows);else feedPostMarkup.delete(feed);
  render();window.scrollTo({top:saved.scrollY,behavior:'instant'});
  const target=[...feed.querySelectorAll(':scope > article.post')].find(p=>p.dataset.post===saved.anchor);
  if(target){
    target.querySelector('[data-action="reply"]')?.focus({preventScroll:true});
    // Reattached offscreen cards need a frame to recover their measured heights.
    const align=()=>{if(view===saved.view&&target.isConnected)window.scrollBy({top:target.getBoundingClientRect().top-saved.offset,behavior:'instant'});};
    requestAnimationFrame(()=>{align();requestAnimationFrame(align);});
  }
}

const beforeReaderActions=actions;
actions=function(a,i){
  if(a==='reader-jump')return jumpWithinConversation(i);
  if(a==='reader-back')return returnFromConversation();
  if(a==='write-reply')return composePost(i,'reply');
  return beforeReaderActions(a,i);
};
