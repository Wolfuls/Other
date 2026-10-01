// These legacy names exist only to read older saved scenes and imported JSON.
function normalizeBrandIdentifiers(scene){
  if(!scene||typeof scene!=='object')return scene;
  const aliases={'bifrost-buzz':'hotbranch','bifrost-enmi-cutout':'hotbranch-enmi-cutout','bifrost-enmi-doubles-down':'hotbranch-enmi-doubles-down'};
  const rename=value=>Object.hasOwn(aliases,value)?aliases[value]:value;
  return {...scene,
    ...(Array.isArray(scene.threads)?{threads:scene.threads.map(t=>({...t,id:rename(t.id)}))}:{}),
    ...(Array.isArray(scene.posts)?{posts:scene.posts.map(p=>({...p,id:rename(p.id),thread:rename(p.thread),parentId:rename(p.parentId),quoteId:rename(p.quoteId)}))}:{}),
    ...(scene.initialThread?{initialThread:rename(scene.initialThread)}:{}),
    ...(scene.initialPost?{initialPost:rename(scene.initialPost)}:{})};
}

'use strict';
const LOGO='shared/ui/ratatoskr-logo.png';
const icons={archive:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2"/>',home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',threads:'<path d="M4 8h16M3 16h16M10 3 6 21M18 3l-4 18"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',reply:'<path d="M21 11a9 9 0 0 1-9 9H4l1-5a9 9 0 1 1 16-4Z"/>',repost:'<path d="m3 8 4-4 4 4M7 4v12h7m7 0-4 4-4-4m4 4V8h-7"/>',heart:'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 3 11 8 15 5-4 13-10 8-15Z"/>',views:'<path d="M5 20v-6m7 6V4m7 16V9"/>',moon:'<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',plus:'<path d="M12 5v14M5 12h14"/>',save:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="13" r="4"/>',arrow:'<path d="M20 12H4m6-6-6 6 6 6"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[n]||icons.threads}</svg>`;
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=> 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let defaults=normalizeBrandIdentifiers(JSON.parse(document.querySelector('#scene-data').textContent));
const embedded=defaults;
let state=structuredClone(embedded||defaults),view='home',selectedThread='',focusedPost='',query='',capture=false,undoState=null;
let storageKey='ratatoskr:'+state.sceneId;
try{const saved=localStorage.getItem(storageKey);if(saved)state=validate(JSON.parse(saved))}catch{}

// Upgrade the existing scene without discarding edits saved in this browser.
if(!state.preferencesVersion){state.theme='dark';state.preferencesVersion=1;}
state.language=state.language==='ja'?'ja':'en';
const defaultPostsById=new Map(defaults.posts.map(p=>[p.id,p]));
for(const post of state.posts){const original=defaultPostsById.get(post.id);if(original)for(const key of ['text','notice','imageAlt']){if(!post[key+'Ja']&&post[key]===original[key])post[key+'Ja']=original[key+'Ja']||'';}}
for(const thread of state.threads){const original=defaults.threads.find(t=>t.id===thread.id);if(original)for(const key of ['name','description']){if(!thread[key+'Ja']&&thread[key]===original[key])thread[key+'Ja']=original[key+'Ja']||'';}}
for(const key of ['bio','location'])if(!state.profile[key+'Ja']&&state.profile[key]===defaults.profile[key])state.profile[key+'Ja']=defaults.profile[key+'Ja'];
// UI translations are bundled so both languages work from a local HTML file.
const UI_JA = {
  "Home":"ホーム", "Explore threads":"スレッドを探す", "Bookmarks":"ブックマーク", "Profile":"プロフィール",
  "Post":"投稿", "FOLLOWING":"フォロー中のスレッド", "Your threads":"スレッド一覧",
  "Following":"フォロー中", "All threads":"すべてのスレッド", "Follow":"フォロー", "Unfollow":"フォロー解除", "Follow thread":"フォローする",
  "Your corner of Yggdrasil.":"ユグドラシルの、あなたの居場所。", "Saved for another moment.":"あとで読み返すために。", "Find your next conversation.":"次の話題を見つけよう。",
  "RatatoskЯ · Yggdrasil":"RatatoskЯ · ユグドラシル", "Operated from the Upper Layer.":"運営拠点：上層",
  "Across Yggdrasil · Latest posts":"ユグドラシル全域 · 最新の投稿", "Thread conversation · Latest posts":"スレッドの会話 · 最新の投稿", "Personal posts & field notes":"投稿・研究メモ", "Only you can see your bookmarks":"ブックマークは自分だけが閲覧できます", "Conversations from every layer":"各層の話題を探す",
  "IN THE CONVERSATION":"注目の話題", "Join the conversation":"会話に参加", "Threads to explore":"おすすめのスレッド", "Active conversations":"進行中の会話",
  "Community thread":"コミュニティスレッド", "Live conversation":"実況スレッド", "Conversation":"会話",
  "Replying to":"返信先：", "Quote":"引用", "Quotes":"引用", "Replies":"返信", "Reposts":"リポスト", "Likes":"いいね", "Views":"閲覧数",
  "View post":"投稿を表示", "Show more":"さらに表示", "Show less":"折りたたむ", "Reply":"返信する", "Quote posts":"引用ポスト", "Relevant replies":"関連する返信",
  "Back to timeline":"タイムラインに戻る", "Earlier in this conversation":"この会話の前の投稿", "No posts here yet.":"投稿はまだありません。", "Follow a thread or add a post to begin.":"スレッドをフォローするか、投稿を追加してください。", "No posts to show here yet.":"表示する投稿はまだありません。",
  "This quoted post is unavailable.":"引用元の投稿は表示できません。", "This post is unavailable.":"この投稿は表示できません。", "Return to your timeline to continue.":"タイムラインに戻ってください。",
  "Edit profile":"プロフィールを編集", "Edit thread":"スレッドを編集", "Create a thread":"スレッドを作成", "Edit":"編集",
  "SCENE STUDIO":"シーン編集", "Scene Studio":"シーン編集", "Edit scene":"シーン編集", "Add post":"投稿を追加", "Save HTML":"HTMLを保存", "Screenshot":"撮影モード",
  "Edit post":"投稿を編集", "Create a post":"投稿を作成", "Display name":"表示名", "Handle":"ユーザーID", "Avatar initials":"代替アイコンの文字", "Avatar color":"代替アイコンの色", "Avatar image (optional)":"アイコン画像（任意）", "Verified badge":"認証マーク", "Thread":"スレッド", "Timestamp (any text)":"投稿時刻（任意の文字列）",
  "Post text (English)":"投稿本文（英語）", "Post text (Japanese)":"投稿本文（日本語）", "Account status notice (optional)":"アカウントの状態表示（任意・英語）", "Account status notice (Japanese)":"アカウントの状態表示（日本語）", "Replying to (optional handle)":"返信先のID（任意）", "Reply to post":"返信先の投稿", "Standalone post":"独立した投稿", "Quote a post":"引用元の投稿", "No quoted post":"引用なし", "Attachment display":"添付画像の表示形式", "Photo":"写真", "Video thumbnail":"動画のサムネイル", "Video duration (display only)":"動画の長さ（表示のみ）", "Attached image (optional)":"添付画像（任意）", "Remove attached image":"添付画像を削除", "Remove avatar image":"アイコン画像を削除", "Delete":"削除", "Cancel":"キャンセル", "Save changes":"変更を保存",
  "Your character":"自分のキャラクター", "Bio (English)":"自己紹介（英語）", "Bio (Japanese)":"自己紹介（日本語）", "Location (English)":"所在地（英語）", "Location (Japanese)":"所在地（日本語）", "Update existing posts by this character":"このキャラクターの既存の投稿にも反映", "Save character":"キャラクターを保存",
  "Thread name (English)":"スレッド名（英語）", "Thread name (Japanese)":"スレッド名（日本語）", "Description (English)":"説明（英語）", "Description (Japanese)":"説明（日本語）", "Follower count (display text)":"フォロワー数（表示文字列）", "Follow this thread":"このスレッドをフォロー", "Save thread":"スレッドを保存",
  "Name, handle, avatar & bio":"表示名・ID・アイコン・自己紹介", "Community or personal journal":"話題別スレッドや個人用の記録", "Export scene":"シーンを書き出す", "Save an editable JSON backup":"編集可能なJSONバックアップを保存", "Import scene":"シーンを読み込む", "Load a previously saved backup":"保存済みバックアップを読み込む", "Portable copy with this scene inside":"現在のシーンを単独のHTMLに保存", "Undo last edit":"直前の編集を元に戻す", "Restore the previous scene state":"一つ前のシーンの状態を復元", "Timeline-only layout":"タイムラインのみ表示",
  "This scene contains the report, Enmi’s quotation, two Hotbranch posts, twenty initial replies, three quote posts and the subsequent exchanges. The counts represent a broader conversation; these are selected visible posts. Reaction counts and timestamps are staging choices, scaled to an estimated population of 1.3 million. The supplied text is preserved in full. All activity is local.":"このシーンには報道、静寂の引用、Hotbranchの投稿2件、初期の返信20件、引用3件、その後のやり取りが含まれます。表示される投稿は会話の一部であり、反応数は画面外の反応も含みます。数値と時刻は推定人口130万人を前提とした演出用の設定です。英語原文と日本語訳の両方を保存しており、すべての操作はローカルで完結します。",
  "Screenshot mode hides all scene controls and post edit buttons. Press":"撮影モードではシーンの操作・編集ボタンが非表示になります。戻るには", "or":"または", "to return, or double-click the RatatoskЯ logo. Capture with your device’s screenshot tool. Save HTML preserves the current scene and view.":"を押すか、RatatoskЯのロゴをダブルクリックしてください。撮影には端末のスクリーンショット機能を使います。HTML保存では現在のシーン・表示・言語・テーマが保存されます。",
  "Tip: use the ··· on any post to change its author, text, time, image, counts or order. For an empty scene, remove the sample posts below.":"各投稿の「···」から投稿者、本文、時刻、画像、反応数、順序を編集できます。英語と日本語の本文はそれぞれ編集できます。空のシーンにする場合は、下のボタンで投稿を削除してください。",
  "Clear all posts…":"すべての投稿を削除…", "Restore starting scene…":"初期シーンに戻す…", "Clear all posts?":"すべての投稿を削除しますか？", "Remove every post from this scene? Your character and threads will stay. You can undo this in Scene Studio.":"このシーンの投稿をすべて削除しますか？　キャラクターとスレッドは残ります。シーン編集から元に戻せます。", "Clear posts":"投稿を削除", "Restore the starting scene?":"初期シーンに戻しますか？", "This replaces the current scene with the starting posts, replies and quotes in this scene. Export your scene first if you want to keep it.":"現在のシーンを、初期状態の投稿・返信・引用に置き換えます。今の内容を残す場合は、先にシーンを書き出してください。", "Restore scene":"シーンを復元",
  "This is not a valid RatatoskЯ scene.":"有効なRatatoskЯのシーンではありません。", "Invalid thread identifiers.":"スレッドの識別子が無効です。", "A post has an invalid thread or identifier.":"投稿のスレッドまたは識別子が無効です。", "Browser storage is full or unavailable. Use Save HTML to keep your scene.":"ブラウザーの保存領域が使用できません。「HTMLを保存」でシーンを保存してください。", "Choose an image smaller than 6 MB.":"6 MB未満の画像を選んでください。", "Use a PNG, JPEG, WebP or GIF image.":"PNG・JPEG・WebP・GIF形式の画像を使ってください。", "The image could not be read.":"画像を読み込めませんでした。", "Write some post text first.":"投稿本文を入力してください。", "Post saved.":"投稿を保存しました。", "Post deleted. Undo is available in Scene Studio.":"投稿を削除しました。シーン編集から元に戻せます。", "Post moved. Save changes to keep any text edits.":"投稿を移動しました。本文の編集内容を残すには、変更を保存してください。", "Character saved.":"キャラクターを保存しました。", "Saved a portable HTML copy of your scene.":"シーンを単独で使えるHTMLに保存しました。", "Scene backup exported.":"シーンのバックアップを書き出しました。", "Previous scene restored.":"一つ前のシーンを復元しました。", "Scene files must be smaller than 40 MB.":"シーンファイルは40 MB未満にしてください。", "Scene imported.":"シーンを読み込みました。",
  "Attached image":"添付画像", "Attached report image":"報道の添付画像", "NIBELUNG REPORT · Footage still":"NIBELUNG REPORT · 映像の静止画", "This scene uses a still image as a video thumbnail. No playable video is attached.":"このシーンでは静止画を動画のサムネイルとして表示しています。再生可能な動画は添付されていません。",
  "RatatoskЯ home":"RatatoskЯ ホーム", "Main navigation":"メインメニュー", "Switch color theme":"テーマを切り替え", "Switch to light mode":"ライトモードに切り替え", "Switch to dark mode":"ダークモードに切り替え", "Display language":"表示言語", "Write a post":"投稿を作成", "Post text":"投稿本文", "What's happening in your world?":"あなたの世界で、何が起きている？", "Post to thread":"投稿先のスレッド", "Timeline":"タイムライン", "Search RatatoskЯ":"RatatoskЯを検索", "Search posts and threads":"投稿やスレッドを検索", "Scene controls":"シーンの操作", "Close dialog":"ダイアログを閉じる", "Verified":"認証済み", "Post views":"投稿の閲覧数", "Account status":"アカウントの状態", "Post activity":"投稿への反応", "Move post up":"投稿を上に移動", "Move post down":"投稿を下に移動", "Account temporarily restricted":"アカウントを一時的に制限中"
};
const translationRules=[
    [/^Following (\d+) threads · Latest posts$/,m=>`${m[1]}件のスレッドをフォロー中 · 最新の投稿`],
    [/^(.+) following$/,m=>`${m[1]}人がフォロー`],
    [/^Import failed: (.*)$/,m=>`読み込みに失敗しました：${tr(m[1])}`],
    [/^Quoted post by (.+)$/,m=>`${m[1]}の引用元の投稿`],
    [/^Edit post by (.+)$/,m=>`${m[1]}の投稿を編集`],
    [/^View reply context for (.+)$/,m=>`${m[1]}の返信元を表示`],
    [/^View quotes of (.+)$/,m=>`${m[1]}の投稿への引用を表示`],
    [/^View replies to (.+)$/,m=>`${m[1]}の投稿への返信を表示`],
    [/^Repost by (.+)$/,m=>`${m[1]}の投稿をリポスト`],
    [/^Like post by (.+)$/,m=>`${m[1]}の投稿にいいね`],
    [/^Bookmark post by (.+)$/,m=>`${m[1]}の投稿をブックマーク`],
    [/^Post and replies by (.+)$/,m=>`${m[1]}の投稿と返信`],
    [/^Open attached (?:footage still|image) from (.+)$/,m=>`${m[1]}の添付画像を開く`],
    [/^(\d+) views$/,m=>`${m[1]}回表示`],
    [/^Unfollow (.+)$/,m=>`${m[1]}のフォローを解除`],
    [/^Follow (.+)$/,m=>`${m[1]}をフォロー`]
  ];
const translationCache=new Map();
function tr(value){
  if(state.language!=='ja'||typeof value!=='string')return value;
  if(Object.hasOwn(UI_JA,value))return UI_JA[value];
  if(translationCache.has(value))return translationCache.get(value);
  for(const [pattern,replace] of translationRules){
    const match=value.match(pattern);
    if(match){const result=replace(match);translationCache.set(value,result);return result;}
  }
  translationCache.set(value,value);return value;
}
function localized(object,key){
  if(!object)return '';
  return (state.language==='ja'?object[key+'Ja']||object[key]:object[key]||object[key+'Ja'])||'';
}
// Remember UI source text independently of user-written post content.
// Restore those sources in the exported DOM so either language can be selected after reopening.
const uiTextSources=new WeakMap(),uiAttributeSources=new WeakMap();
function localizeUI(){
  document.documentElement.lang=state.language==='ja'?'ja':'en';
  document.documentElement.style.colorScheme=state.theme==='dark'?'dark':'light';
  const selector=$('#languageSelect');if(selector)selector.value=state.language;
  const themeButton=$('#themeButton');
  themeButton.setAttribute('aria-label',state.theme==='dark'?'Switch to light mode':'Switch to dark mode');
  themeButton.innerHTML=state.theme==='dark'?'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>':icon('moon');
  // Reject the feed subtree before visiting its nodes. Its templates are bilingual.
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
    acceptNode(node){return node.nodeType===1&&(node.id==='feed'||node.matches('script,style'))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}
  });
  let node;
  while(node=walker.nextNode()){
    if(node.nodeType===Node.TEXT_NODE){
      if(node.parentElement.closest('textarea,#languageSelect,.post-text,.quote-text,[data-user-content]'))continue;
      const source=uiTextSources.get(node)??node.nodeValue;
      if(!source.trim())continue;
      const value=source.replace(/\S(?:[\s\S]*\S)?/,text=>tr(text));
      if(value!==source||uiTextSources.has(node)){
        uiTextSources.set(node,source);if(node.nodeValue!==value)node.nodeValue=value;
      }
    }else{
      const sources=uiAttributeSources.get(node)||{};let hasAttributes=false;
      for(const key of ['aria-label','placeholder','title']){
        if(!node.hasAttribute(key))continue;
        const current=node.getAttribute(key),source=node.id==='themeButton'?current:(sources[key]??current);
        sources[key]=source;hasAttributes=true;
        const value=tr(source);if(current!==value)node.setAttribute(key,value);
      }
      if(hasAttributes)uiAttributeSources.set(node,sources);
    }
  }
  document.title=$('#pageTitle').textContent+' / RatatoskЯ';
}
function restoreUISources(copy){
  const sourceWalker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
  const copyWalker=document.createTreeWalker(copy,NodeFilter.SHOW_TEXT);
  let source,target;
  while((source=sourceWalker.nextNode())&&(target=copyWalker.nextNode())){
    if(uiTextSources.has(source))target.nodeValue=uiTextSources.get(source);
  }
  const sources=document.documentElement.querySelectorAll('*'),targets=copy.querySelectorAll('*');
  sources.forEach((el,i)=>{const attrs=uiAttributeSources.get(el);if(attrs)Object.entries(attrs).forEach(([k,v])=>targets[i].setAttribute(k,v));});
}
function setLanguage(language){state.language=language==='ja'?'ja':'en';commit();}
function render(){renderContent();localizeUI();}

