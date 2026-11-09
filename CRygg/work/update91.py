from pathlib import Path
p=Path('assets/js/game.js');s=p.read_text(encoding='utf-8')
a=s.index('function preAlertArrival(')
s=s[:a]+'''let eyeAlertSerial=0;
const eyeAlertImage=new Image();eyeAlertImage.src='assets/images/cutins/prealert-9-v91.png';
function clearEyeAlert(){eyeAlertSerial++;$('lcd').querySelectorAll('.eye-alert').forEach(el=>el.remove());}
function showEyeAlert(){
 clearEyeAlert();const serial=eyeAlertSerial;
 const scene=document.createElement('div');scene.className='eye-alert';scene.setAttribute('aria-hidden','true');
 const band=document.createElement('div');band.className='eye-alert-band';
 const face=document.createElement('img');face.src=eyeAlertImage.src;face.alt='';band.append(face);
 const glint=document.createElement('i');glint.className='eye-alert-glint';band.append(glint);scene.append(band);$('lcd').append(scene);
 setTimeout(()=>{if(serial===eyeAlertSerial)clearEyeAlert()},1200);
}
'''+s[a:]
s=s.replace("for(const h of alerts){h.alerting=true;h.alertUntil=performance.now()+800;}", "const eye=alerts.some(h=>h.number===9&&h.reach);const duration=eye?1200:800;\n for(const h of alerts){h.alerting=true;h.alertUntil=performance.now()+duration;if(h.number===9&&h.reach)h.eyeAnnounced=true;}\n if(eye)showEyeAlert();")
s=s.replace('h.alerting=false;update()},800);','h.alerting=false;update()},duration);')
s=s.replace('demoAlertNext=false;h.preAlert=true;', 'demoAlertNext=false;h.preAlert=true;h.number=9;h.reach=true;')
s=s.replace('const demoRecovery=h.demoRecovery;h=createHold(h.forced);', 'const demoRecovery=h.demoRecovery,eyeAnnounced=h.eyeAnnounced;h=createHold(h.forced);if(eyeAnnounced){h.eyeAnnounced=true;h.number=9;h.reach=true;}')
s=s.replace('bonusActive=false;clearJackpot();', 'bonusActive=false;clearEyeAlert();clearJackpot();')
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('v0.90','v0.91').replace('?v=90','?v=91');p.write_text(s,encoding='utf-8')
