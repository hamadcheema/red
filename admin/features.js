(() => {
  const API="/admin-api";
  const $=id=>document.getElementById(id);
  const request=async(path,options={})=>{if(typeof window.trsAdminRequest!=="function")await new Promise(resolve=>window.addEventListener("trs:admin-api-ready",resolve,{once:true}));return window.trsAdminRequest(path,options)};
  const showError=(el,error)=>{if(el)el.textContent="Could not load data: "+error.message};
  const sayMediaStatus=(message,bad=false)=>{const el=$("media-status");if(el){el.textContent=message;el.style.color=bad?"#f18b83":""}};
  async function loadMedia(){
    const grid=$("media-library-grid");if(!grid)return;
    grid.replaceChildren();const loading=document.createElement("p");loading.className="editor-footnote";loading.textContent="Loading uploaded images…";grid.append(loading);
    try{
      const data=await request("/media/list");
      const picker=$("edit-image");
      if(picker){const selected=picker.value;picker.replaceChildren(new Option("No image selected",""));for(const item of data.items){const option=new Option(item.name,item.siteUrl||item.url);option.dataset.previewUrl=item.url+"?v="+encodeURIComponent(item.name);picker.add(option)}picker.value=[...picker.options].some(o=>o.value===selected)?selected:"";picker.dispatchEvent(new Event("change",{bubbles:true}));}
      grid.replaceChildren();
      if(!data.items.length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent="No uploaded images yet. Upload an image above to add it here.";grid.append(empty);return}
      for(const item of data.items){
        const card=document.createElement("article");card.className="asset-card";
        const art=document.createElement("div");art.className="asset-art";
        const img=document.createElement("img");img.src=item.url+"?v="+encodeURIComponent(item.name);img.alt=item.name;img.loading="lazy";art.append(img);
        const info=document.createElement("div");info.className="asset-info";
        const name=document.createElement("strong");name.textContent=item.name;
        const meta=document.createElement("small");meta.textContent=(item.size/1024).toFixed(1)+" KB · assets/uploads/";
        const link=document.createElement("a");link.href=item.url;link.target="_blank";link.rel="noopener";link.textContent="Open image ↗";
        const remove=document.createElement("button");remove.type="button";remove.className="delete-media";remove.textContent="Delete image";remove.addEventListener("click",async()=>{if(!confirm("Permanently delete "+item.name+" from the website repository? This cannot be undone here."))return;remove.disabled=true;remove.textContent="Deleting…";try{await request("/media/delete",{method:"POST",body:JSON.stringify({path:item.path})});sayMediaStatus("Image deleted from the repository.");await loadMedia();window.dispatchEvent(new Event("trs:media-updated"))}catch(e){remove.disabled=false;remove.textContent="Delete image";sayMediaStatus("Could not delete image: "+e.message,true);alert(e.message)}});info.append(name,meta,link,remove);card.append(art,info);grid.append(card);
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
  const collectionEditing={projects:-1,social:-1,brands:-1};
  const collectionDirty={projects:false,social:false,brands:false};
  const collectionStatus=(kind,message,bad=false)=>{const el=$(kind+"-status");if(el){el.textContent=message;el.style.color=bad?"#f18b83":""}};
  const renderCollection=kind=>{
    const list=$(kind+"-items"),count=$(kind+"-count");if(!list)return;list.replaceChildren();if(count)count.textContent=collections[kind].length+" ITEMS";
    if(!collections[kind].length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent="Nothing added yet. Add your first item above.";list.append(empty);return}
    collections[kind].forEach((item,index)=>{const row=document.createElement("article");row.className="collection-item";const img=document.createElement("img");img.src=item.image;img.alt="";img.loading="lazy";const info=document.createElement("div");info.className="collection-item-info";const title=document.createElement("strong");title.textContent=item.title;const desc=document.createElement("small");desc.textContent=item.description;info.append(title,desc);const controls=document.createElement("div");controls.className="collection-item-controls";const edit=document.createElement("button");edit.type="button";edit.className="text-button";edit.textContent="Edit";edit.addEventListener("click",()=>{const item=collections[kind][index];$(kind+"-title").value=item.title;$(kind+"-description").value=item.description;$(kind+"-image").value=item.image.startsWith("http")?item.image:location.origin+item.image;$(kind+"-url").value=item.url||"";collectionEditing[kind]=index;formSubmitLabel(kind,"Update item");collectionStatus(kind,"Editing item. Save draft to keep changes.")});const remove=document.createElement("button");remove.type="button";remove.className="text-button";remove.textContent="Remove";remove.addEventListener("click",()=>{collections[kind].splice(index,1);collectionDirty[kind]=true;renderCollection(kind);collectionStatus(kind,"Item removed from draft. Save draft to keep the change.")});controls.append(edit,remove);row.append(img,info,controls);list.append(row)});
  };
  const formSubmitLabel=(kind,label)=>{const button=$(kind+"-form")?.querySelector("button[type=submit]");if(button)button.textContent=label};
  const saveCollectionDraft=async kind=>{try{await request("/content",{method:"POST",body:JSON.stringify({kind,items:collections[kind]})});collectionDirty[kind]=false;collectionStatus(kind,"Draft saved securely. Publish when ready.")}catch(e){collectionStatus(kind,"Draft could not be saved: "+e.message,true);throw e}};
  const loadCollection=async kind=>{try{const data=await request("/content?kind="+kind);collections[kind]=Array.isArray(data.items)?data.items:[];collectionDirty[kind]=false;collectionEditing[kind]=-1;renderCollection(kind);collectionStatus(kind,"Loaded "+collections[kind].length+" saved item(s).");}catch(e){collectionStatus(kind,"Could not load items: "+e.message,true)}};
  collectionKinds.forEach(kind=>{
    const form=$(kind+"-form");if(!form)return;
    form.addEventListener("submit",event=>{event.preventDefault();const item={title:$(kind+"-title").value.trim(),description:$(kind+"-description").value.trim(),image:$(kind+"-image").value,url:$(kind+"-url").value.trim()};if(!item.title||!item.description||!item.image){collectionStatus(kind,"Complete the title, description and image fields.",true);return}if(collectionEditing[kind]>=0){collections[kind][collectionEditing[kind]]=item;collectionEditing[kind]=-1;formSubmitLabel(kind,"Add "+(kind==="projects"?"project":kind==="social"?"social preview":"brand asset"))}else collections[kind].push(item);collectionDirty[kind]=true;form.reset();renderCollection(kind);collectionStatus(kind,"Item changed in this browser. Save draft to keep it.");});
    const save=document.querySelector('[data-save-draft="'+kind+'"]');save?.addEventListener("click",()=>saveCollectionDraft(kind));
    const publishButtons=[...document.querySelectorAll('[data-publish="'+kind+'"]')];const publishLabels=publishButtons.map(button=>button.textContent);publishButtons.forEach(button=>button.addEventListener("click",async()=>{if(publishButtons.some(item=>item.disabled))return;publishButtons.forEach(item=>{item.disabled=true;item.textContent="Publishing…"});try{if(collectionDirty[kind])await saveCollectionDraft(kind);const result=await request("/publish/content",{method:"POST",body:JSON.stringify({kind})});collectionDirty[kind]=false;collectionStatus(kind,collections[kind].length?"Published "+collections[kind].length+" item(s) to preview. Commit "+(result.commit||"created").slice(0,7)+". Wait for Cloudflare Pages deployment.":"Published empty collection to preview. The homepage section is now hidden.");}catch(e){collectionStatus(kind,"Could not publish: "+e.message,true)}finally{publishButtons.forEach((item,index)=>{item.disabled=false;item.textContent=publishLabels[index]})}}));
    loadCollection(kind);
  });
  const populateCollectionImages=async()=>{try{const data=await request("/media/list");for(const kind of collectionKinds){const select=$(kind+"-image");if(!select)continue;const chosen=select.value;select.replaceChildren(new Option("Choose from Media Library",""));data.items.forEach(item=>select.add(new Option(item.name,item.siteUrl||item.url)));select.value=chosen}}catch(e){collectionKinds.forEach(kind=>collectionStatus(kind,"Media library unavailable: "+e.message,true))}};
  populateCollectionImages();window.addEventListener("trs:media-updated",populateCollectionImages);document.querySelector('[data-view="showcase"]')?.addEventListener("click",()=>{collectionKinds.forEach(loadCollection);populateCollectionImages()});
  $("media-library-refresh")?.addEventListener("click",loadMedia);
  $("clear-page-image")?.addEventListener("click",()=>{const picker=$("edit-image");if(picker){picker.value="";picker.dispatchEvent(new Event("change",{bubbles:true}))}});
  $("edit-image")?.addEventListener("change",()=>{const picker=$("edit-image"),url=picker.value,previewUrl=picker.selectedOptions[0]?.dataset.previewUrl||url,wrap=$("selected-image-preview"),img=$("selected-image");if(wrap)wrap.hidden=!url;if(img){img.src=previewUrl;img.hidden=!url}});
  $("edit-image")?.addEventListener("input",()=>{const picker=$("edit-image"),url=picker.value,previewUrl=picker.selectedOptions[0]?.dataset.previewUrl||url,wrap=$("selected-image-preview"),img=$("selected-image");if(wrap)wrap.hidden=!url;if(img){img.src=previewUrl;img.hidden=!url}});
  $("audit-refresh")?.addEventListener("click",loadAudit);
  $("settings-refresh")?.addEventListener("click",loadSettings);
  window.addEventListener("trs:media-updated",loadMedia);
  document.querySelector('[data-view="media"]')?.addEventListener("click",loadMedia);
  document.querySelector('[data-view="audit"]')?.addEventListener("click",loadAudit);
  document.querySelector('[data-view="settings"]')?.addEventListener("click",loadSettings);
  loadMedia();
})();
