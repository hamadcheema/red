import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBW8EG4rNIktVAioqYnHqi0xvY_mqQcgAo",
  authDomain: "the-red-sparrow-admin.firebaseapp.com",
  projectId: "the-red-sparrow-admin",
  storageBucket: "the-red-sparrow-admin.firebasestorage.app",
  messagingSenderId: "724317931201",
  appId: "1:724317931201:web:6a395be3e4eb0055a77640",
  measurementId: "G-E33PYSBT5V"
};
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

(() => {
  const API="/admin-api", $=id=>document.getElementById(id);
  let selectedFiles=[];
  let firebaseUser=null;
  const say=(el,text,bad=false)=>{if(el){el.textContent=text;el.style.color=bad?"#f18b83":""}};
  async function call(path,options={}){if(!firebaseUser)throw new Error("Please sign in first.");const token=await firebaseUser.getIdToken();const r=await fetch(API+path,{credentials:"same-origin",...options,headers:{"content-type":"application/json","authorization":"Bearer "+token,...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok){const error=new Error(d.error||"Request failed ("+r.status+")");error.status=r.status;if(r.status===401)showGate("signed-out");throw error}return d}
  let resolveAuthReady;
  const authReady=new Promise(resolve=>{resolveAuthReady=resolve});
  window.trsAdminRequest=(path,options={})=>authReady.then(()=>call(path,options));
  window.dispatchEvent(new Event("trs:admin-api-ready"));
  function showGate(state,message){
    const app=$("admin-app"),gate=$("auth-gate"),login=$("auth-gate-login"),retry=$("auth-retry"),msg=$("auth-message"),status=$("auth-status");
    if(app)app.hidden=true;
    if(gate)gate.hidden=false;
    if(login)login.hidden=state==="checking";
    if(retry)retry.hidden=state!=="error";
    if(msg)msg.textContent=message||(
      state==="checking"?"Checking your secure admin session…":
      state==="signed-out"?"You are signed out. Sign in with the authorized Google account to open the admin workspace.":
      "The admin service could not verify your session. Check your connection and try again."
    );
    if(status)status.textContent=state==="checking"?"Verifying access…":state==="signed-out"?"Authentication required.":"Access check failed.";
    const topLogin=$("github-login"),logout=$("admin-logout");
    if(topLogin)topLogin.hidden=true;
    if(logout)logout.hidden=true;
  }
  async function connect(user=firebaseUser){
    firebaseUser=user;
    if(!user){showGate("signed-out");return}
    const n=document.querySelector(".notice"),login=$("github-login"),logout=$("admin-logout"),pill=$("connection-pill");
    showGate("checking");
    if(pill)pill.textContent="CHECKING";
    try{
      const s=await call("/status");
      if(!s.ok||String(s.admin||"").toLowerCase()!=="thatsmehammad@gmail.com")throw new Error("The server returned an unexpected admin identity.");
      const app=$("admin-app"),gate=$("auth-gate");
      if(app)app.hidden=false;
      if(gate)gate.hidden=true;
      if(login)login.hidden=true;
      if(logout)logout.hidden=false;
      if(n){
        n.querySelector("strong").textContent=s.githubConnected?"Secure publishing connection ready":"GitHub repository connection pending";
        n.querySelector("p").textContent=s.githubConnected?"Access verified. Drafts and publishing are connected to the repository.":s.githubMessage+" Drafts can be saved, but publishing requires the GitHub token secret.";
      }
      const e=document.querySelector(".environment small");
      if(e)e.textContent=s.githubConnected?"Connected to GitHub":"GitHub setup pending";
      if(pill)pill.textContent=s.githubConnected?"CONNECTED":"DRAFT";
      const stat=document.querySelector("#view-overview .stats-grid .stat-card:nth-child(3) .stat-word");
      if(stat)stat.textContent=s.githubConnected?"Ready":"Pending";
      if($("edit-page"))await loadRemoteDraft("page",$("edit-page").value,{title:"edit-title",description:"edit-description",heading:"edit-heading",intro:"edit-intro",image:"edit-image",imageAlt:"edit-image-alt"},ps);
      if($("seo-page"))await loadRemoteDraft("seo",$("seo-page").value,{title:"seo-title",description:"seo-description",canonical:"seo-canonical",ogTitle:"seo-og-title",ogDescription:"seo-og-description",ogImage:"seo-og-image",ogImageAlt:"seo-og-image-alt"},ss);
    }catch(e){
      if(logout)logout.hidden=true;
      if(e.status===401){
        showGate("signed-out");
        if(pill)pill.textContent="SIGNED OUT";
      }else{
        showGate("error");
        if(pill)pill.textContent="CHECK FAILED";
      }
    }
  }
  $("auth-gate-login")?.addEventListener("click",async event=>{
    event.preventDefault();
    const link=$("auth-gate-login");
    if(link){link.textContent="Opening Google sign-in…";link.setAttribute("aria-disabled","true")}
    try{await signInWithPopup(auth,googleProvider)}catch(error){
      showGate("error",error?.message||"Google sign-in could not be completed.");
    }finally{if(link){link.textContent="Continue with Google";link.removeAttribute("aria-disabled")}}
  });
  $("auth-retry")?.addEventListener("click",()=>connect(firebaseUser));
  const pf=$("page-editor"),ps=$("editor-status");
  const pageValue=()=>({title:$("edit-title").value,description:$("edit-description").value,heading:$("edit-heading").value,intro:$("edit-intro").value,image:$("edit-image")?.value||"",imageAlt:$("edit-image-alt")?.value.trim()||""});
  const seoValue=()=>({title:$("seo-title").value,description:$("seo-description").value,canonical:$("seo-canonical").value,ogTitle:$("seo-og-title").value,ogDescription:$("seo-og-description").value,ogImage:$("seo-og-image").value,ogImageAlt:$("seo-og-image-alt")?.value.trim()||""});
  const saveRemoteDraft=async(key,value)=>call("/draft",{method:"POST",body:JSON.stringify({key,value})});
  if(pf){
    pf.addEventListener("submit",async event=>{event.preventDefault();try{await saveRemoteDraft("page:"+$("edit-page").value,pageValue());say(ps,"Draft saved securely to Cloudflare KV.")}catch(e){say(ps,"Local draft saved; remote save failed: "+e.message,true)}});
    const b=document.createElement("button");b.type="button";b.className="primary-button";b.textContent="Publish to preview";pf.querySelector(".editor-actions").append(b);
    b.addEventListener("click",async()=>{if(!confirm("Publish these changes to the preview website? A GitHub commit will be created on cloudflare-preview."))return;b.disabled=true;b.textContent="Publishing…";try{const slug=$("edit-page").value,value=pageValue();await saveRemoteDraft("page:"+slug,value);const d=await call("/publish/page",{method:"POST",body:JSON.stringify({...value,slug,imageUrl:value.image})});say(ps,"Published in GitHub ("+(d.commit||"commit created").slice(0,7)+"). Draft synchronized. Wait for Pages to deploy.")}catch(e){say(ps,"Could not complete publishing: "+e.message,true)}finally{b.disabled=false;b.textContent="Publish to website"}});
  }
  const sf=$("seo-editor"),ss=$("seo-status");
  if(sf){
    sf.addEventListener("submit",async event=>{event.preventDefault();try{await saveRemoteDraft("seo:"+$("seo-page").value,seoValue());say(ss,"SEO draft saved securely to Cloudflare KV.")}catch(e){say(ss,"Local draft saved; remote save failed: "+e.message,true)}});
    const b=document.createElement("button");b.type="button";b.className="primary-button";b.textContent="Publish SEO";sf.querySelector(".seo-actions").append(b);
    b.addEventListener("click",async()=>{if(!confirm("Publish these SEO changes to the preview website?"))return;b.disabled=true;b.textContent="Publishing…";try{const slug=$("seo-page").value,value=seoValue();await saveRemoteDraft("seo:"+slug,value);const d=await call("/publish/seo",{method:"POST",body:JSON.stringify({...value,slug})});say(ss,"SEO published to cloudflare-preview ("+(d.commit||"commit created").slice(0,7)+"). Draft synchronized.")}catch(e){say(ss,"Could not complete SEO publishing: "+e.message,true)}finally{b.disabled=false;b.textContent="Publish SEO"}});
  }
  $("reset-draft")?.addEventListener("click",async()=>{try{await call("/draft?key=page:"+encodeURIComponent($("edit-page").value),{method:"DELETE"});say(ps,"Local and remote page drafts cleared.")}catch(e){say(ps,"Local draft cleared, but remote reset failed: "+e.message,true)}});
  $("seo-reset")?.addEventListener("click",async()=>{try{await call("/draft?key=seo:"+encodeURIComponent($("seo-page").value),{method:"DELETE"});say(ss,"Local and remote SEO drafts cleared.")}catch(e){say(ss,"Local SEO draft cleared, but remote reset failed: "+e.message,true)}});
  const input=$("media-file-input"),actions=$("media-clear")?.parentElement,dropZone=$("media-drop-zone"),queue=$("media-queue");
  const acceptedMediaTypes=new Set(["image/png","image/jpeg","image/webp","image/gif"]);
  const safeFilename=value=>String(value||"").trim().replace(/[^\w.-]+/g,"-").replace(/-+/g,"-").replace(/^[-.]+|[-.]+$/g,"");
  const mediaExtension=type=>({"image/png":".png","image/jpeg":".jpg","image/webp":".webp","image/gif":".gif"}[type]||"");
  const uploadFilename=item=>{const ext=mediaExtension(item.file.type);let name=safeFilename(item.file.name);if(!ext)return name;name=name.replace(/\.(png|jpe?g|jfif|webp|gif)$/i,"");return safeFilename(name)+ext};
  const rememberFiles=files=>{
    let total=selectedFiles.reduce((sum,item)=>sum+item.file.size,0);
    const rejected=[];
    for(const file of files){
      if(!acceptedMediaTypes.has(file.type)){rejected.push(file.name+": unsupported file type");continue}
      if(file.size>5242880){rejected.push(file.name+": larger than 5 MB");continue}
      if(total+file.size>20971520){rejected.push(file.name+": queue would exceed 20 MB");continue}
      const normalizedName=safeFilename(file.name).toLowerCase();if(selectedFiles.some(item=>safeFilename(item.name).toLowerCase()===normalizedName)){rejected.push(file.name+": filename already in this queue");continue}
      selectedFiles.push({file,name:file.name,previewUrl:URL.createObjectURL(file)});total+=file.size;
    }
    renderUploadQueue();
    if(rejected.length)say($("media-status"),selectedFiles.length+" image(s) ready. Skipped: "+rejected.join("; "),true);
    else say($("media-status"),selectedFiles.length+" image(s) ready. Filenames and extensions are added automatically.");
  };
  const formatMediaSize=bytes=>bytes<1048576?Math.max(1,Math.round(bytes/1024))+" KB":(bytes/1048576).toFixed(2)+" MB";
  function renderUploadQueue(){
    if(!queue)return;
    queue.replaceChildren();
    selectedFiles.forEach((item,index)=>{
      const card=document.createElement("article");card.className="queued-file";
      const preview=document.createElement("img");preview.alt="Preview of "+item.name;preview.src=item.previewUrl;
      const meta=document.createElement("div");meta.className="queued-meta";
      const filename=document.createElement("strong");filename.textContent=uploadFilename(item);filename.title=filename.textContent;
      const detail=document.createElement("span");detail.textContent=item.file.type.replace("image/","").toUpperCase()+" · "+formatMediaSize(item.file.size);
      meta.append(filename,detail);const remove=document.createElement("button");remove.type="button";remove.className="remove-queued-file";remove.textContent="Remove";remove.setAttribute("aria-label","Remove "+item.name+" from upload queue");remove.addEventListener("click",()=>{URL.revokeObjectURL(item.previewUrl);selectedFiles.splice(index,1);renderUploadQueue()});card.append(preview,meta,remove);queue.append(card);
    });
    const total=selectedFiles.reduce((sum,item)=>sum+item.file.size,0);
    const count=$("media-file-count"),size=$("media-total-size"),clear=$("media-clear");
    if(count)count.textContent=String(selectedFiles.length);
    if(size)size.textContent=total?formatMediaSize(total):"0 MB";
    if(clear)clear.disabled=selectedFiles.length===0;
  }
  const chooseButton=$("media-choose");
  if(input&&chooseButton)chooseButton.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();input.click()});
  if(input&&dropZone){
    dropZone.addEventListener("click",event=>{if(event.target!==chooseButton&&!chooseButton?.contains(event.target))input.click()});
    dropZone.addEventListener("keydown",event=>{if(event.target===dropZone&&(event.key==="Enter"||event.key===" ")){event.preventDefault();input.click()}});
    ["dragenter","dragover"].forEach(type=>dropZone.addEventListener(type,event=>{event.preventDefault();event.stopPropagation();dropZone.classList.add("drag-over");if(event.dataTransfer)event.dataTransfer.dropEffect="copy"}));
    ["dragleave","dragend"].forEach(type=>dropZone.addEventListener(type,event=>{event.preventDefault();if(!dropZone.contains(event.relatedTarget))dropZone.classList.remove("drag-over")}));
    dropZone.addEventListener("drop",event=>{event.preventDefault();event.stopPropagation();dropZone.classList.remove("drag-over");if(event.dataTransfer?.files?.length)rememberFiles([...event.dataTransfer.files])});
  }
  if(input&&actions){
    document.addEventListener("change",event=>{if(event.target===input){rememberFiles([...input.files]);input.value=""}},true);
    $("media-clear")?.addEventListener("click",()=>{selectedFiles.forEach(item=>URL.revokeObjectURL(item.previewUrl));selectedFiles=[];if(input)input.value="";renderUploadQueue()});
    const button=document.createElement("button");button.type="button";button.className="primary-button";button.textContent="Upload to website";actions.prepend(button);
    button.addEventListener("click",async()=>{
      if(!selectedFiles.length){say($("media-status"),"Choose images first.",true);return}
      const names=selectedFiles.map(item=>uploadFilename(item).toLowerCase());
      if(names.some(name=>name.startsWith("."))){say($("media-status"),"Please enter a name for each image.",true);return}
      if(new Set(names).size!==names.length){say($("media-status"),"Each uploaded image must have a unique filename. Rename one of the files first.",true);return}
      button.disabled=true;button.textContent="Uploading…";
      try{
        const urls=[];
        while(selectedFiles.length){
          const item=selectedFiles[0],file=item.file;
          const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
          const finalName=uploadFilename(item);const out=await call("/media/upload",{method:"POST",body:JSON.stringify({name:finalName,type:file.type,base64:data})});
          urls.push(out.url);const completed=selectedFiles.shift();if(completed)URL.revokeObjectURL(completed.previewUrl);renderUploadQueue();
        }
        say($("media-status"),"Upload complete. "+urls.length+" image(s) added to Uploaded images.");
        window.dispatchEvent(new Event("trs:media-updated"));
      }catch(error){say($("media-status"),error.message+" Remaining files are still queued.",true)}
      finally{button.disabled=false;button.textContent="Upload to website"}
    });
    renderUploadQueue();
  }

  const pageFiles={home:"index.html",about:"about.html",services:"services.html",contact:"contact.html"};
  async function loadRemoteDraft(kind,slug,fields,status){
    try{const d=await call("/draft?key="+encodeURIComponent(kind+":"+slug));if(!d.draft)return;for(const [key,id] of Object.entries(fields))if($(id)&&d.draft[key]!==undefined){let value=d.draft[key];if(key==="heading"){const legacy={home:["Ideas into interactive worlds.","Ideas into\n*interactive worlds.*"],about:["Built around the joy of play.","Built around\nthe joy of play."],services:["Our services.","Our *services.*"],contact:["Let’s start a conversation.","Let’s start\n*a conversation.*"]}[slug];if(legacy&&value===legacy[0])value=legacy[1]}$(id).value=value;$(id).dispatchEvent(new Event("input",{bubbles:true}))}say(status,"Remote draft restored from Cloudflare KV.");}
    catch(e){say(status,"Could not load remote draft: "+e.message,true)}
  }
  if($("edit-page"))$("edit-page").addEventListener("change",()=>loadRemoteDraft("page",$("edit-page").value,{title:"edit-title",description:"edit-description",heading:"edit-heading",intro:"edit-intro",image:"edit-image",imageAlt:"edit-image-alt"},ps));
  if($("seo-page"))$("seo-page").addEventListener("change",()=>loadRemoteDraft("seo",$("seo-page").value,{title:"seo-title",description:"seo-description",canonical:"seo-canonical",ogTitle:"seo-og-title",ogDescription:"seo-og-description",ogImage:"seo-og-image",ogImageAlt:"seo-og-image-alt"},ss));
  const historyButton=$("load-history"),historyList=$("history-list");
  if(historyButton&&historyList)historyButton.addEventListener("click",async()=>{
    const slug=$("edit-page").value,path=pageFiles[slug];historyButton.disabled=true;historyButton.textContent="Loading…";
    try{
      const data=await call("/history?path="+encodeURIComponent(path));historyList.replaceChildren();
      if(!data.history.length){historyList.textContent="No history found.";return}
      for(const item of data.history){
        const row=document.createElement("div");row.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)";
        const detail=document.createElement("div"),title=document.createElement("strong"),meta=document.createElement("small");
        title.textContent=item.message;title.style.cssText="display:block;font-size:11px";meta.textContent=new Date(item.date).toLocaleString()+" · "+item.sha.slice(0,7);meta.style.color="var(--muted)";detail.append(title,meta);
        const restore=document.createElement("button");restore.type="button";restore.className="secondary-button";restore.textContent="Restore";
        restore.addEventListener("click",async()=>{if(!confirm("Restore this version of "+path+"? This creates a new GitHub commit."))return;restore.disabled=true;try{const result=await call("/rollback",{method:"POST",body:JSON.stringify({path,sha:item.sha})});say(ps,"Previous version restored. Commit: "+(result.commit||"created").slice(0,7));historyButton.click()}catch(e){say(ps,e.message,true);restore.disabled=false}});
        row.append(detail,restore);historyList.append(row);
      }
    }catch(e){historyList.textContent=e.message}
    finally{historyButton.disabled=false;historyButton.textContent="Load history"}
  });
  const logout=$("admin-logout");
  if(logout)logout.addEventListener("click",async()=>{
    logout.disabled=true;
    logout.textContent="Logging out…";
    try{await signOut(auth);window.location.replace("/admin/")}
    catch(e){const n=document.querySelector(".notice");if(n)n.querySelector("p").textContent="Could not log out: "+e.message;logout.disabled=false;logout.textContent="Log out"}
  });

  onAuthStateChanged(auth,user=>{firebaseUser=user;resolveAuthReady();connect(user)});
})();