function localImagePath(v){return typeof v==='string'&&/^(?:\.\.\/)*(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(?:png|jpe?g|webp|gif)$/i.test(v)?v:''}
function imageResource(v){return typeof v==='string'&&(/^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(v)||localImagePath(v))?v:''}
function imageValue(v){return typeof v==='string'&&(/^asset:[a-zA-Z0-9_-]+$/.test(v)||imageResource(v))?v:''}
function validate(s){s=normalizeBrandIdentifiers(s);if(!s||s.version!==1||!s.profile||!Array.isArray(s.threads)||!s.threads.length||!Array.isArray(s.posts)||s.threads.length>200||s.posts.length>2000)throw Error('This is not a valid RatatoskЯ scene.');const str=(v,max=10000)=>String(v??'').slice(0,max);const color=v=>/^#[0-9a-f]{6}$/i.test(v)?v:'#536e62';const person=p=>({name:str(p.name,100)||'Unnamed',handle:str(p.handle,100).replace(/^@/,''),initials:str(p.initials,4)||'?',color:color(p.color),avatar:imageValue(p.avatar),verified:!!p.verified});const threads=s.threads.map(t=>({id:str(t.id,100),name:str(t.name,200),nameJa:str(t.nameJa,200),description:str(t.description),descriptionJa:str(t.descriptionJa),members:str(t.members,40),kind:str(t.kind,30),owner:str(t.owner,100),color:color(t.color),following:!!t.following,live:!!t.live}));if(new Set(threads.map(t=>t.id)).size!==threads.length||threads.some(t=>!t.id||!t.name))throw Error('Invalid thread identifiers.');const posts=s.posts.map(p=>({...person(p),id:str(p.id,100),thread:str(p.thread,100),time:str(p.time,100),text:str(p.text),textJa:str(p.textJa),replyTo:str(p.replyTo,100),parentId:str(p.parentId,100),image:imageValue(p.image),imageAlt:str(p.imageAlt,1000),imageAltJa:str(p.imageAltJa,1000),notice:str(p.notice,200),noticeJa:str(p.noticeJa,200),leadBold:!!p.leadBold,statusQuote:p.statusQuote&&typeof p.statusQuote==='object'?{handle:str(p.statusQuote.handle,100).replace(/^@/,''),text:str(p.statusQuote.text,200),textJa:str(p.statusQuote.textJa,200)}:null,quoteId:str(p.quoteId,100),quoteEpisode:str(p.quoteEpisode,100),quoteSnapshot:p.quoteSnapshot?{...person(p.quoteSnapshot),text:str(p.quoteSnapshot.text),textJa:str(p.quoteSnapshot.textJa)}:null,quoteExcerpt:str(p.quoteExcerpt),quoteExcerptJa:str(p.quoteExcerptJa),quotes:num(p.quotes),expanded:!!p.expanded,mediaType:p.mediaType==='video'?'video':'image',duration:str(p.duration,20),replies:num(p.replies),reposts:num(p.reposts),likes:num(p.likes),views:num(p.views),liked:!!p.liked,reposted:!!p.reposted,bookmarked:!!p.bookmarked}));if(new Set(posts.map(p=>p.id)).size!==posts.length||posts.some(p=>!p.id||!threads.some(t=>t.id===p.thread)))throw Error('A post has an invalid thread or identifier.');return{assets:s.assets&&typeof s.assets==='object'?Object.fromEntries(Object.entries(s.assets).filter(([k,v])=>/^[a-zA-Z0-9_-]+$/.test(k)&&imageResource(v))):defaults.assets,version:1,sceneId:str(s.sceneId,100)||id(),seriesRecord:str(s.seriesRecord,100),theme:s.theme==='light'?'light':'dark',language:s.language==='ja'?'ja':'en',contentVersion:num(s.contentVersion),accounts:Array.isArray(s.accounts)?s.accounts.slice(0,2000).map(a=>({...person(a),bio:str(a.bio),bioJa:str(a.bioJa)})):[],preferencesVersion:num(s.preferencesVersion),timelineVersion:num(s.timelineVersion),layoutVersion:2,sortOrder:s.sortOrder==='oldest'?'oldest':'newest',feedOnly:!!s.feedOnly,profile:{...person(s.profile),notice:str(s.profile.notice,200),noticeJa:str(s.profile.noticeJa,200),bio:str(s.profile.bio),bioJa:str(s.profile.bioJa),location:str(s.profile.location,100),locationJa:str(s.profile.locationJa,100)},threads,posts}}
function num(n){return Math.max(0,Math.min(999999999,Math.floor(Number(n)||0)))}
function persist(){try{const cache={...state};const assetKeys=Object.keys(cache.assets||{});if(assetKeys.length===Object.keys(defaults.assets||{}).length&&assetKeys.every(k=>cache.assets[k]===defaults.assets[k]))delete cache.assets;localStorage.setItem(storageKey,JSON.stringify(cache))}catch{toast('Browser storage is full or unavailable. Use Save HTML to keep your scene.')}}
function commit(){persist();render()}
function remember(){undoState=structuredClone(state)}
function toast(t){$('#toast').textContent=tr(t);clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').textContent='',4200)}
function avatar(p){return `<div class="avatar" style="background:${/^#[a-f0-9]{6}$/i.test(p.color)?p.color:'#536e62'}">${validImage(p.avatar)?`<img loading="lazy" decoding="async" src="${validImage(p.avatar)}" alt="">`:esc(p.initials||p.name.slice(0,2).toUpperCase())}</div>`}
function count(n){return n>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':n>=1000?(n/1000).toFixed(1).replace('.0','')+'K':n||''}
function threadById(i){return state.threads.find(t=>t.id===i)}

function mediaHTML(p){if(!validImage(p.image))return '';return `<button class="media-frame" data-action="media" data-id="${esc(p.id)}" aria-label="${esc(tr('Open attached '+(p.mediaType==='video'?'footage still':'image')+' from '+p.name))}"><img loading="lazy" decoding="async" src="${validImage(p.image)}" alt="${esc(localized(p,'imageAlt')||'Midgard street: damaged buildings and a rail vehicle in the wreckage, with YDF and emergency responders on scene.')}">${p.mediaType==='video'?`<span class="play-disc" aria-hidden="true">▶</span><span class="media-badge">${esc(p.duration||'0:42')}</span><span class="media-source">NIBELUNG REPORT</span>`:''}</button>`}
function openConversation(pid,mode='conversation'){focusedPost=pid;changeView(mode)}
function openDialog(title,html){$('#dialogTitle').textContent=title;$('#dialogBody').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();localizeUI()}
function closeDialog(){$('#dialog').close()}
function field(label,name,value='',type='text',full=false){return `<label class="field ${full?'full':''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${['name','handle'].includes(name)?'required maxlength="100"':''}></label>`}
function area(label,name,value){return `<label class="field full">${label}<textarea name="${name}" maxlength="10000">${esc(value)}</textarea></label>`}
function fileField(label,name){return `<label class="field full">${label}<input type="file" name="${name}" accept="image/png,image/jpeg,image/webp,image/gif"></label>`}
async function imageFile(input,previous){const f=input.files[0];if(!f)return previous||'';if(f.size>6*1024*1024)throw Error('Choose an image smaller than 6 MB.');if(!['image/png','image/jpeg','image/webp','image/gif'].includes(f.type))throw Error('Use a PNG, JPEG, WebP or GIF image.');return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(Error('The image could not be read.'));r.readAsDataURL(f)})}
function editPost(postId,replyId){const existing=state.posts.find(p=>p.id===postId),reply=state.posts.find(p=>p.id===replyId);const p=existing||{...state.profile,notice:'',noticeJa:'',id:id(),thread:reply?.thread||selectedThread||$('#quickThread').value||state.threads[0].id,time:'now',text:'',replies:0,reposts:0,likes:0,views:0,replyTo:reply?.handle||'',parentId:reply?.id||''};openDialog(existing?'Edit post':'Create a post',`<form id="postForm"><div class="form-grid">${field('Display name','name',p.name)}${field('Handle','handle',p.handle)}${field('Avatar initials','initials',p.initials)}${field('Avatar color','color',p.color,'color')}${fileField('Avatar image (optional)','avatarFile')}<label class="check full"><input type="checkbox" name="verified" ${p.verified?'checked':''}> Verified badge</label><label class="field">Thread<select name="thread">${state.threads.map(t=>`<option value="${esc(t.id)}" ${t.id===p.thread?'selected':''}>${esc(localized(t,'name'))}</option>`).join('')}</select></label><input type="hidden" name="time" value="${esc(p.time)}"><div class="field"><span>${L('Timestamp','日時')}</span>${timestampHTML(p)}</div>${area('Post text (English)','text',p.text)}${area('Post text (Japanese)','textJa',p.textJa||'')}${area('Quoted excerpt (English)','quoteExcerpt',p.quoteExcerpt||'')}${area('Quoted excerpt (Japanese)','quoteExcerptJa',p.quoteExcerptJa||'')}${field('Account status notice (optional)','notice',p.notice||'','text',true)}${field('Account status notice (Japanese)','noticeJa',p.noticeJa||'','text',true)}${field('Replying to (optional handle)','replyTo',p.replyTo,'text',true)}<label class="field full">Reply to post<select name="parentId"><option value="">Standalone post</option>${state.posts.filter(q=>q.id!==p.id).map(q=>`<option value="${esc(q.id)}" ${q.id===p.parentId?'selected':''}>${esc(q.name)} — ${esc(localized(q,'text').slice(0,60))}</option>`).join('')}</select></label><label class="field full">Quote a post<select name="quoteId"><option value="">No quoted post</option>${p.quoteEpisode&&p.quoteEpisode!==activeEpisode?`<option value="__archive_source__" selected>${L("Keep earlier quoted post","過去の引用元を保持")}</option>`:""}${state.posts.filter(q=>q.id!==p.id).map(q=>`<option value="${esc(q.id)}" ${q.id===localQuoteId(p)?'selected':''}>${esc(q.name)} — ${esc(localized(q,'text').slice(0,70))}</option>`).join('')}</select></label><label class="field">Attachment display<select name="mediaType"><option value="image">Photo</option><option value="video" ${p.mediaType==='video'?'selected':''}>Video thumbnail</option></select></label>${field('Video duration (display only)','duration',p.duration||'0:42')}${fileField('Attached image (optional)','imageFile')}${p.image?'<label class="check"><input type="checkbox" name="removeImage"> Remove attached image</label>':''}${p.avatar?'<label class="check"><input type="checkbox" name="removeAvatar"> Remove avatar image</label>':''}<div class="counts">${['replies','reposts','quotes','likes','views'].map(k=>field(k[0].toUpperCase()+k.slice(1),k,p[k]||0,'number')).join('')}</div></div><div class="dialog-actions">${existing?'<button type="button" class="danger secondary" id="deletePost">Delete</button><button type="button" class="secondary" id="moveUp" aria-label="Move post up">↑</button><button type="button" class="secondary" id="moveDown" aria-label="Move post down">↓</button>':''}<button type="button" class="secondary" data-action="close">Cancel</button><button class="primary" type="submit">${existing?'Save changes':'Add post'}</button></div></form>`);const form=$('#postForm');form.onsubmit=async e=>{e.preventDefault();try{const f=new FormData(form),updated={...p,...Object.fromEntries(['name','handle','initials','color','thread','time','text','textJa','quoteExcerpt','quoteExcerptJa','replyTo','parentId','quoteId','mediaType','duration','notice','noticeJa'].map(k=>[k,String(f.get(k)||'').trim()])),verified:f.has('verified')};if(updated.quoteId==='__archive_source__')updated.quoteId=p.quoteId;else{updated.quoteEpisode='';updated.quoteSnapshot=null;}if(!updated.text&&!updated.textJa)throw Error('Write some post text first.');updated.handle=updated.handle.replace(/^@/,'');updated.replyTo=updated.replyTo.replace(/^@/,'');if(updated.parentId){const parent=state.posts.find(q=>q.id===updated.parentId);if(parent)updated.replyTo=parent.handle;}updated.avatar=f.has('removeAvatar')?'':await imageFile(form.elements.avatarFile,p.avatar);updated.image=f.has('removeImage')?'':await imageFile(form.elements.imageFile,p.image);['replies','reposts','quotes','likes','views'].forEach(k=>updated[k]=num(f.get(k)));remember();if(existing)state.posts[state.posts.indexOf(existing)]=updated;else{state.posts.unshift(updated);const parent=state.posts.find(q=>q.id===updated.parentId);if(parent)parent.replies++;state.threads.find(t=>t.id===updated.thread).following=true;if(updated.parentId){view='conversation';focusedPost=updated.parentId}else{view='thread';selectedThread=updated.thread}}commit();closeDialog();toast('Post saved.')}catch(e){toast(e.message)}};if(existing){$('#deletePost').onclick=()=>{remember();state.posts=state.posts.filter(x=>x.id!==p.id);commit();closeDialog();toast('Post deleted. Undo is available in Scene Studio.')};$('#moveUp').onclick=()=>movePost(p.id,-1);$('#moveDown').onclick=()=>movePost(p.id,1)}}
function movePost(pid,delta){const n=state.posts.findIndex(p=>p.id===pid),m=n+delta;if(m<0||m>=state.posts.length)return;remember();[state.posts[n],state.posts[m]]=[state.posts[m],state.posts[n]];commit();toast('Post moved. Save changes to keep any text edits.')}
function editProfile(){const p=state.profile;openDialog('Your character',`<form id="profileForm"><div class="form-grid">${field('Display name','name',p.name)}${field('Handle','handle',p.handle)}${field('Avatar initials','initials',p.initials)}${field('Avatar color','color',p.color,'color')}${fileField('Avatar image (optional)','avatarFile')}${field('Account status notice (optional)','notice',p.notice||'','text',true)}${field('Account status notice (Japanese)','noticeJa',p.noticeJa||'','text',true)}${area('Bio (English)','bio',p.bio)}${area('Bio (Japanese)','bioJa',p.bioJa||'')}${field('Location (English)','location',p.location,'text',true)}${field('Location (Japanese)','locationJa',p.locationJa||'','text',true)}<label class="check full"><input name="verified" type="checkbox" ${p.verified?'checked':''}> Verified badge</label>${p.avatar?'<label class="check full"><input name="removeAvatar" type="checkbox"> Remove avatar image</label>':''}<label class="check full"><input name="updatePosts" type="checkbox" checked> Update existing posts by this character</label></div><div class="dialog-actions"><button class="primary" type="submit">Save character</button></div></form>`);$('#profileForm').onsubmit=async e=>{e.preventDefault();try{const form=e.target,f=new FormData(form),updated={...Object.fromEntries(['name','handle','initials','color','bio','bioJa','location','locationJa','notice','noticeJa'].map(k=>[k,String(f.get(k)||'').trim()])),verified:f.has('verified'),avatar:f.has('removeAvatar')?'':await imageFile(form.elements.avatarFile,p.avatar)};updated.handle=updated.handle.replace(/^@/,'');remember();state.threads.forEach(t=>{if(t.owner===p.handle)t.owner=updated.handle});if(f.has('updatePosts'))state.posts.forEach(post=>{if(post.handle===p.handle)Object.assign(post,{name:updated.name,handle:updated.handle,initials:updated.initials,color:updated.color,avatar:updated.avatar,verified:updated.verified})});state.profile=updated;commit();closeDialog();toast('Character saved.')}catch(e){toast(e.message)}}}
function editThread(tid){const existing=threadById(tid),t=existing||{id:id(),name:'',description:'',members:'0',following:true,live:false,kind:'personal',owner:state.profile.handle,color:'#9eb883'};openDialog(existing?'Edit thread':'Create a thread',`<form id="threadForm"><div class="form-grid">${field('Thread name (English)','name',t.name,'text',true)}${field('Thread name (Japanese)','nameJa',t.nameJa||'','text',true)}${area('Description (English)','description',t.description)}${area('Description (Japanese)','descriptionJa',t.descriptionJa||'')}${field('Follower count (display text)','members',t.members,'text',true)}<label class="check"><input type="checkbox" name="live" ${t.live?'checked':''}> Live conversation</label><label class="check"><input type="checkbox" name="following" ${t.following?'checked':''}> Follow this thread</label></div><div class="dialog-actions"><button type="submit" class="primary">Save thread</button></div></form>`);$('#threadForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);remember();Object.assign(t,{name:f.get('name').trim(),nameJa:f.get('nameJa').trim(),description:f.get('description').trim(),descriptionJa:f.get('descriptionJa').trim(),members:f.get('members').trim(),live:f.has('live'),following:f.has('following')});if(!existing)state.threads.push(t);view='thread';selectedThread=t.id;commit();closeDialog()}}
function studio(){openDialog('Scene Studio',`<p class="help">${L("Edit the currently open timeline. Save HTML and JSON export preserve this timeline; other periods stay in their episode folders. Keep exported HTML beside index.html with the shared and episodes folders. All edits stay on this device.","現在開いている時期のTLを編集します。HTML保存・JSON書き出しの対象はこのTLです。ほかの時期のデータは各フォルダに残ります。保存したHTMLは、shared・episodesフォルダと一緒にindex.htmlの隣へ置いてください。編集内容はこの端末内に保存されます。")}</p><div class="studio-grid"><button data-action="edit-profile"><strong>Your character</strong><span>Name, handle, avatar & bio</span></button><button data-action="new-thread"><strong>Create a thread</strong><span>Community or personal journal</span></button><button data-action="export-json"><strong>Export scene</strong><span>Save an editable JSON backup</span></button><button data-action="import-json"><strong>Import scene</strong><span>Load a previously saved backup</span></button><button data-action="save-html"><strong>Save HTML</strong><span>Portable copy with this scene inside</span></button><button data-action="undo" ${undoState?'':'disabled'}><strong>Undo last edit</strong><span>Restore the previous scene state</span></button></div><label class="check"><input id="feedOnly" type="checkbox" ${state.feedOnly?'checked':''}> Timeline-only layout</label><p class="help" style="margin:14px 0">Screenshot mode hides all scene controls and post edit buttons. Press <strong>Esc</strong> or <strong>F8</strong> to return, or double-click the RatatoskЯ logo. Capture with your device’s screenshot tool. Save HTML preserves the current scene and view.</p><h3 style="margin-top:22px">Your threads</h3>${state.threads.map(t=>`<div class="thread-editor-row"><strong>${esc(localized(t,'name'))}</strong><button class="secondary" data-action="edit-thread" data-id="${esc(t.id)}">Edit</button></div>`).join('')}<p class="help" style="margin-top:20px">Tip: use the ··· on any post to change its author, text, time, image, counts or order. For an empty scene, remove the sample posts below.</p><div class="dialog-actions"><button class="secondary danger" data-action="clear-posts">Clear all posts…</button><button class="secondary" data-action="reset">Restore starting scene…</button></div>`);$('#feedOnly').onchange=e=>{state.feedOnly=e.target.checked;commit()}}
function captureMode(on){capture=on;document.body.classList.toggle('capture-mode',on);$('#toast').textContent='';if($('#dialog').open)closeDialog()}
function download(name,data,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function saveHTML(){const copy=document.documentElement.cloneNode(true),snapshot={...state,sceneId:id(),initialView:view,initialThread:selectedThread,initialPost:focusedPost,initialCapture:capture};restoreUISources(copy);copy.querySelectorAll('script[data-episode]').forEach(el=>el.remove());copy.querySelectorAll('#feed,#account,#composeAvatar,#viewBanner,#discover,#leftThreads,#nav,#authorCard,#conversationGuide,#threadInfo,#referenceTrail,#threadAttachments,#mobileNav,#accountStatus,#archiveBar').forEach(el=>el.innerHTML='');copy.querySelector('#scene-data').textContent=JSON.stringify(snapshot).replace(/</g,'\\u003c');copy.querySelector('#dialog').removeAttribute('open');copy.querySelector('#dialogBody').innerHTML='';copy.querySelector('#toast').textContent='';copy.querySelector('#quickText').textContent='';download('Ratatoskr-scene.html','<!doctype html>\n'+copy.outerHTML,'text/html;charset=utf-8');toast(L('HTML saved. Keep it beside index.html in this folder.','HTMLを保存しました。このフォルダのindex.htmlと同じ場所に置いてください。'))}
function changeView(v){view=v;query='';$('#search').value='';render();window.scrollTo({top:0,behavior:'instant'})}
function legacyActions(a,i){const p=state.posts.find(x=>x.id===i);switch(a){case'conversation':openConversation(i);break;case'quotes-view':openConversation(i,'quotes');break;case'expand':if(p){p.expanded=!p.expanded;commit()}break;case'media':if(p&&validImage(p.image))openDialog(p.mediaType==='video'?'NIBELUNG REPORT · Footage still':'Attached image',`<img style="width:100%;border-radius:10px" src="${validImage(p.image)}" alt="Attached report image"><p class="help studio-only" style="margin-top:12px">This scene uses a still image as a video thumbnail. No playable video is attached.</p>`);break;case'home':case'all':case'threads':case'bookmarks':case'profile':changeView(a);break;case'thread':selectedThread=i;changeView('thread');break;case'live':selectedThread=(state.threads.find(t=>t.live)||state.threads[0]).id;changeView('thread');break;case'follow':remember();threadById(i).following=!threadById(i).following;commit();break;case'theme':state.theme=state.theme==='light'?'dark':'light';commit();break;case'like':case'repost':case'bookmark':{if(!p)return;remember();const key={like:'liked',repost:'reposted',bookmark:'bookmarked'}[a];p[key]=!p[key];if(a!=='bookmark'){const k=a==='like'?'likes':'reposts';p[k]=Math.max(0,num(p[k])+(p[key]?1:-1))}commit();break}case'quick-post':{const text=$('#quickText').value.trim();if(!text)return;remember();const tid=$('#quickThread').value;state.posts.unshift({...state.profile,notice:'',noticeJa:'',id:id(),thread:tid,text:state.language==='en'?text:'',textJa:state.language==='ja'?text:'',time:'now',likes:0,reposts:0,replies:0,views:0});threadById(tid).following=true;$('#quickText').value='';if(view==='thread'&&selectedThread!==tid)selectedThread=tid;commit();break}case'new-post':editPost();break;case'edit-post':editPost(i);break;case'reply':editPost(null,i);break;case'edit-profile':editProfile();break;case'edit-thread':editThread(i);break;case'new-thread':editThread();break;case'studio':studio();break;case'capture':captureMode(true);window.scrollTo(0,0);break;case'close':closeDialog();break;case'save-html':saveHTML();break;case'export-json':download('Ratatoskr-scene.json',JSON.stringify(state,null,2),'application/json');toast('Scene backup exported.');break;case'import-json':$('#importFile').click();break;case'undo':if(undoState){const prior=undoState;undoState=structuredClone(state);state=prior;commit();closeDialog();toast('Previous scene restored.')}break;case'clear-posts':openDialog('Clear all posts?',`<p>Remove every post from this scene? Your character and threads will stay. You can undo this in Scene Studio.</p><div class="dialog-actions"><button class="secondary" data-action="studio">Cancel</button><button class="primary" data-action="confirm-clear">Clear posts</button></div>`);break;case'confirm-clear':remember();state.posts=[];commit();closeDialog();break;case'reset':openDialog('Restore the starting scene?',`<p>This replaces the current scene with the starting posts, replies and quotes in this scene. Export your scene first if you want to keep it.</p><div class="dialog-actions"><button class="secondary" data-action="studio">Cancel</button><button class="primary" data-action="confirm-reset">Restore scene</button></div>`);break;case'confirm-reset':remember();state=structuredClone(defaults);view='home';selectedThread='';commit();closeDialog();break}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)actions(b.dataset.action,b.dataset.id)});$('#closeDialog').onclick=closeDialog;$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog()}});
document.addEventListener('keydown',e=>{if(e.key==='F8'){e.preventDefault();captureMode(!capture)}if(e.key==='Escape'&&capture)captureMode(false)});document.querySelectorAll('.brand,.mobile-brand').forEach(el=>el.ondblclick=()=>captureMode(false));$('#search').oninput=e=>{query=e.target.value.toLowerCase().trim();render()};$('#importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>40*1024*1024)throw Error('Scene files must be smaller than 40 MB.');const imported=validate(JSON.parse(await file.text()));remember();state=imported;view='home';selectedThread='';query='';$('#search').value='';commit();closeDialog();toast('Scene imported.')}catch(error){toast('Import failed: '+error.message)}e.target.value=''};
$('#languageSelect').onchange=e=>setLanguage(e.target.value);$('#themeButton').innerHTML=icon('moon');$('#searchIcon').innerHTML=icon('search');$('#studioButton').innerHTML=icon('edit')+'<span>Edit scene</span>';$('#addButton').innerHTML=icon('plus')+'<span>Add post</span>';$('#saveButton').innerHTML=icon('save')+'<span>Save HTML</span>';$('#captureButton').innerHTML=icon('camera')+'<span>Screenshot</span>';
const L=(en,ja)=>state.language==='ja'?ja:en;
// Visual corruption is deliberate; actual ordering keys never enter the rendered stamp.
function localizedTime(){return '▓▒██╱▒█░';}
function timestampHTML(p){
  const patterns=['██/▒▓/██ ░█:▓▒','▓▒/██/░█ ██:▒█','██/░█/▓▒ ▒▓:██','▒█/▓▓/██ █░:▓█'];
  let seed=0;for(const c of String(p?.id||''))seed=(seed*31+c.charCodeAt(0))>>>0;
  const noise=patterns[seed%patterns.length],label=L('Timestamp unreadable','日時を読み取れません');
  return `<span class="time-corrupt glitch-${seed%3}" role="img" aria-label="${label}" title="${label}"><span class="time-static" aria-hidden="true" data-echo="${noise}">${noise}</span><span class="time-cut" aria-hidden="true"></span></span>`;
}
// Reuse image resources. Relative image paths travel with the scene folder.
const renderedImages=new Map();
function validImage(value){
  const data=typeof value==='string'&&value.startsWith('asset:')?state.assets?.[value.slice(6)]:value;
  if(typeof data!=='string'||!data)return '';
  if(renderedImages.has(data))return renderedImages.get(data);
  if(localImagePath(data)){renderedImages.set(data,data);return data;}
  if(!/^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(data)){renderedImages.set(data,'');return '';}
  let url='';
  try{
    const comma=data.indexOf(','),bytes=Uint8Array.from(atob(data.slice(comma+1)),c=>c.charCodeAt(0));
    url=URL.createObjectURL(new Blob([bytes],{type:data.slice(5,data.indexOf(';'))}));
  }catch{url=data;}
  renderedImages.set(data,url);return url;
}
const feedMarkup=new WeakMap(),feedPostMarkup=new WeakMap();
function setFeedMarkup(markup){
  const feed=$('#feed');
  if(feedMarkup.get(feed)===markup)return;
  feedPostMarkup.delete(feed);feed.innerHTML=markup;feedMarkup.set(feed,markup);
}
function setFeedPosts(posts){
  const feed=$('#feed'),previous=feedPostMarkup.get(feed);
  const rows=posts.map(p=>({id:p.id,markup:postHTML(p)}));
  const sameOrder=previous&&previous.language===state.language&&previous.rows.length===rows.length
    &&feed.children.length===rows.length&&rows.every((r,i)=>r.id===previous.rows[i].id);
  const markup=rows.map(r=>r.markup).join('');
  if(sameOrder){
    for(let i=0;i<rows.length;i++)if(rows[i].markup!==previous.rows[i].markup)
      feed.children[i].outerHTML=rows[i].markup;
    feedMarkup.set(feed,markup);
  }else setFeedMarkup(markup);
  feedPostMarkup.set(feed,{language:state.language,rows});
}
const safeTone=t=>/^#[0-9a-f]{6}$/i.test(t?.color)?t.color:'#87b68a';
const threadPosts=t=>state.posts.filter(p=>p.thread===t.id);
const orderPosts=posts=>state.sortOrder==='oldest'?[...posts].reverse():posts;
const shownCount=n=>Number(n).toLocaleString(state.language==='ja'?'ja-JP':'en-US');
function kindLabel(t){return ({official:L('Official','公式'),personal:L('Personal','個人'),media:L('Media','メディア'),community:L('Community','コミュニティ'),shop:L('Shop','店舗')})[t?.kind]||L('Community','コミュニティ');}
function threadTag(t,interactive=true){const tag=interactive?'button':'span';return `<${tag} class="thread-tag" ${interactive?`data-action="thread" data-id="${esc(t.id)}"`:''} style="--thread-color:${safeTone(t)}"><span class="thread-dot"></span><span data-user-content>${esc(localized(t,'name'))}</span><span class="thread-kind">${kindLabel(t)}</span></${tag}>`;}
function referenceHTML(pid,post={},reply=false){
  if(!reply&&post.quoteEpisode&&post.quoteEpisode!==activeEpisode)return foreignReferenceHTML(pid,post);
  if(!pid)return '';
  const q=state.posts.find(p=>p.id===pid);
  if(!q)return `<div class="reference-missing">${L('The referenced post is unavailable.','参照元の投稿は表示できません。')}</div>`;
  const t=threadById(q.thread),excerpt=localized(post,'quoteExcerpt')||localized(q,'text');
  const short=excerpt.length>190?excerpt.slice(0,190)+'…':excerpt;
  return `<details class="reference-card" data-reference="${esc(q.id)}" data-origin="${esc(post.id||'')}" style="--thread-color:${safeTone(t)}"><summary aria-label="${esc(L('Expand full conversation with ','会話全体を開く：')+q.name)}"><span class="reference-kicker">${reply?L('IN REPLY TO','返信先の引用'):L('QUOTED FROM','引用元')}<span data-user-content>${esc(localized(t,'name'))}</span><span class="reference-chevron" aria-hidden="true">⌄</span></span><span class="reference-author">${avatar(q)}<strong data-user-content>${esc(q.name)}</strong><span class="muted">@${esc(q.handle)}</span></span><span class="reference-snippet" data-user-content>${esc(short)}</span><span class="reference-hint">${L('Expand full conversation','会話全体を展開')}</span></summary><div class="reference-expanded"></div></details>`;
}
function localQuoteId(p){return p.quoteEpisode&&p.quoteEpisode!==activeEpisode?'':p.quoteId;}
function conversationScope(pid,originId='',joinQuotes=false){
  const byId=new Map(state.posts.map(p=>[p.id,p])),children=new Map();
  let root=byId.get(originId)||byId.get(pid);
  if(!root)return {posts:[],branchIds:new Set(),rootId:''};
  // Walk back through this reply chain, stopping before the shared broadcast post.
  const walked=new Set();
  while(!walked.has(root.id)){
    walked.add(root.id);const parent=byId.get(root.parentId||(joinQuotes?localQuoteId(root):''));
    if(!parent||walked.has(parent.id))break;
    if(joinQuotes){
      const source=byId.get(localQuoteId(parent));
      // Shared source posts provide context without importing their other branches.
      if(!parent.parentId&&(!source||!source.parentId&&!localQuoteId(source)))break;
    }else if(!byId.has(parent.parentId))break;
    root=parent;
  }
  for(const p of state.posts)for(const target of new Set([p.parentId,localQuoteId(p)]))if(byId.has(target)){
    if(!children.has(target))children.set(target,[]);children.get(target).push(p.id);
  }
  const branchIds=new Set(),pending=[root.id];
  while(pending.length){const id=pending.pop();if(branchIds.has(id))continue;branchIds.add(id);for(const child of children.get(id)||[])pending.push(child);}
  // Keep source posts as context, without importing their other conversations.
  const included=new Set(),context=[...branchIds];
  while(context.length){const id=context.pop();if(included.has(id))continue;included.add(id);const p=byId.get(id);for(const target of [p.parentId,localQuoteId(p)])if(byId.has(target)&&!included.has(target))context.push(target);}
  return {posts:[...state.posts].reverse().filter(p=>included.has(p.id)),branchIds,rootId:root.id};
}
function conversationPosts(pid,originId=''){return conversationScope(pid,originId).posts;}
function conversationLayout(posts,order='branch'){
  const byId=new Map(posts.map(p=>[p.id,p])),children=new Map(),roots=[];
  for(const p of posts){const parent=[p.parentId,localQuoteId(p)].find(id=>byId.has(id)&&id!==p.id);if(parent){if(!children.has(parent))children.set(parent,[]);children.get(parent).push(p);}else roots.push(p);}
  const rows=[],seen=new Set();
  function visit(p,depth){if(seen.has(p.id))return;seen.add(p.id);rows.push({post:p,depth});for(const child of children.get(p.id)||[])visit(child,depth+1);}
  for(const p of roots)visit(p,0);
  for(const p of posts)if(!seen.has(p.id))visit(p,0);
  return order==='oldest'?posts.map(post=>({post,depth:0})):rows;
}
function inlineSnippet(p,limit=95){const text=localized(p,'text').replace(/\s+/g,' ').trim();return text.length>limit?text.slice(0,limit)+'…':text;}
function inlineJump(p,label,kind='',excerpt=''){
  return `<button class="inline-jump ${kind}" data-action="inline-reference" data-id="${esc(p.id)}"><span class="inline-jump-label">${label}<span aria-hidden="true">↗</span></span><strong data-user-content>${esc(p.name)}</strong><span class="inline-jump-handle">@${esc(p.handle)}</span><span class="inline-jump-excerpt" data-user-content>${esc(excerpt||inlineSnippet(p))}</span></button>`;
}
function inlineIncoming(p,posts){
  const groups=[{items:posts.filter(q=>q.parentId===p.id),title:L('Replies in this conversation','この会話内の返信'),label:L('Reply from','返信：')},{items:posts.filter(q=>localQuoteId(q)===p.id&&q.parentId!==p.id),title:L('Quotes in this conversation','この会話内の引用'),label:L('Quote by','引用：')}];
  return groups.filter(g=>g.items.length).map(g=>`<div class="inline-incoming"><div class="inline-incoming-label">↓ ${g.title} · ${g.items.length}</div><div class="inline-incoming-links">${g.items.slice(0,3).map(q=>inlineJump(q,g.label,'incoming-link',inlineSnippet(q,60))).join('')}</div>${g.items.length>3?`<details class="inline-more"><summary>${L('Show all '+g.items.length,'全'+g.items.length+'件を表示')}</summary><div class="inline-incoming-links">${g.items.slice(3).map(q=>inlineJump(q,g.label,'incoming-link',inlineSnippet(q,60))).join('')}</div></details>`:''}</div>`).join('');
}
function inlineConversationHTML(pid,originId='',order='branch'){
  const scope=conversationScope(pid,originId),posts=scope.posts,byId=new Map(posts.map(p=>[p.id,p])),source=byId.get(pid),origin=byId.get(originId);
  const sourceLabel=origin?.parentId===pid?L('Reply target','返信先の投稿'):L('Quoted source','引用元の投稿');
  const originLabel=L('Post you expanded','展開した投稿');
  return `<div class="inline-conversation-heading"><strong>${L('This conversation','この会話')} <span>· ${posts.length}${L(' posts','件')}</span></strong><label>${L('Order','表示順')}<select data-conversation-order aria-label="${L('Conversation order','会話の並び順')}"><option value="branch" ${order==='branch'?'selected':''}>${L('Group replies','返信のつながり順')}</option><option value="oldest" ${order==='oldest'?'selected':''}>${L('Oldest first','古い順')}</option></select></label></div><div class="inline-orientation">${source?inlineJump(source,sourceLabel,'source-link'):''}${origin&&origin.id!==pid?`<span class="inline-pair-arrow" aria-hidden="true">←</span>${inlineJump(origin,originLabel,'origin-link')}`:''}</div><p class="inline-conversation-help">${L('This exchange and the conversations branching from it. Select a quoted passage or reply to jump to that post.','この応酬と、そこから派生した会話を表示。引用文や返信を押すと、その発言へ移動。')}</p><div class="inline-conversation" data-order="${order}">${conversationLayout(posts,order).map(({post:p,depth})=>{
    const refs=[{id:p.parentId,label:L('Reply to','返信先')},{id:localQuoteId(p)!==p.parentId?localQuoteId(p):'',label:L('Quoted source','引用元')}].filter(r=>r.id&&byId.has(r.id));
    return `<article class="inline-post ${p.id===pid?'inline-source':''} ${p.id===originId?'inline-origin':''} ${scope.branchIds.has(p.id)?'':'inline-context'}" data-inline-id="${esc(p.id)}" data-parent="${esc(p.parentId||'')}" data-quote="${esc(p.quoteId||'')}" style="--reply-depth:${Math.min(depth,2)}" tabindex="-1">${p.id===pid||p.id===originId?`<div class="inline-position">${p.id===pid?sourceLabel:originLabel}</div>`:!scope.branchIds.has(p.id)?`<div class="inline-context-label">${L('Earlier context','前の投稿・文脈')}</div>`:''}<div class="inline-post-author">${avatar(p)}<strong data-user-content>${esc(p.name)}</strong>${p.verified?`<span class="verified" aria-label="${esc(tr('Verified'))}">✓</span>`:''}<span class="muted">${timestampHTML(p)}</span></div><div class="inline-post-thread">${threadTag(threadById(p.thread),false)}</div>${refs.map(r=>inlineJump(byId.get(r.id),r.label,'inline-source-preview',localized(p,'quoteExcerpt'))).join('')}${p.quoteEpisode&&p.quoteEpisode!==activeEpisode?foreignReferenceHTML(p.quoteId,p):''}${statusQuoteHTML(p)}<div class="quote-text" data-user-content>${esc(localized(p,'text'))}</div>${mediaHTML(p)}${localized(p,'notice')?`<p class="inline-notice">${esc(localized(p,'notice'))}</p>`:''}${inlineIncoming(p,posts)}<div class="inline-post-footer"><button data-action="reply" data-id="${esc(p.id)}">${L('Reply','返信')}</button><button data-action="quote-post" data-id="${esc(p.id)}">${L('Quote','引用')}</button></div></article>`;
  }).join('')}</div><button class="text-link" data-action="collapse-reference">${L('Collapse conversation','会話を折りたたむ')} ↑</button>`;
}
document.addEventListener('toggle',e=>{
  const details=e.target;
  if(!details.matches?.('details.reference-card')||!details.open||details.dataset.loaded)return;
  if(details.dataset.episode&&details.dataset.episode!==activeEpisode){expandForeignReference(details);return;}
  const pane=details.querySelector('.reference-expanded');
  pane.innerHTML=inlineConversationHTML(details.dataset.reference,details.dataset.origin);details.dataset.loaded='true';
},true);
document.addEventListener('change',e=>{
  if(!e.target.matches?.('[data-conversation-order]'))return;
  const card=e.target.closest('.reference-card'),pane=card.querySelector('.reference-expanded');
  pane.innerHTML=inlineConversationHTML(card.dataset.reference,card.dataset.origin,e.target.value);
});
document.addEventListener('click',e=>{
  const collapse=e.target.closest('[data-action="collapse-reference"]');
  if(collapse){const card=collapse.closest('.reference-card');card.open=false;card.querySelector('summary').focus({preventScroll:true});card.scrollIntoView({block:'center',behavior:'instant'});return;}
  const button=e.target.closest('[data-action="inline-reference"]');if(!button)return;
  const pane=button.closest('.reference-expanded');
  if(!pane)return;
  const target=[...pane.querySelectorAll('[data-inline-id]')].find(el=>el.dataset.inlineId===button.dataset.id);
  if(target){pane.querySelectorAll('.inline-focus').forEach(el=>el.classList.remove('inline-focus'));target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});target.classList.add('inline-focus');}
});
function quoteHTML(pid){return referenceHTML(pid);}
function bodyText(p,full=false){
  const text=localized(p,'text'),long=text.length>650;
  let shown=long&&!p.expanded&&!full?text.split('\n\n')[0]:text;
  if(long&&!p.expanded&&!full&&shown.length>650)shown=shown.slice(0,600)+'…';
  let formatted=esc(shown).replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu,'$1<span class="tag">$2</span>');
  if(p.leadBold){const parts=formatted.split('\n\n');formatted='<strong>'+parts.shift()+'</strong>'+(parts.length?'\n\n'+parts.join('\n\n'):'');}
  return `${statusQuoteHTML(p)}<div class="post-text">${formatted}</div>${long&&!full?`<button class="expand-post" data-action="expand" data-id="${esc(p.id)}" aria-expanded="${!!p.expanded}">${p.expanded?L('Collapse text','本文を折りたたむ'):L('Read full post','全文を読む')}</button>`:''}`;
}
function showAccountProfile(handle){
  const post=state.posts.find(p=>p.handle===handle),saved=(state.accounts||[]).find(a=>a.handle===handle);
  const account=handle===state.profile.handle?state.profile:{...saved,...post,bio:saved?.bio||'',bioJa:saved?.bioJa||''};
  if(!account.name)return;
  const threads=state.threads.filter(t=>t.owner===handle);
  openDialog(L('Account profile','アカウントプロフィール'),`<section class="public-profile">${avatar(account)}<h2 data-user-content>${esc(account.name)} ${account.verified?`<span class="verified" aria-label="${esc(tr('Verified'))}">✓</span>`:''}</h2><div class="muted">@${esc(handle)}</div>${handle===state.profile.handle?accountStatusHTML():''}${localized(account,'bio')?`<p data-user-content>${esc(localized(account,'bio'))}</p>`:''}${threads.length?`<h3>${L('Threads by this account','このアカウントのスレッド')}</h3><div class="profile-threads">${threads.map(trendHTML).join('')}</div>`:''}</section>`);
}
function statusQuoteHTML(p){
  const q=p.statusQuote;
  return q&&localized(q,'text')?`<blockquote class="quoted-account-status"><strong data-user-content>${esc(localized(q,'text'))}</strong><span>@${esc(q.handle)}</span></blockquote>`:'';
}
function postHTML(p,reader=null){
  const t=threadById(p.thread),detail=['conversation','quotes'].includes(view)&&focusedPost===p.id;
  return `<article class="post${reader?.numbers?' conversation-post'+(reader.selected===p.id?' conversation-selected':''):''}" ${reader?.numbers?'tabindex="-1"':''} data-post="${esc(p.id)}" style="--thread-color:${safeTone(t)}">${reader?.numbers?`<div class="conversation-position"><strong>#${reader.numbers.get(p.id)}</strong>${reader.selected===p.id?`<span>${L("Selected post","選んだ投稿")}</span>`:""}</div>`:""}<div class="post-thread">${threadTag(t)}<span class="post-time">${timestampHTML(p)}</span></div><div class="post-row">${avatar(p)}<div class="post-content"><div class="post-meta"><button class="author-profile" data-action="account-profile" data-id="${esc(p.handle)}" aria-label="${esc(L("View profile: ","プロフィール：")+p.name)}"><span data-user-content>${esc(p.name)}</span></button>${p.verified?`<span class="verified" aria-label="${esc(tr('Verified'))}">✓</span>`:''}<span class="handle">@${esc(p.handle)}</span><button class="more studio-only" aria-label="${esc(tr('Edit post by '+p.name))}" data-action="edit-post" data-id="${esc(p.id)}">···</button></div>${reader?.numbers?readerReferenceLinks(p,reader.numbers):`${p.parentId?referenceHTML(p.parentId,p,true):''}${p.quoteId&&(p.quoteEpisode&&p.quoteEpisode!==activeEpisode||p.quoteId!==p.parentId)?referenceHTML(p.quoteId,p):''}`}${bodyText(p,!!reader?.numbers)}${mediaHTML(p)}<div class="post-actions"><button data-action="reply" data-id="${esc(p.id)}" aria-label="${esc(L('Read conversation with ','会話を読む：')+p.name)}" title="${esc(L('Read this conversation','一連の会話を読む'))}">${icon('reply')}<span>${L('Reply','返信')}</span><span>${count(p.replies)||'0'}</span></button><button data-action="quote-post" data-id="${esc(p.id)}" aria-label="${esc(L('Quote post by ','引用する：')+p.name)}"><span class="quote-glyph">❞</span><span>${L('Quote','引用')}</span></button><button class="${p.reposted?'selected':''}" data-action="repost" data-id="${esc(p.id)}" aria-pressed="${!!p.reposted}" aria-label="${esc(tr('Repost by '+p.name))}">${icon('repost')}<span>${count(p.reposts)||'0'}</span></button><button class="${p.liked?'selected':''}" data-action="like" data-id="${esc(p.id)}" aria-pressed="${!!p.liked}" aria-label="${esc(tr('Like post by '+p.name))}">${icon('heart')}<span>${count(p.likes)||'0'}</span></button><button class="save-post ${p.bookmarked?'selected':''}" data-action="bookmark" data-id="${esc(p.id)}" aria-pressed="${!!p.bookmarked}" aria-label="${esc(tr('Bookmark post by '+p.name))}">${icon('bookmark')}</button></div>${detail?`<div class="post-detail-stats"><span><b>${shownCount(p.replies)}</b> ${L('Replies','返信')}</span><span><b>${shownCount(p.reposts)}</b> ${L('Reposts','リポスト')}</span><span><b>${shownCount(p.likes)}</b> ${L('Likes','いいね')}</span><button data-action="quotes-view" data-id="${esc(p.id)}"><b>${shownCount(p.quotes)}</b> ${L('Quotes','引用')}</button><span><b>${shownCount(p.views)}</b> ${L('Views','閲覧')}</span></div>`:''}</div></div>${localized(p,'notice')?`<aside class="account-notice" role="status">${icon('user')}<div><strong>${esc(localized(p,'notice'))}</strong><span>@${esc(p.handle)}</span></div></aside>`:''}</article>`;
}
function threadCard(t){
  const posts=threadPosts(t),latest=posts[0],pic=posts.find(p=>validImage(p.image));
  return `<article class="catalog-card" style="--thread-color:${safeTone(t)}"><div class="catalog-top">${threadTag(t)}<button class="follow ${t.following?'on':''}" data-action="follow" data-id="${esc(t.id)}" aria-label="${esc(tr((t.following?'Unfollow ':'Follow ')+localized(t,'name')))}">${t.following?L('Following','フォロー中'):L('Follow','フォロー')}</button></div>${pic?`<button class="catalog-image" data-action="thread" data-id="${esc(t.id)}"><img loading="lazy" decoding="async" src="${validImage(pic.image)}" alt="${esc(localized(pic,'imageAlt'))}"></button>`:''}<p data-user-content>${esc(localized(t,'description'))}</p>${latest?`<button class="catalog-latest" data-action="conversation" data-id="${esc(latest.id)}"><strong data-user-content>${esc(latest.name)}</strong><span data-user-content>${esc(localized(latest,'text').slice(0,135))}</span></button>`:''}<div class="catalog-bottom"><span>${kindLabel(t)}${t.owner?' · @'+esc(t.owner):''}</span><button data-action="thread" data-id="${esc(t.id)}">${L('Open thread','スレッドを開く')} ↗</button></div></article>`;
}
function trendHTML(t){return `<div class="related-thread" style="--thread-color:${safeTone(t)}">${threadTag(t)}<p data-user-content>${esc(localized(t,'description'))}</p></div>`;}
function threadBanner(t){return `<section class="thread-banner" style="--thread-color:${safeTone(t)}"><div class="banner-eyebrow">${kindLabel(t)}${t.owner?' / @'+esc(t.owner):''}</div><h2 data-user-content>${esc(localized(t,'name'))}</h2><p data-user-content>${esc(localized(t,'description'))}</p><div class="banner-buttons">${t.owner?`<button class="secondary" data-action="account-profile" data-id="${esc(t.owner)}">${L("Account profile","アカウントプロフィール")}</button>`:""}<button class="follow ${t.following?'on':''}" data-action="follow" data-id="${esc(t.id)}">${t.following?L('Following','フォロー中'):L('Follow thread','フォローする')}</button><button class="secondary" data-action="new-post">${L('Write in this thread','このスレッドに書く')}</button><button class="text-link studio-only" data-action="edit-thread" data-id="${esc(t.id)}">${L('Edit','編集')}</button></div></section>`;}
function sidebarContext(t){
  $('#threadInfo').innerHTML=t?`<div class="side-heading">${L('ABOUT THIS THREAD','このスレッドについて')}</div>${trendHTML(t)}<div class="side-meta">${kindLabel(t)}${t.owner?'<br>@'+esc(t.owner):''}${t.members?'<br>'+esc(t.members)+' '+L('followers','フォロワー'):''}</div>`:`<div class="side-heading">${view==='all'?L('ALL THREADS','すべてのスレッド'):L('YOUR SUBSCRIPTIONS','フォロー中のスレッド')}</div><p class="side-intro">${L('Every voice, in order.','すべての発言を、時系列で。')}</p><p class="side-caption">${view==='all'?L('Posts and replies from every thread, including threads you do not follow.','未フォローのスレッドも含め、すべての投稿と返信を表示します。'):L('Posts and replies from the threads you follow meet here.','フォローしたスレッドの投稿と返信が、ここに集まります。')}</p>`;
  $('#discover').innerHTML=state.threads.filter(x=>x.id!==t?.id).map(trendHTML).join('');
  const anchors=['nibelung-midgard-luna-report','enmi-luna-assessment','hotbranch-enmi-cutout'];
  $('#referenceTrail').innerHTML=`<div class="side-heading">${L('FOLLOW THE STORY','話題をたどる')}</div><div class="story-trail">${anchors.map((pid,n)=>{const p=state.posts.find(x=>x.id===pid);if(!p)return '';return `<button data-action="conversation" data-id="${esc(pid)}"><span class="story-dot" style="background:${safeTone(threadById(p.thread))}"></span><span><small>${[L('THE REPORT','報道'),L('THE COMMENTARY','時評'),L('THE HEADLINE','切り抜き')][n]}</small><strong data-user-content>${esc(p.name)}</strong></span>${icon('arrow')}</button>`;}).join('')}</div>`;
  const media=state.posts.filter(p=>(!t||p.thread===t.id)&&validImage(p.image));
  const distinct=media.filter((p,i)=>media.findIndex(q=>q.image===p.image)===i);
  $('#threadAttachments').innerHTML=distinct.length?`<div class="side-heading">${L('ATTACHMENTS','添付画像')}</div><div class="attachment-grid">${distinct.slice(0,6).map(p=>`<button data-action="media" data-id="${esc(p.id)}" aria-label="${esc(L('Open image from ','画像を開く：')+p.name)}"><img loading="lazy" decoding="async" src="${validImage(p.image)}" alt="${esc(localized(p,'imageAlt'))}"></button>`).join('')}</div>`:'';
}
function accountStatusHTML(){
  const notice=localized(state.profile,'notice');
  return notice?`<aside class="account-status-notice" role="status">${icon('user')}<div><strong data-user-content>${esc(notice)}</strong><span>@${esc(state.profile.handle)}</span></div></aside>`:'';
}
function renderBase(){
  document.body.classList.toggle('dark',state.theme==='dark');document.body.classList.toggle('feed-only',state.feedOnly);
  const navigation=[['home','home',L('Timeline','タイムライン')],['threads','threads',L('Find threads','スレッドを探す')],['archive','bookmark',L('Bookmarks','ブックマーク')],['profile','user',L('My profile','プロフィール')]];
  const navHTML=navigation.map(([v,i,label])=>`<button class="nav ${view===v||(v==='home'&&view==='all')||(v==='archive'&&view==='bookmarks')?'active':''}" data-action="${v}" aria-label="${esc(label)}">${icon(i)}<span>${label}</span></button>`).join('');
  $('#nav').innerHTML=navHTML;$('#mobileNav').innerHTML=navHTML;
  $('#leftThreads').innerHTML=state.threads.filter(t=>t.following).map(t=>`<button class="subscription ${view==='thread'&&selectedThread===t.id?'current':''}" data-action="thread" data-id="${esc(t.id)}" style="--thread-color:${safeTone(t)}"><span class="thread-dot"></span><span><strong data-user-content>${esc(localized(t,'name'))}</strong><small>${kindLabel(t)}</small></span></button>`).join('')||`<p class="side-caption">${L('Follow a thread to build your timeline.','スレッドをフォローしてTLを作ろう。')}</p>`;
  $('#account').innerHTML=avatar(state.profile)+`<div><strong data-user-content>${esc(state.profile.name)}</strong><span>@${esc(state.profile.handle)}</span></div>`;
  $('#composeAvatar').innerHTML=avatar(state.profile);
  const previous=$('#quickThread').value;
  $('#quickThread').innerHTML=state.threads.map(t=>`<option value="${esc(t.id)}">${esc(localized(t,'name'))}</option>`).join('');
  $('#quickThread').value=view==='thread'&&threadById(selectedThread)?selectedThread:threadById(previous)?previous:state.threads.find(t=>t.owner===state.profile.handle)?.id||state.threads[0].id;
  const t=view==='thread'?threadById(selectedThread):['conversation','quotes'].includes(view)?threadById(state.posts.find(p=>p.id===focusedPost)?.thread):null;
  $('#pageTitle').textContent=({home:L('Timeline','タイムライン'),all:L('All threads','すべてのスレッド'),threads:L('Find your threads','スレッドを探す'),bookmarks:L('Saved posts','保存した投稿'),profile:L('My profile','プロフィール'),thread:localized(t,'name'),conversation:L('Conversation','会話'),quotes:L('Quoted elsewhere','他のスレッドでの引用')})[view]||L('Timeline','タイムライン');
  $('#pageSubtitle').textContent=view==='home'?L('Your threads. One timeline.','フォローした話題が、一つの流れに。'):view==='thread'?kindLabel(t):L('A conversation for every corner of Yggdrasil.','ユグドラシルの、あらゆる場所に会話を。');
  $('#tabs').hidden=!['home','all'].includes(view);
  $('#tabs').innerHTML=`<button class="${view==='all'?'active':''}" data-action="all" aria-pressed="${view==='all'}">${L('Include unfollowed','未フォローも含む')}</button><button class="${view==='home'?'active':''}" data-action="home" aria-pressed="${view==='home'}">${L('Followed only','フォロー中だけ')}</button>`;
  $('#accountStatus').hidden=view==='profile';
  $('#accountStatus').innerHTML=view==='profile'?'':accountStatusHTML();
  $('#scopeNote').hidden=!['home','all'].includes(view);
  $('#scopeNote').textContent=state.threads.every(t=>t.following)?L('You follow every thread here, so both feeds currently show the same posts.','現在はすべてのスレッドをフォローしているため、どちらも同じ投稿を表示しています。'):view==='home'?L('Only posts and replies from threads you follow.','フォローしているスレッドの投稿と返信だけを表示します。'):L('Posts and replies from every thread, including unfollowed threads.','未フォローのスレッドも含め、すべての投稿と返信を表示します。');
  $('#composer').hidden=['threads','bookmarks','conversation','quotes'].includes(view);
  $('#viewBanner').innerHTML=view==='thread'&&t?threadBanner(t):view==='profile'?`<section class="profile-banner">${avatar(state.profile)}<h2 data-user-content>${esc(state.profile.name)}</h2><div class="muted">@${esc(state.profile.handle)}</div>${accountStatusHTML()}<p data-user-content>${esc(localized(state.profile,'bio'))}</p><button class="text-link studio-only" data-action="edit-profile">${L('Edit profile','プロフィールを編集')}</button><div class="profile-threads"><h3>${L('Personal threads','運用しているスレッド')}</h3>${state.threads.filter(t=>t.owner===state.profile.handle).map(trendHTML).join('')||`<button data-action="new-thread">${L('Create a thread','スレッドを作成')}</button>`}</div></section>`:'';
  let posts=state.posts.filter(p=>view==='home'?threadById(p.thread)?.following:view==='thread'?p.thread===selectedThread:view==='bookmarks'?p.bookmarked:view==='profile'?p.handle===state.profile.handle:true);
  if(query.startsWith('from:'))posts=posts.filter(p=>p.handle.toLowerCase()===query.slice(5));else if(query)posts=posts.filter(p=>[p.name,p.handle,p.text,p.textJa,threadById(p.thread)?.name,threadById(p.thread)?.nameJa].join(' ').toLowerCase().includes(query));
  const visible=orderPosts(posts);
  $('#context').innerHTML=`<span>${view==='home'?state.threads.filter(t=>t.following).length+' '+L('threads followed','スレッドをフォロー中'):L('Posts','投稿')} <span class="context-divider">/</span> ${visible.length} ${L('posts shown','件を表示')}</span>${view!=='threads'?`<label class="sort-label">${L('Order','表示順')}<select id="sortOrder" aria-label="${L('Post order','投稿の並び順')}"><option value="newest" ${state.sortOrder!=='oldest'?'selected':''}>${L('Newest first','新しい順')}</option><option value="oldest" ${state.sortOrder==='oldest'?'selected':''}>${L('Oldest first','古い順')}</option></select></label>`:''}`;
  if($('#sortOrder'))$('#sortOrder').onchange=e=>{state.sortOrder=e.target.value;commit();};
  if(view==='threads'){
    const threads=state.threads.filter(t=>[t.name,t.nameJa,t.description,t.descriptionJa].join(' ').toLowerCase().includes(query));
    setFeedMarkup(`<div class="catalog-intro"><p>${L('Follow a thread. Join its conversation.','スレッドをフォローして、その会話に加わろう。')}</p><button class="secondary" data-action="new-thread">${L('Create a thread','スレッドを作成')}</button></div><div class="thread-catalog">${threads.map(threadCard).join('')}</div>`);
  }else if(!['conversation','quotes','archive'].includes(view)){if(visible.length)setFeedPosts(visible);else setFeedMarkup(`<div class="empty"><h2>${L('No posts to show.','表示する投稿がありません。')}</h2><p>${query?L('Try another search.','検索語を変えてみてください。'):L('Follow a thread or write a post.','スレッドをフォローするか、投稿してください。')}</p><button class="secondary" data-action="threads">${L('Find threads','スレッドを探す')}</button></div>`);}
  if(view!=='archive')sidebarContext(t);
}
function renderContent(){
  renderBase();
  if(!['conversation','quotes'].includes(view))return;
  const parent=state.posts.find(p=>p.id===focusedPost);
  if(!parent){setFeedMarkup(`<div class="empty">${L('This post is unavailable.','この投稿は表示できません。')}</div>`);return;}
  $('#viewBanner').innerHTML=`<div class="conversation-back"><button data-action="home">← ${L('Timeline','タイムライン')}</button><button data-action="thread" data-id="${esc(parent.thread)}">${L('Read the whole thread','スレッド全体を読む')} ↗</button></div>`;
  const descendants=new Set([parent.id]);let grew=true;
  while(grew){grew=false;for(const p of state.posts)if(p.parentId&&descendants.has(p.parentId)&&!descendants.has(p.id)){descendants.add(p.id);grew=true;}}
  const items=state.posts.filter(p=>view==='quotes'?localQuoteId(p)===parent.id:p.id!==parent.id&&descendants.has(p.id));
  $('#context').innerHTML=threadTag(threadById(parent.thread));
  setFeedMarkup(postHTML(parent)+`<div class="conversation-tabs"><button class="${view==='conversation'?'active':''}" data-action="conversation" data-id="${esc(parent.id)}">${L('Replies & conversation','返信と会話')}</button><button class="${view==='quotes'?'active':''}" data-action="quotes-view" data-id="${esc(parent.id)}">${L('Quotes','引用')} · ${shownCount(parent.quotes)}</button></div>`+([...items].reverse().map(postHTML).join('')||`<div class="empty">${L('No posts to show here yet.','ここに表示する投稿はまだありません。')}</div>`));
}
function composePost(sourceId,mode='post'){
  const source=state.posts.find(p=>p.id===sourceId),reply=mode==='reply';
  const destination=source&&reply?source.thread:view==='thread'?selectedThread:state.threads.find(t=>t.owner===state.profile.handle)?.id||state.threads[0].id;
  openDialog(L(reply?'Reply with a quote':source?'Quote into a thread':'Write to a thread',reply?'引用して返信':source?'スレッドへ引用':'スレッドに書き込む'),`<form id="composeForm"><div class="compose-identity">${avatar(state.profile)}<div><strong data-user-content>${esc(state.profile.name)}</strong><small>@${esc(state.profile.handle)}</small></div></div><label class="field full">${L('Destination thread','投稿先のスレッド')}<select name="destination" ${reply?'disabled':''}>${state.threads.map(t=>`<option value="${esc(t.id)}" ${t.id===destination?'selected':''}>${esc(localized(t,'name'))}</option>`).join('')}</select></label>${source?referenceHTML(source.id):''}${source?`<details class="excerpt-editor"><summary>${L('Quote a specific passage','一部分を引用する')}</summary><label class="field">${L('Paste an exact passage, or leave blank to quote the post.','引用する箇所を原文のまま入力。空欄なら投稿全体を引用。')}<textarea name="excerpt" maxlength="10000"></textarea></label></details>`:''}<label class="field full">${L('Your message','投稿本文')}<textarea name="message" required maxlength="10000" rows="6" placeholder="${L('Add to the conversation…','この話題について書く…')}"></textarea></label><div class="dialog-actions"><button class="secondary" type="button" data-action="close">${L('Cancel','キャンセル')}</button><button class="primary" type="submit">${L(reply?'Post reply':'Post',reply?'返信する':'投稿する')}</button></div></form>`);
  $('#composeForm').onsubmit=e=>{e.preventDefault();const form=e.target,f=new FormData(form),text=String(f.get('message')||'').trim(),excerpt=String(f.get('excerpt')||'').trim();if(!text)return;
    if(excerpt&&source&&!localized(source,'text').includes(excerpt)){toast(L('The quoted passage must match the original post.','引用箇所は原文と一致する必要があります。'));return;}
    const tid=reply?source.thread:String(f.get('destination'));if(!threadById(tid))return;
    const p={...state.profile,notice:'',noticeJa:'',id:id(),thread:tid,time:'now',text:state.language==='en'?text:'',textJa:state.language==='ja'?text:'',replies:0,reposts:0,quotes:0,likes:0,views:0,parentId:reply?source.id:'',replyTo:reply?source.handle:'',quoteId:source&&!reply?source.id:'',quoteExcerpt:state.language==='en'?excerpt:'',quoteExcerptJa:state.language==='ja'?excerpt:''};
    remember();state.posts.unshift(p);if(source){const key=reply?'replies':'quotes';source[key]=num(source[key])+1;}threadById(tid).following=true;persist();closeDialog();selectedThread=tid;changeView('thread');toast(L('Post saved.','投稿を保存しました。'));
  };
}
function actions(a,i){
  if(a==='account-profile')return showAccountProfile(i);
  if(a==='thread'&&$('#dialog').open)closeDialog();
  if(a==='new-post')return composePost();
  if(a==='reply')return openConversation(i);
  if(a==='quote-post')return composePost(i,'quote');
  return legacyActions(a,i);
}
$('#search').oninput=e=>{query=e.target.value.toLowerCase().trim();if(['conversation','quotes'].includes(view))view='all';render();};

