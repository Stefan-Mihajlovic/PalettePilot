const PALETTE_PRODUCT = 'palette_pilot_pro';
const INSTALLATION_ID_KEY = 'palettePilotProInstallationId';
const ENTITLEMENT_KEY = 'palettePilotProEntitlement';
const PENDING_COMMAND_KEY = 'palettePilotPendingCommand';
const SHORTCUT_COLOR_KEY = 'palettePilotShortcutColor';
const QUICK_PICK_KEY = 'palettePilotQuickPick';
const PICKER_SCREENSHOT_KEY = 'palettePilotPickerScreenshot';
const PUBLIC_JWK = {kty:'EC',x:'AZpnxE_j3aaAUwUkzkVbagqa-j7HoVmCbsTLglwGvgs',y:'B9jdmU1uF6mSdkPwICYXfov8S5s3WeNQ_Y8susG6d9Y',crv:'P-256'};

function b64Bytes(value){const normalized=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=');return Uint8Array.from(atob(normalized),character=>character.charCodeAt(0))}
function bytesHex(bytes){return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('')}
async function installationClaim(id){return bytesHex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))))}
async function verifyEntitlement(entitlement,installationId){
    if(!entitlement?.token||typeof entitlement.expiresAt!=='number'||typeof installationId!=='string')return false;
    try{
        const [encodedHeader,encodedPayload,signature]=entitlement.token.split('.');
        const header=JSON.parse(new TextDecoder().decode(b64Bytes(encodedHeader)));
        const payload=JSON.parse(new TextDecoder().decode(b64Bytes(encodedPayload)));
        const now=Math.floor(Date.now()/1000);
        if(header.alg!=='ES256'||header.typ!=='PPL-ENT'||payload.product!==PALETTE_PRODUCT||payload.plan!=='lifetime'||payload.exp<=now||entitlement.expiresAt<=now||payload.installation!==await installationClaim(installationId))return false;
        const key=await crypto.subtle.importKey('jwk',PUBLIC_JWK,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
        return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,b64Bytes(signature),new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
    }catch{return false}
}
async function hasProAccess(){const stored=await chrome.storage.local.get([INSTALLATION_ID_KEY,ENTITLEMENT_KEY]);return verifyEntitlement(stored[ENTITLEMENT_KEY],stored[INSTALLATION_ID_KEY])}
async function openWorkspace(windowId){
    try{await chrome.sidePanel.open({windowId});return}
    catch{}
    if(typeof chrome.action.openPopup==='function')await chrome.action.openPopup({windowId});
}

function installScreenshotPicker(screenshotUrl,quickPick){
    document.getElementById('palette-pilot-screen-picker')?.remove();
    const host=document.createElement('div');
    host.id='palette-pilot-screen-picker';
    host.style.cssText='all:initial;position:fixed;inset:0;z-index:2147483647;display:block;cursor:crosshair;user-select:none;-webkit-user-select:none;';
    const shadow=host.attachShadow({mode:'closed'}),style=document.createElement('style');
    style.textContent='*{box-sizing:border-box}.shot{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none}.banner{position:fixed;top:18px;left:50%;transform:translateX(-50%);padding:9px 14px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(23,0,10,.88);box-shadow:0 8px 28px rgba(0,0,0,.3);color:#fff;font:700 12px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.01em;backdrop-filter:blur(10px);pointer-events:none}.loupe{position:fixed;width:108px;height:108px;overflow:hidden;border:3px solid #fff;border-radius:14px;background:#17000a;box-shadow:0 10px 35px rgba(0,0,0,.42);pointer-events:none}.zoom{display:block;width:102px;height:76px;image-rendering:pixelated}.readout{height:27px;display:flex;align-items:center;justify-content:center;gap:7px;background:#17000a;color:#fff;font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.swatch{width:13px;height:13px;border:1px solid rgba(255,255,255,.5);border-radius:3px}.done{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);padding:12px 17px;border-radius:12px;background:#17000a;color:#fff;font:700 13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4);pointer-events:none}';
    const image=document.createElement('img'),banner=document.createElement('div'),loupe=document.createElement('div'),zoom=document.createElement('canvas'),readout=document.createElement('div'),swatch=document.createElement('i'),code=document.createElement('span');
    image.className='shot';image.alt='';image.draggable=false;banner.className='banner';banner.textContent='Click anywhere to pick a color  •  Esc to cancel';loupe.className='loupe';zoom.className='zoom';zoom.width=17;zoom.height=13;readout.className='readout';swatch.className='swatch';code.textContent='#000000';readout.append(swatch,code);loupe.append(zoom,readout);shadow.append(style,image,banner,loupe);document.documentElement.append(host);
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true}),zoomContext=zoom.getContext('2d'),clean=()=>{window.removeEventListener('keydown',onKey,true);host.remove()},hexAt=(clientX,clientY)=>{const x=Math.max(0,Math.min(canvas.width-1,Math.floor(clientX*canvas.width/innerWidth))),y=Math.max(0,Math.min(canvas.height-1,Math.floor(clientY*canvas.height/innerHeight))),pixel=context.getImageData(x,y,1,1).data;return{hex:`#${[pixel[0],pixel[1],pixel[2]].map(value=>value.toString(16).padStart(2,'0')).join('').toUpperCase()}`,x,y}},move=event=>{if(!canvas.width)return;const picked=hexAt(event.clientX,event.clientY),sourceX=Math.max(0,Math.min(canvas.width-17,picked.x-8)),sourceY=Math.max(0,Math.min(canvas.height-13,picked.y-6));zoomContext.imageSmoothingEnabled=false;zoomContext.clearRect(0,0,17,13);zoomContext.drawImage(canvas,sourceX,sourceY,17,13,0,0,17,13);code.textContent=picked.hex;swatch.style.background=picked.hex;const left=event.clientX+126>innerWidth?event.clientX-118:event.clientX+16,top=event.clientY+126>innerHeight?event.clientY-118:event.clientY+16;loupe.style.left=`${Math.max(8,left)}px`;loupe.style.top=`${Math.max(8,top)}px`},pick=event=>{event.preventDefault();event.stopPropagation();const {hex}=hexAt(event.clientX,event.clientY);if(quickPick)navigator.clipboard?.writeText(hex).catch(()=>{});chrome.runtime.sendMessage({type:'palettePilotShortcutColorPicked',color:hex}).catch(()=>{});loupe.remove();banner.remove();const done=document.createElement('div');done.className='done';done.textContent=`Saved ${hex}${quickPick?' · Copied':''}`;shadow.append(done);setTimeout(clean,650)},onKey=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();clean()}};
    image.onload=()=>{canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;context.drawImage(image,0,0);host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerdown',pick,true);window.addEventListener('keydown',onKey,true)};
    image.onerror=clean;
    image.src=screenshotUrl;
}
async function startShortcutPicker(tab){
    if(!tab?.id||typeof tab.windowId!=='number')throw new Error('No active tab is available for the screen picker.');
    const [{[QUICK_PICK_KEY]:quickPick},screenshotUrl]=await Promise.all([chrome.storage.local.get(QUICK_PICK_KEY),chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'})]);
    try{
        await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>document.getElementById('palette-pilot-screen-picker')?.remove()});
        await chrome.scripting.executeScript({target:{tabId:tab.id},func:installScreenshotPicker,args:[screenshotUrl,!!quickPick]});
    }catch{
        await chrome.storage.session.set({[PICKER_SCREENSHOT_KEY]:{screenshotUrl,quickPick:!!quickPick,createdAt:Date.now()}});
        await chrome.windows.create({url:chrome.runtime.getURL('picker.html'),type:'popup',width:1000,height:760,focused:true});
    }
}
async function queueCommandAndOpen(command,windowId){
    await chrome.storage.session.set({[PENDING_COMMAND_KEY]:{command,createdAt:Date.now()}});
    await openWorkspace(windowId);
    chrome.runtime.sendMessage({type:'palettePilotCommandReady'}).catch(()=>{});
}

chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(message?.type!=='palettePilotShortcutColorPicked'||!/^#[0-9A-F]{6}$/i.test(message.color||''))return;
    const color=message.color.toUpperCase();
    chrome.storage.local.set({[SHORTCUT_COLOR_KEY]:{color,createdAt:Date.now()}}).then(()=>chrome.runtime.sendMessage({type:'palettePilotShortcutColorReady',color}).catch(()=>{})).then(()=>sendResponse({saved:true}));
    return true;
});

chrome.commands.onCommand.addListener(async(command,tab)=>{
    const allowed=await hasProAccess();
    let windowId=tab?.windowId;
    if(typeof windowId!=='number')windowId=(await chrome.windows.getLastFocused()).id;
    if(!allowed){await queueCommandAndOpen('pro-required',windowId);return}
    if(command==='pick-color'){
        try{await startShortcutPicker(tab)}
        catch(error){await chrome.storage.session.set({[PENDING_COMMAND_KEY]:{command:'picker-unavailable',message:error.message,createdAt:Date.now()}});await openWorkspace(windowId);chrome.runtime.sendMessage({type:'palettePilotCommandReady'}).catch(()=>{})}
        return;
    }
    await queueCommandAndOpen(command,windowId);
});
