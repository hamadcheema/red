(() => {
  const API="/admin-api";
  const $=id=>document.getElementById(id);
  const request=async(path,options={})=>{const r=await fetch(API+path,{credentials:"include",...options,headers:{"content-type":"application/json",accept:"application/json",...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed ("+r.status+")");return d};
  const showError=(el,error)=>{if(el)el.textContent="Could not load data: "+error.message};
  const sayMediaStatus=(message,bad=false)=>{const el=$("media-status");if(el){el.textContent=message;el.style.color=bad?"#f18b83":""}};
  let mediaItems=[],mediaSearch="",mediaSort="newest";
  function renderMediaLibrary(){
    const grid=$("media-library-grid");if(!grid)return;grid.replaceChildren();
    const items=mediaItems.filter(item=>item.name.toLowerCase().includes(mediaSearch));
    items.sort((a,b)=>mediaSort==="name"?a.name.localeCompare(b.name):mediaSort==="size"?b.size-a.size:mediaSort==="oldest"?a.name.localeCompare(b.name):b.name.localeCompare(a.name));
    if(!items.length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent=mediaItems.length?"No files match your search.":"No uploaded images yet. Upload an image above to add it here.";grid.append(empty);return}
    for(const item of items){
      const card=document.createElement("article");card.className="asset-card";
      const art=document.createElement("div");art.className="asset-art";const img=document.createElement("img");img.src=item.previewUrl||item.url;img.alt=item.name;img.loading="lazy";art.append(img);
      const info=document.createElement("div");info.className="asset-info";const name=document.createElement("strong");name.textContent=item.name;
      const meta=document.createElement("small");meta.textContent=(item.size/1024).toFixed(1)+" KB · assets/uploads/";
      const link=document.createElement("a");link.href=item.siteUrl||item.url;link.target="_blank";link.rel="noopener";link.textContent="Open image ↗";
      const remove=document.createElement("button");remove.type="button";remove.className="delete-media";remove.textContent="Move to trash";remove.addEventListener("click",async()=>{if(!confirm("Move "+item.name+" to Recently deleted? You can restore it for 7 days."))return;remove.disabled=true;remove.textContent="Moving…";try{await request("/media/delete",{method:"POST",body:JSON.stringify({path:item.path})});sayMediaStatus("Image moved to Recently deleted. It can be restored for 7 days.");await loadMedia();await loadMediaTrash();window.dispatchEvent(new Event("trs:media-updated"))}catch(e){remove.disabled=false;remove.textContent="Move to trash";sayMediaStatus("Could not move image: "+e.message,true);alert(e.message)}});
      info.append(name,meta,link,remove);card.append(art,info);grid.append(card);
    }
  }
  async function loadMedia(){
    const grid=$("media-library-grid");if(!grid)return;
    grid.replaceChildren();const loading=document.createElement("p");loading.className="editor-footnote";loading.textContent="Loading uploaded images…";grid.append(loading);
    try{
      const data=await request("/media/list");mediaItems=data.items||[];
      const picker=$("edit-image");
      if(picker){const selected=picker.value;picker.replaceChildren(new Option("No image selected",""));for(const item of mediaItems){const option=new Option(item.name,item.siteUrl||item.url);option.dataset.previewUrl=item.previewUrl||item.url+"?v="+encodeURIComponent(item.name);picker.add(option)}picker.value=[...picker.options].some(o=>o.value===selected)?selected:"";picker.dispatchEvent(new Event("change",{bubbles:true}));}
      renderMediaLibrary();
    }catch(e){showError(grid,e)}
  }
  async function loadMediaTrash(){
    const grid=$("media-trash-grid");if(!grid)return;grid.replaceChildren();
    try{const data=await request("/media/trash");if(!data.items.length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent="Recently deleted images will appear here for 7 days.";grid.append(empty);return}
      for(const item of data.items){const card=document.createElement("article");card.className="asset-card";const art=document.createElement("div");art.className="asset-art";const label=document.createElement("span");label.textContent="Deleted";art.append(label);const info=document.createElement("div");info.className="asset-info";const name=document.createElement("strong");name.textContent=item.name;const meta=document.createElement("small");meta.textContent="Deleted "+new Date(item.deletedAt).toLocaleString()+" · "+(item.size/1024).toFixed(1)+" KB";const restore=document.createElement("button");restore.type="button";restore.className="secondary-button";restore.textContent="Restore image";restore.addEventListener("click",async()=>{if(!confirm("Restore "+item.name+" to assets/uploads/?"))return;restore.disabled=true;restore.textContent="Restoring…";try{await request("/media/restore",{method:"POST",body:JSON.stringify({id:item.id})});sayMediaStatus("Image restored to the Media Library.");await loadMedia();await loadMediaTrash();window.dispatchEvent(new Event("trs:media-updated"))}catch(e){restore.disabled=false;restore.textContent="Restore image";alert("Could not restore image: "+e.message)}});info.append(name,meta,restore);card.append(art,info);grid.append(card)}
    }catch(e){showError(grid,e)}
  }
  async function loadContentTrash(){
    const list=$("content-history-list");if(!list)return;list.replaceChildren();
    try{const data=await request("/content/trash");if(!data.items.length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent="No previous collection versions are available yet. Each successful publish will keep the previous version here for 7 days.";list.append(empty);return}
      for(const item of data.items){const row=document.createElement("div");row.className="homepage-history-row";const detail=document.createElement("div"),title=document.createElement("strong"),meta=document.createElement("small");title.textContent=(item.kind==="projects"?"Projects":item.kind==="social"?"Social previews":"Company assets")+" · "+item.count+" item(s)";meta.textContent="Previous version · "+new Date(item.deletedAt).toLocaleString();detail.append(title,meta);const restore=document.createElement("button");restore.type="button";restore.className="secondary-button";restore.textContent="Restore collection";restore.addEventListener("click",async()=>{if(!confirm("Restore the entire "+title.textContent.split(" · ")[0]+" collection to this previous version? Current published items in this category will be replaced."))return;restore.disabled=true;restore.textContent="Restoring…";try{const result=await request("/content/restore",{method:"POST",body:JSON.stringify({id:item.id})});collectionStatus(item.kind,"Previous collection restored. Commit "+(result.commit||"created").slice(0,7)+".");await loadCollection(item.kind);await loadContentTrash();await loadAdminSummary()}catch(e){restore.disabled=false;restore.textContent="Restore collection";alert("Could not restore collection: "+e.message)}});row.append(detail,restore);list.append(row)}
    }catch(e){showError(list,e)}
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
  async function loadAdminSummary(){
    try{
      const results=await Promise.all([...collectionKinds.map(kind=>request("/content?kind="+kind)),request("/media/list")]);
      const content=results.slice(0,3),media=results[3];
      const history=await request("/history?path=index.html");
      const total=content.reduce((sum,item)=>sum+(Array.isArray(item.items)?item.items.length:0),0);
      const pending=content.filter(item=>item.draftChanged).length;
      const dates=content.map(item=>item.publishedAt).filter(Boolean).sort();
      const lastPublish=history.history?.[0]?.date||dates[dates.length-1]||null;
      const set=(id,value)=>{const el=$(id);if(el)el.textContent=value};
      set("summary-content-count",String(total));set("summary-media-count",String((media.items||[]).length));set("summary-draft-count",String(pending));
      set("summary-published-at",lastPublish?new Date(lastPublish).toLocaleDateString():"Not yet");
    }catch(e){["summary-content-count","summary-media-count","summary-draft-count","summary-published-at"].forEach(id=>{const el=$(id);if(el)el.textContent="—"})}
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
  const publishedCollections={projects:[],social:[],brands:[]};
  const collectionEditing={projects:-1,social:-1,brands:-1};
  const collectionDirty={projects:false,social:false,brands:false};
  const collectionStatus=(kind,message,bad=false)=>{const el=$(kind+"-status");if(el){el.textContent=message;el.style.color=bad?"#f18b83":""}};
  let managerFilter="all",managerSearch="",managerStatus="all",managerSort="newest";
  const selectedManagerItems=new Set();
  const updateBulkControls=()=>{const count=selectedManagerItems.size;const label=$("manager-selected-count");if(label)label.textContent=count+" selected";const publish=$("manager-publish-selected"),del=$("manager-delete-selected");if(publish)publish.disabled=!count;if(del)del.disabled=!count};
  const editCollectionItem=(kind,index)=>{const item=collections[kind][index];if(!item)return;$(kind+"-title").value=item.title;$(kind+"-description").value=item.description;$(kind+"-image").value=item.image.startsWith("http")?item.image:location.origin+item.image;$(kind+"-url").value=item.url||"";collectionEditing[kind]=index;formSubmitLabel(kind,"Update item");collectionStatus(kind,"Editing this item. Submit the form, then save draft and publish.");$(kind+"-form").scrollIntoView({behavior:"smooth",block:"center"});$(kind+"-title").focus({preventScroll:true})};
  const isPublishedItem=(kind,item)=>publishedCollections[kind].some(p=>p.title===item.title&&p.description===item.description&&p.image===item.image&&(p.url||"")===(item.url||""));
  const renderManager=()=>{
    const grid=$("content-manager-grid"),count=$("content-manager-count");if(!grid)return;grid.replaceChildren();
    let all=collectionKinds.flatMap(kind=>{
      const draftEntries=collections[kind].map((item,index)=>({kind,index,item,published:isPublishedItem(kind,item),pendingRemoval:false}));
      for(const item of publishedCollections[kind])if(!collections[kind].some(d=>d.title===item.title&&d.image===item.image))draftEntries.push({kind,index:-1,item,published:true,pendingRemoval:true});
      return draftEntries;
    })
      .filter(entry=>(managerFilter==="all"||entry.kind===managerFilter))
      .filter(entry=>!managerSearch||(entry.item.title+" "+entry.item.description).toLowerCase().includes(managerSearch))
      .filter(entry=>managerStatus==="all"||(managerStatus==="published"?entry.published&&!entry.pendingRemoval:managerStatus==="removed"?entry.pendingRemoval:!entry.published));
    all.sort((a,b)=>managerSort==="title"?a.item.title.localeCompare(b.item.title):managerSort==="category"?a.kind.localeCompare(b.kind):b.index-a.index);
    if(count)count.textContent=all.length+" ITEMS";
    if(!all.length){const empty=document.createElement("p");empty.className="editor-footnote";empty.textContent="No items match these filters. Add content using the forms below.";grid.append(empty);updateBulkControls();return}
    for(const entry of all){
      const {kind,index,item,published,pendingRemoval}=entry,key=kind+":"+index;
      const card=document.createElement("article");card.className="manager-card";
      const art=document.createElement("div");art.className="manager-card-art";const img=document.createElement("img");img.src=item.image;img.alt=item.title;img.loading="lazy";art.append(img);
      const body=document.createElement("div");body.className="manager-card-body";
      const meta=document.createElement("div");meta.className="manager-card-meta";
      const check=document.createElement("input");check.type="checkbox";check.className="manager-select";check.checked=selectedManagerItems.has(key);check.disabled=pendingRemoval;check.setAttribute("aria-label","Select "+item.title);check.addEventListener("change",()=>{if(check.checked)selectedManagerItems.add(key);else selectedManagerItems.delete(key);updateBulkControls()});
      const tag=document.createElement("span");tag.className="manager-card-tag";tag.textContent=kind==="projects"?"GAME PROJECT":kind==="social"?"SOCIAL PREVIEW":"COMPANY ASSET";
      const state=document.createElement("span");state.className="manager-state "+(published?"is-published":"is-draft");state.textContent=pendingRemoval?"Pending removal":published?"Published":"Draft";state.classList.toggle("is-removed",pendingRemoval);
      meta.append(check,tag,state);
      const title=document.createElement("h3");title.textContent=item.title;const desc=document.createElement("p");desc.textContent=item.description;body.append(meta,title,desc);
      const actions=document.createElement("div");actions.className="manager-card-actions";
      const preview=document.createElement("button");preview.type="button";preview.className="secondary-button";preview.textContent="Preview";preview.addEventListener("click",()=>openContentPreview(kind,item));
      const edit=document.createElement("button");edit.type="button";edit.className="secondary-button";edit.textContent=pendingRemoval?"Undo removal":"Edit";edit.addEventListener("click",async()=>{if(pendingRemoval){const existing=collections[kind].findIndex(x=>x.title===item.title);if(existing>=0)collections[kind][existing]=item;else collections[kind].push(item);collectionDirty[kind]=true;try{await saveCollectionDraft(kind);const result=await request("/publish/content",{method:"POST",body:JSON.stringify({kind})});publishedCollections[kind]=collections[kind].slice();collectionDirty[kind]=false;collectionStatus(kind,"Removal undone and item restored. Commit "+(result.commit||"created").slice(0,7)+".");renderManager()}catch(e){collectionStatus(kind,"Could not restore item: "+e.message,true)}}else editCollectionItem(kind,index)});
      const del=document.createElement("button");del.type="button";del.className="manager-delete";del.textContent=pendingRemoval?"—":"Delete";del.disabled=pendingRemoval;if(!pendingRemoval)del.addEventListener("click",async()=>{if(!confirm("Delete "+item.title+" and publish the change to the homepage?"))return;selectedManagerItems.clear();del.disabled=true;del.textContent="Deleting…";const previous=collections[kind].slice();collections[kind].splice(index,1);collectionDirty[kind]=true;renderManager();try{await saveCollectionDraft(kind);const result=await request("/publish/content",{method:"POST",body:JSON.stringify({kind})});publishedCollections[kind]=collections[kind].slice();collectionDirty[kind]=false;collectionStatus(kind,"Deleted and published. Commit "+(result.commit||"created").slice(0,7)+".");renderManager();loadAdminSummary()}catch(error){collections[kind]=previous;collectionDirty[kind]=true;renderManager();collectionStatus(kind,"Delete was not published: "+error.message,true);alert("Could not complete deletion: "+error.message)}});
      actions.append(preview,edit,del);card.append(art,body,actions);grid.append(card);
    }
    updateBulkControls();
  };
  const openContentPreview=(kind,item)=>{const dialog=$("content-preview-dialog");if(!dialog)return;$("content-preview-image").src=item.image;$("content-preview-image").alt=item.title;$("content-preview-category").textContent=kind==="projects"?"GAME PROJECT":kind==="social"?"SOCIAL PREVIEW":"COMPANY ASSET";$("content-preview-title").textContent=item.title;$("content-preview-description").textContent=item.description;const link=$("content-preview-link");link.hidden=!item.url;if(item.url)link.href=item.url;dialog.showModal()};
  $("content-preview-close")?.addEventListener("click",()=>$("content-preview-dialog")?.close());
  const renderCollection=kind=>{const count=$(kind+"-count");if(count)count.textContent=collections[kind].length+" ITEMS";renderManager()};
  const formSubmitLabel=(kind,label)=>{const button=$(kind+"-form")?.querySelector("button[type=submit]");if(button)button.textContent=label};
  const saveCollectionDraft=async kind=>{try{await request("/content",{method:"POST",body:JSON.stringify({kind,items:collections[kind]})});collectionDirty[kind]=false;collectionStatus(kind,"Draft saved securely. Publish when ready.")}catch(e){collectionStatus(kind,"Draft could not be saved: "+e.message,true);throw e}};
  const loadCollection=async kind=>{try{selectedManagerItems.clear();const data=await request("/content?kind="+kind);collections[kind]=Array.isArray(data.items)?data.items:[];publishedCollections[kind]=Array.isArray(data.publishedItems)?data.publishedItems:[];collectionDirty[kind]=false;collectionEditing[kind]=-1;renderCollection(kind);collectionStatus(kind,"Loaded "+collections[kind].length+" saved item(s) · "+publishedCollections[kind].length+" published.");}catch(e){collectionStatus(kind,"Could not load items: "+e.message,true)}};
  collectionKinds.forEach(kind=>{
    const form=$(kind+"-form");if(!form)return;
    form.addEventListener("submit",event=>{event.preventDefault();const item={title:$(kind+"-title").value.trim(),description:$(kind+"-description").value.trim(),image:$(kind+"-image").value,url:$(kind+"-url").value.trim()};if(!item.title||!item.description||!item.image){collectionStatus(kind,"Complete the title, description and image fields.",true);return}if(collectionEditing[kind]>=0){collections[kind][collectionEditing[kind]]=item;collectionEditing[kind]=-1;formSubmitLabel(kind,"Add "+(kind==="projects"?"project":kind==="social"?"social preview":"brand asset"))}else collections[kind].push(item);collectionDirty[kind]=true;form.reset();renderCollection(kind);collectionStatus(kind,"Item changed in this browser. Save draft to keep it.");});
    const save=document.querySelector('[data-save-draft="'+kind+'"]');save?.addEventListener("click",()=>saveCollectionDraft(kind));
    const publish=document.querySelector('[data-publish="'+kind+'"]');publish?.addEventListener("click",async()=>{publish.disabled=true;publish.textContent="Publishing…";try{if(collectionDirty[kind])await saveCollectionDraft(kind);const result=await request("/publish/content",{method:"POST",body:JSON.stringify({kind})});collectionDirty[kind]=false;publishedCollections[kind]=collections[kind].slice();renderManager();loadAdminSummary();collectionStatus(kind,collections[kind].length?"Published "+collections[kind].length+" item(s). Commit "+(result.commit||"created").slice(0,7)+". Wait for Pages deployment.":"Published empty collection. The homepage section is now hidden.");}catch(e){collectionStatus(kind,"Could not publish: "+e.message,true)}finally{publish.disabled=false;publish.textContent="Publish"}});
    loadCollection(kind);
  });
  const populateCollectionImages=async()=>{try{const data=await request("/media/list");for(const kind of collectionKinds){const select=$(kind+"-image");if(!select)continue;const chosen=select.value;select.replaceChildren(new Option("Choose from Media Library",""));data.items.forEach(item=>select.add(new Option(item.name,item.siteUrl||item.url)));select.value=chosen}}catch(e){collectionKinds.forEach(kind=>collectionStatus(kind,"Media library unavailable: "+e.message,true))}};
  populateCollectionImages();window.addEventListener("trs:media-updated",populateCollectionImages);document.querySelector('[data-view="showcase"]')?.addEventListener("click",()=>{collectionKinds.forEach(loadCollection);populateCollectionImages();loadContentTrash()});
  $("content-history-refresh")?.addEventListener("click",loadContentTrash);
  document.querySelectorAll("[data-manager-filter]").forEach(button=>button.addEventListener("click",()=>{managerFilter=button.dataset.managerFilter;document.querySelectorAll("[data-manager-filter]").forEach(x=>x.classList.toggle("active",x===button));renderManager()}));
  $("content-manager-search")?.addEventListener("input",event=>{managerSearch=event.target.value.trim().toLowerCase();renderManager()});
  $("content-manager-status")?.addEventListener("change",event=>{managerStatus=event.target.value;renderManager()});
  $("content-manager-sort")?.addEventListener("change",event=>{managerSort=event.target.value;renderManager()});
  $("manager-delete-selected")?.addEventListener("click",async()=>{if(!selectedManagerItems.size)return;if(!confirm("Delete the selected items and publish the affected collections?"))return;const grouped={projects:[],social:[],brands:[]};for(const key of selectedManagerItems){const [kind,index]=key.split(":");grouped[kind].push(Number(index))}selectedManagerItems.clear();for(const kind of collectionKinds){if(!grouped[kind].length)continue;const previous=collections[kind].slice();grouped[kind].sort((a,b)=>b-a).forEach(index=>collections[kind].splice(index,1));collectionDirty[kind]=true;try{await saveCollectionDraft(kind);await request("/publish/content",{method:"POST",body:JSON.stringify({kind})});publishedCollections[kind]=collections[kind].slice();collectionDirty[kind]=false;collectionStatus(kind,"Selected items deleted and published.")}catch(e){collections[kind]=previous;collectionDirty[kind]=false;collectionStatus(kind,"Bulk deletion was not published; the previous list has been restored: "+e.message,true)}}renderManager();loadAdminSummary()});
  $("manager-publish-selected")?.addEventListener("click",async()=>{if(!selectedManagerItems.size)return;const grouped={projects:[],social:[],brands:[]};for(const key of selectedManagerItems){const [kind,index]=key.split(":");const item=collections[kind][Number(index)];if(item)grouped[kind].push(item)}selectedManagerItems.clear();for(const kind of collectionKinds){if(!grouped[kind].length)continue;const merged=publishedCollections[kind].slice();for(const item of grouped[kind]){const existing=merged.findIndex(x=>x.title===item.title||x.image===item.image);if(existing>=0)merged[existing]=item;else merged.push(item)}collections[kind]=merged;collectionDirty[kind]=true;try{await saveCollectionDraft(kind);const result=await request("/publish/content",{method:"POST",body:JSON.stringify({kind})});publishedCollections[kind]=merged.slice();collectionDirty[kind]=false;collectionStatus(kind,"Selected items published. Commit "+(result.commit||"created").slice(0,7)+".")}catch(e){collectionStatus(kind,"Could not publish selected items: "+e.message,true)}}renderManager()});
  $("content-manager-refresh")?.addEventListener("click",()=>collectionKinds.forEach(loadCollection));
  $("media-library-refresh")?.addEventListener("click",loadMedia);
  $("media-search")?.addEventListener("input",event=>{mediaSearch=event.target.value.trim().toLowerCase();renderMediaLibrary()});
  $("media-sort")?.addEventListener("change",event=>{mediaSort=event.target.value;renderMediaLibrary()});
  $("media-trash-refresh")?.addEventListener("click",loadMediaTrash);
  $("clear-page-image")?.addEventListener("click",()=>{const picker=$("edit-image");if(picker){picker.value="";picker.dispatchEvent(new Event("change",{bubbles:true}))}});
  $("edit-image")?.addEventListener("change",()=>{const picker=$("edit-image"),url=picker.value,previewUrl=picker.selectedOptions[0]?.dataset.previewUrl||url,wrap=$("selected-image-preview"),img=$("selected-image");if(wrap)wrap.hidden=!url;if(img){img.src=previewUrl;img.hidden=!url}});
  $("edit-image")?.addEventListener("input",()=>{const picker=$("edit-image"),url=picker.value,previewUrl=picker.selectedOptions[0]?.dataset.previewUrl||url,wrap=$("selected-image-preview"),img=$("selected-image");if(wrap)wrap.hidden=!url;if(img){img.src=previewUrl;img.hidden=!url}});
  $("audit-refresh")?.addEventListener("click",loadAudit);
  $("settings-refresh")?.addEventListener("click",loadSettings);
  window.addEventListener("trs:media-updated",loadMedia);
  document.querySelector('[data-view="media"]')?.addEventListener("click",loadMedia);
  document.querySelector('[data-view="audit"]')?.addEventListener("click",loadAudit);
  document.querySelector('[data-view="settings"]')?.addEventListener("click",loadSettings);
  window.addEventListener("beforeunload",event=>{if(Object.values(collectionDirty).some(Boolean)){event.preventDefault();event.returnValue=""}});
  loadMedia();
  loadMediaTrash();
  loadContentTrash();
  document.querySelector('[data-view="overview"]')?.addEventListener("click",loadAdminSummary);
  loadAdminSummary();
})();