Object.assign(UI_JA,{'Quoted excerpt (English)':'引用箇所（英語）','Quoted excerpt (Japanese)':'引用箇所（日本語）','Your threads, your world.':'話題をつなぐ、あなたの世界。','Post in':'投稿先','RELATED THREADS':'関連スレッド','FOLLOWING':'フォロー中','Write to a thread':'スレッドに書く'});

function applySceneUpdates(){
// Apply the official-thread classifications to existing saved copies of this scene.
if(state.sceneId==='ratatoskr-artificial-flowers-v9'&&(state.contentVersion||0)<13){
  for(const thread of state.threads)if(['nibelung-report','helheim-daily','midgard-neighborhood'].includes(thread.id))thread.kind='official';
  state.contentVersion=13;
}
// Apply the requested unfollows without removing any posts or other saved preferences.
if(state.sceneId==='ratatoskr-artificial-flowers-v9'&&(state.contentVersion||0)<14){
  for(const thread of state.threads)if(['rooms-and-repairs','awake-and-chatting'].includes(thread.id))thread.following=false;
  state.contentVersion=14;
}
// Apply speaker corrections and new replies without clearing saved preferences or other posts.
if(state.sceneId==='ratatoskr-artificial-flowers-v9'&&(state.contentVersion||0)<15){
  const authors=["zouka-prov01", "zouka-prov03", "zouka-a29", "zouka-a07", "zouka-29", "zouka-72", "zouka-prov05", "zouka-prov07", "zouka-prov09", "zouka-prov10", "zouka-prov12", "zouka-prov14"],texts=["zouka-prov02", "zouka-tb14", "zouka-prov11", "zouka-prov13"],added=["zouka-v10-01", "zouka-v10-02"],handles=["doorframe_24", "save_slot_zero", "moss_on_glass", "third_landing", "latch_17", "paper_comet", "afterimage_txt"];
  const original=new Map(defaults.posts.map(p=>[p.id,p]));
  for(const p of state.posts){
    const q=original.get(p.id);if(!q)continue;
    if(authors.includes(p.id))for(const key of ['name','handle','initials','color','avatar','verified'])p[key]=q[key];
    if(texts.includes(p.id)){p.text=q.text;p.textJa=q.textJa;}
  }
  for(const pid of added)if(!state.posts.some(p=>p.id===pid)){
    const p=structuredClone(original.get(pid));state.posts.push(p);
    const parent=state.posts.find(q=>q.id===p.parentId);if(parent)parent.replies=num(parent.replies)+1;
  }
  const current=new Map(state.posts.map(p=>[p.id,p]));
  for(const p of state.posts)if(p.parentId&&current.has(p.parentId))p.replyTo=current.get(p.parentId).handle;
  for(const a of defaults.accounts.filter(a=>handles.includes(a.handle))){
    state.accounts=state.accounts.filter(x=>x.handle!==a.handle);state.accounts.push(structuredClone(a));
    const key=a.avatar.slice(6);state.assets={...state.assets,[key]:defaults.assets[key]};
  }
  state.posts.sort((a,b)=>b.time.localeCompare(a.time));state.contentVersion=15;
}
// Refresh revised dialogue while retaining saved bookmarks and preferences.
if(state.sceneId==='ratatoskr-artificial-flowers-v9'&&(state.contentVersion||0)<16){
  const revised=["zouka-v10-01", "zouka-v10-02", "zouka-prov11", "zouka-prov12", "zouka-prov13", "zouka-prov14"],original=new Map(defaults.posts.map(p=>[p.id,p]));
  for(const p of state.posts)if(revised.includes(p.id)&&original.has(p.id)){
    const q=original.get(p.id);p.text=q.text;p.textJa=q.textJa;
  }
  state.contentVersion=16;
}
// Remove the withdrawn closing quote from previously saved scenes.
if(state.sceneId==='ratatoskr-artificial-flowers-v9'&&(state.contentVersion||0)<17){
  if(state.posts.some(p=>p.id==='zouka-prov14')){
    state.posts=state.posts.filter(p=>p.id!=='zouka-prov14');
    const parent=state.posts.find(p=>p.id==='zouka-prov13');
    if(parent)parent.quotes=Math.max(0,num(parent.quotes)-1);
  }
  state.contentVersion=17;
}
// Replace stock large PNGs in older browser-saved copies with display-size WebP files.
if(state.sceneId==='ratatoskr-artificial-flowers-v9'&&(state.contentVersion||0)<18){
  for(const key of ['enmi-square','nibelung']){
    const value=state.assets?.[key];
    if(!value||/(?:^|\/)(?:S_Enmi_Parapsych|Nibelung_Report)\.png$/.test(value))
      state.assets={...state.assets,[key]:defaults.assets[key]};
  }
  state.contentVersion=18;
}
}
applySceneUpdates();

if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_ratatoskr_scene',description:'Read the local fictional Ratatoskr scene currently shown in the editor.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>structuredClone(state)})).catch(()=>{})}catch{}}
