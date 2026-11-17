(() => {
  const API="/admin-api";
  const $=id=>document.getElementById(id);
  const request=async(path,options={})=>{const r=await fetch(API+path,{credentials:"include",...options,headers:{"content-type":"application/json",accept:"application/json",...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed ("+r.status+")");return d};
  const showError=(el,error)=>{if(el)el.textContent="Could not load data: "+error.message};
  async function loadMedia(){
    const grid=$("media-library-grid");if(!grid)return;
    grid.replaceChildren();const loading=document.createElement("p");loading.className="editor-footnote";loading.textContent="Loading uploaded images…";grid.append(loading);
    try{
      const data=await request("/media/list");
      const picker=$("edit-image");
      if(picker){const selected=picker.value;picker.replaceChildren(new Option("No image selected",""));for(const item of data.items){picker.add(new Option(item.name,item.siteUrl||item.url))}picker.value=[...picker.options].some(o=>o.value===selected)?selected:"";picker.dispatchEvent(new Event("change",{bubbles:true}));}
      grid.replaceChildren();
      if(!data.items.length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent="No uploaded images yet. Upload an image above to add it here.";grid.append(empty);return}
      for(const item of data.items){
        const card=document.createElement("article");card.className="asset-card";
        const art=document.createElement("div");art.className="asset-art";
        const img=document.createElement("img");img.src=item.url;img.alt=item.name;img.loading="lazy";art.append(img);
        const info=document.createElement("div");info.className="asset-info";
        const name=document.createElement("strong");name.textContent=item.name;
        const meta=document.createElement("small");meta.textContent=(item.size/1024).toFixed(1)+" KB · assets/uploads/";
        const link=document.createElement("a");link.href=item.url;link.target="_blank";link.rel="noopener";link.textContent="Open image ↗";
        info.append(name,meta,link);card.append(art,info);grid.append(card);
      }
    }catch(e){showError(grid,e)}
  }
  async function loadAudit(){
    const list=$("audit-list");if(!list)return;list.replaceChildren();
    const loading=document.createElement("p");loading.className="editor-footnote";loading.textContent="Loading audit events…";list.append(loading);
    try{
      const data=await request("/audit");list.replaceChildren();
      if(!data.events.length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent="No audit events have been recorded yet.";list.append(empty);return}
      const table=document.createElement("div");table.className="audit-table";
      for(const event of data.events){
        const row=document.createElement("article");row.className="audit-row";
        const action=document.createElement("strong");action.textContent=String(event.action||"Admin event").replace(/-/g," ");
        const detail=document.createElement("span");detail.textContent=event.detail||"—";
        const meta=document.createElement("small");meta.textContent=(event.email||"Admin")+" · "+(event.at?new Date(event.at).toLocaleString():"Unknown time");
        row.append(action,detail,meta);table.append(row);
      }
      list.append(table);
    }catch(e){showError(list,e)}
  }
  async function loadSettings(){
    const button=$("settings-refresh");if(button){button.disabled=true;button.textContent="Refreshing…"}
    try{
      const data=await request("/settings");
      $("settings-admin").textContent=data.admin||"—";
      $("settings-repo").textContent=data.repository||"—";
      $("settings-branch").textContent=data.branch||"—";
      $("settings-connection").textContent=data.githubConnected?"Connected · "+data.githubMessage:"Not connected · "+(data.githubMessage||"Check Worker configuration");
      $("settings-session").textContent=data.sessionExpires?new Date(data.sessionExpires).toLocaleString():"Active session";
    }catch(e){$("settings-connection").textContent="Unavailable · "+e.message}
    finally{if(button){button.disabled=false;button.textContent="Refresh settings"}}
  }
  const collectionKinds=["projects","social","brands"];
  const collections={projects:[],social:[],brands:[]};
  const collectionStatus=(kind,message,bad=false)=>{const el=$(kind+"-status");if(el){el.textContent=message;el.style.color=bad?"#f18b83":""}};
  const renderCollection=kind=>{
    const list=$(kind+"-items"),count=$(kind+"-count");if(!list)return;list.replaceChildren();if(count)count.textContent=collections[kind].length+" ITEMS";
    if(!collections[kind].length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent="Nothing added yet. Add your first item above.";list.append(empty);return}
    collections[kind].forEach((item,index)=>{const row=document.createElement("article");row.className="collection-item";const img=document.createElement("img");img.src=item.image;img.alt="";img.loading="lazy";const info=document.createElement("div");info.className="collection-item-info";const title=document.createElement("strong");title.textContent=item.title;const desc=document.createElement("small");desc.textContent=item.description;info.append(title,desc);const remove=document.createElement("button");remove.type="button";remove.className="text-button";remove.textContent="Remove";remove.addEventListener("click",()=>{collections[kind].splice(index,1);renderCollection(kind);collectionStatus(kind,"Item removed from the draft. Publish to update the website.")});row.append(img,info,remove);list.append(row)});
  };
  const loadCollection=async kind=>{try{const data=await request("/content?kind="+kind);collections[kind]=Array.isArray(data.items)?data.items:[];renderCollection(kind);collectionStatus(kind,"Loaded "+collections[kind].length+" item(s).")}catch(e){collectionStatus(kind,"Could not load items: "+e.message,true)}};
  collectionKinds.forEach(kind=>{
    const form=$(kind+"-form");if(!form)return;
    form.addEventListener("submit",event=>{event.preventDefault();const item={title:$(kind+"-title").value.trim(),description:$(kind+"-description").value.trim(),image:$(kind+"-image").value,url:$(kind+"-url").value.trim()};if(!item.title||!item.description||!item.image){collectionStatus(kind,"Complete the title, description and image fields.",true);return}collections[kind].push(item);form.reset();renderCollection(kind);collectionStatus(kind,"Item added to draft. Publish to make it visible on the website.")});
    const publish=document.querySelector('[data-publish="'+kind+'"]');publish?.addEventListener("click",async()=>{publish.disabled=true;publish.textContent="Publishing…";try{await request("/content",{method:"POST",body:JSON.stringify({kind,items:collections[kind]})});const result=await request("/publish/content",{method:"POST",body:JSON.stringify({kind})});collectionStatus(kind,collections[kind].length?"Published "+collections[kind].length+" item(s). Commit "+(result.commit||"created").slice(0,7)+". Wait for Pages deployment.":"Published empty collection. The homepage section is now hidden.");}catch(e){collectionStatus(kind,"Could not publish: "+e.message,true)}finally{publish.disabled=false;publish.textContent="Publish "+(kind==="projects"?"projects":kind==="social"?"social previews":"brand assets")}});
    loadCollection(kind);
  });
  const populateCollectionImages=async()=>{try{const data=await request("/media/list");for(const kind of collectionKinds){const select=$(kind+"-image");if(!select)continue;const chosen=select.value;select.replaceChildren(new Option("Choose from Media Library",""));data.items.forEach(item=>select.add(new Option(item.name,item.siteUrl||item.url)));select.value=chosen}}catch(e){collectionKinds.forEach(kind=>collectionStatus(kind,"Media library unavailable: "+e.message,true))}};
  populateCollectionImages();window.addEventListener("trs:media-updated",populateCollectionImages);document.querySelector('[data-view="showcase"]')?.addEventListener("click",()=>{collectionKinds.forEach(loadCollection);populateCollectionImages()});
  $("media-library-refresh")?.addEventListener("click",loadMedia);
  $("clear-page-image")?.addEventListener("click",()=>{const picker=$("edit-image");if(picker){picker.value="";picker.dispatchEvent(new Event("change",{bubbles:true}))}});
  $("edit-image")?.addEventListener("change",()=>{const url=$("edit-image").value,wrap=$("selected-image-preview"),img=$("selected-image");if(wrap)wrap.hidden=!url;if(img){img.src=url;img.hidden=!url}});
  $("edit-image")?.addEventListener("input",()=>{const url=$("edit-image").value,wrap=$("selected-image-preview"),img=$("selected-image");if(wrap)wrap.hidden=!url;if(img){img.src=url;img.hidden=!url}});
  $("audit-refresh")?.addEventListener("click",loadAudit);
  $("settings-refresh")?.addEventListener("click",loadSettings);
  window.addEventListener("trs:media-updated",loadMedia);
  document.querySelector('[data-view="media"]')?.addEventListener("click",loadMedia);
  document.querySelector('[data-view="audit"]')?.addEventListener("click",loadAudit);
  document.querySelector('[data-view="settings"]')?.addEventListener("click",loadSettings);
  loadMedia();
})();
