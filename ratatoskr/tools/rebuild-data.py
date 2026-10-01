"""Regenerate browser bundles from scene.json and archive-index.json. Python 3.9+."""
from pathlib import Path
import copy
import json
import re

ROOT=Path(__file__).resolve().parents[1]
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def compact(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('</',r'<\/')
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def preview(p,scene):
    fields=['id','name','handle','initials','color','text','textJa']
    return {k:p.get(k,'') for k in fields}|{'avatar':scene['assets'].get(p.get('avatar','').removeprefix('asset:'),p.get('avatar',''))}

manifest=read(ROOT/'shared/archive-index.json')
scenes={}
for record in manifest['records']:
    key=record['key']
    if not re.fullmatch(r'[a-z0-9_-]+',key):raise ValueError('Invalid record key: '+key)
    scene=read(ROOT/'episodes'/key/'scene.json')
    scene['seriesRecord']=key
    scene['initialView']='all'
    if len({p['id'] for p in scene['posts']})!=len(scene['posts']):raise ValueError('Duplicate post IDs: '+key)
    threads={t['id'] for t in scene['threads']}
    for post in scene['posts']:
        if post['thread'] not in threads:raise ValueError('Missing thread: '+post['id'])
    for path in scene.get('assets',{}).values():
        if path.startswith('data:'):continue
        asset=(ROOT/path).resolve()
        if ROOT not in asset.parents or not asset.is_file():raise ValueError('Missing/out-of-folder image: '+path)
    scenes[key]=scene

# Check all local and cross-period links before writing any output.
for key,scene in scenes.items():
    for p in scene['posts']:
        for field,target_key in [('parentId',key),('quoteId',p.get('quoteEpisode') or key)]:
            target=p.get(field)
            if target and (target_key not in scenes or not any(q['id']==target for q in scenes[target_key]['posts'])):
                raise ValueError('Missing reference: '+key+'/'+p['id']+' -> '+target_key+'/'+target)
for record in manifest['records']:
    key=record['key'];scene=scenes[key];posts={p['id']:p for p in scene['posts']}
    record['news']=preview(posts[record['news']['id']],scene)
    record['daily']=[preview(posts[p['id']],scene) for p in record['daily']]
    record['postCount']=len(scene['posts']);record['file']=f'episodes/{key}/scene.js'

for key,scene in scenes.items():
    folder=ROOT/'episodes'/key
    (folder/'scene.js').write_text('(window.RatatoskrEpisodeData||={})['+json.dumps(key)+']='+compact(scene)+';\n',encoding='utf-8')
    write(folder/'assets.json',{'pathBase':'series-root','assets':scene['assets']})
    (folder/'index.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><title>RatatoskЯ</title><p><a id="open" href="../../index.html#record='+key+'">この頃のタイムラインを開く</a></p><script>location.replace(document.getElementById("open").href)</script></html>',encoding='utf-8')
write(ROOT/'shared/archive-index.json',manifest)
(ROOT/'shared/archive-index.js').write_text('window.RatatoskrArchiveIndex='+compact(manifest)+';\n',encoding='utf-8')
index=(ROOT/'index.html').read_text(encoding='utf-8')
initial=copy.deepcopy(scenes[manifest['records'][0]['key']]);initial['initialView']='archive'
index,n=re.subn(r'(<script[^>]*id="scene-data"[^>]*>).*?(</script>)',lambda m:m[1]+compact(initial)+m[2],index,count=1,flags=re.S)
if n!=1:raise ValueError('index.html has no scene-data block')
(ROOT/'index.html').write_text(index,encoding='utf-8')
accounts={}
for record in reversed(manifest['records']):
    key=record['key'];scene=scenes[key]
    for account in scene.get('accounts',[]):
        handle=account['handle'];avatar=account.get('avatar','')
        accounts[handle]={**account,'avatarFile':scene['assets'].get(avatar.removeprefix('asset:'),avatar),'records':[*accounts.get(handle,{}).get('records',[]),key]}
write(ROOT/'shared/accounts.json',list(accounts.values()))
print('Updated:',', '.join(f'{k} ({len(s["posts"])} posts)' for k,s in scenes.items()))
