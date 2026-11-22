#!/usr/bin/env python3
"""Make installed Gazettes check for and adopt each published release."""
from pathlib import Path
import sys

page = Path(sys.argv[1])
html = page.read_text(encoding='utf-8')
old = """ if('serviceWorker' in navigator){window.addEventListener('load',()=>{
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
 });}"""
new = """ if('serviceWorker' in navigator){
  const hadController=Boolean(navigator.serviceWorker.controller);
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(!hadController||refreshing)return;
   const last=Number(sessionStorage.getItem('gazette-sw-reloaded-at')||0);
   if(Date.now()-last<10000)return;
   refreshing=true;
   sessionStorage.setItem('gazette-sw-reloaded-at',String(Date.now()));
   location.reload();
  });
  window.addEventListener('load',async()=>{
   try{
    const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    let lastCheck=0;
    const check=()=>{if(Date.now()-lastCheck<60000)return;lastCheck=Date.now();registration.update().catch(()=>{})};
    check();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
    window.addEventListener('online',check);
   }catch{}
  });
 }"""
if 'gazette-sw-reloaded-at' not in html:
    if old not in html:
        raise RuntimeError('Bloc d’enregistrement du service worker introuvable')
    html = html.replace(old, new, 1)
    page.write_text(html, encoding='utf-8')
