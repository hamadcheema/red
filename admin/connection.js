(() => {
  const API="/admin-api", $=id=>document.getElementById(id);
  let selectedFiles=[];
  const say=(el,text,bad=false)=>{if(el){el.textContent=text;el.style.color=bad?"#f18b83":""}};
  async function call(path,options={}){const r=await fetch(API+path,{credentials:"include",...options,headers:{"content-type":"application/json",...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed ("+r.status+")");return d}
  async function connect(){const n=document.querySelector(".notice");try{const s=await call("/status");if(n){n.querySelector("strong").textContent=s.githubConnected?"Secure publishing connection ready":"Sign-in protected · GitHub setup pending";n.querySelector("p").textContent=s.githubConnected?"Access verified. Drafts and publishing are connected to the repository.":s.githubMessage+" Drafts can be saved, but publishing requires the GitHub token secret."}const e=document.querySelector(".environment small");if(e)e.textContent=s.githubConnected?"Connected to GitHub":"GitHub setup pending";const p=document.querySelector(".draft-pill");if(p)p.textContent=s.githubConnected?"CONNECTED":"DRAFT"}catch(e){if(n){n.querySelector("strong").textContent="Admin sign-in required";n.querySelector("p").textContent="Sign in using the authorized GitHub account to use the admin tools.";let b=n.querySelector("#github-login");if(!b){b=document.createElement("a");b.id="github-login";b.className="primary-button";b.href=API+"/auth/login";b.textContent="Continue with GitHub";n.append(b)}}}
  const pf=$("page-editor"),ps=$("editor-status");
  if(pf){pf.addEventListener("submit",async()=>{try{await call("/draft",{method:"POST",body:JSON.stringify({key:"page:"+$("edit-page").value,value:{title:$("edit-title").value,description:$("edit-description").value,heading:$("edit-heading").value,intro:$("edit-intro").value}})});say(ps,"Draft saved securely to Cloudflare KV.")}catch(e){say(ps,"Local draft saved; remote save failed: "+e.message,true)}});
    const b=document.createElement("button");b.type="button";b.className="primary-button";b.textContent="Publish to website";pf.querySelector(".editor-actions").append(b);b.addEventListener("click",async()=>{if(!confirm("Publish these changes to the live website? A GitHub commit will be created."))return;b.disabled=true;b.textContent="Publishing…";try{const d=await call("/publish/page",{method:"POST",body:JSON.stringify({slug:$("edit-page").value,title:$("edit-title").value,description:$("edit-description").value,heading:$("edit-heading").value,intro:$("edit-intro").value})});say(ps,"Published in GitHub ("+(d.commit||"commit created").slice(0,7)+"). Wait for Pages to deploy.")}catch(e){say(ps,e.message,true)}finally{b.disabled=false;b.textContent="Publish to website"}})}
  const sf=$("seo-editor"),ss=$("seo-status");
  if(sf){sf.addEventListener("submit",async()=>{const value={title:$("seo-title").value,description:$("seo-description").value,canonical:$("seo-canonical").value,ogTitle:$("seo-og-title").value,ogDescription:$("seo-og-description").value,ogImage:$("seo-og-image").value};try{await call("/draft",{method:"POST",body:JSON.stringify({key:"seo:"+$("seo-page").value,value})});say(ss,"SEO draft saved securely to Cloudflare KV.")}catch(e){say(ss,"Local draft saved; remote save failed: "+e.message,true)}});
    const b=document.createElement("button");b.type="button";b.className="primary-button";b.textContent="Publish SEO";sf.querySelector(".seo-actions").append(b);b.addEventListener("click",async()=>{if(!confirm("Publish these SEO changes to the live website?"))return;b.disabled=true;b.textContent="Publishing…";try{const d=await call("/publish/seo",{method:"POST",body:JSON.stringify({slug:$("seo-page").value,title:$("seo-title").value,description:$("seo-description").value,canonical:$("seo-canonical").value,ogTitle:$("seo-og-title").value,ogDescription:$("seo-og-description").value,ogImage:$("seo-og-image").value})});say(ss,"SEO published in GitHub ("+(d.commit||"commit created").slice(0,7)+").")}catch(e){say(ss,e.message,true)}finally{b.disabled=false;b.textContent="Publish SEO"}})}
  const input=$("media-file-input"),actions=$("media-clear")?.parentElement;
  if(input&&actions){document.addEventListener("change",e=>{if(e.target===input)selectedFiles=[...input.files]},true);const b=document.createElement("button");b.type="button";b.className="primary-button";b.textContent="Upload to website";actions.prepend(b);b.addEventListener("click",async()=>{if(!selectedFiles.length){say($("media-status"),"Choose images first.",true);return}b.disabled=true;b.textContent="Uploading…";try{const urls=[];for(const f of selectedFiles){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});const out=await call("/media/upload",{method:"POST",body:JSON.stringify({name:f.name,type:f.type,base64:data})});urls.push(out.url)}say($("media-status"),"Uploaded: "+urls.join(" · "));selectedFiles=[]}catch(e){say($("media-status"),e.message,true)}finally{b.disabled=false;b.textContent="Upload to website"}})}

  const pageFiles={home:"index.html",about:"about.html",services:"services.html",contact:"contact.html"};
  async function loadRemoteDraft(kind,slug,fields,status){
    try{const d=await call("/draft?key="+encodeURIComponent(kind+":"+slug));if(!d.draft)return;for(const [key,id] of Object.entries(fields))if($(id)&&d.draft[key]!==undefined)$(id).value=d.draft[key];say(status,"Remote draft restored from Cloudflare KV.");}
    catch(e){say(status,"Could not load remote draft: "+e.message,true)}
  }
  if($("edit-page"))$("edit-page").addEventListener("change",()=>loadRemoteDraft("page",$("edit-page").value,{title:"edit-title",description:"edit-description",heading:"edit-heading",intro:"edit-intro"},ps));
  if($("seo-page"))$("seo-page").addEventListener("change",()=>loadRemoteDraft("seo",$("seo-page").value,{title:"seo-title",description:"seo-description",canonical:"seo-canonical",ogTitle:"seo-og-title",ogDescription:"seo-og-description",ogImage:"seo-og-image"},ss));
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
  if($("edit-page"))loadRemoteDraft("page",$("edit-page").value,{title:"edit-title",description:"edit-description",heading:"edit-heading",intro:"edit-intro"},ps);
  if($("seo-page"))loadRemoteDraft("seo",$("seo-page").value,{title:"seo-title",description:"seo-description",canonical:"seo-canonical",ogTitle:"seo-og-title",ogDescription:"seo-og-description",ogImage:"seo-og-image"},ss);
  connect();
})();