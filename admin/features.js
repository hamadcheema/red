(() => {
  const API="/admin-api";
  const $=id=>document.getElementById(id);
  const request=async path=>{const r=await fetch(API+path,{credentials:"include",headers:{accept:"application/json"}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed ("+r.status+")");return d};
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
  $("media-library-refresh")?.addEventListener("click",loadMedia);
  $("clear-page-image")?.addEventListener("click",()=>{const picker=$("edit-image");if(picker){picker.value="";picker.dispatchEvent(new Event("change",{bubbles:true}))}});
  $("edit-image")?.addEventListener("change",()=>{const url=$("edit-image").value,wrap=$("selected-image-preview"),img=$("selected-image");if(wrap)wrap.hidden=!url;if(img){img.src=url;img.hidden=!url}});
  $("audit-refresh")?.addEventListener("click",loadAudit);
  $("settings-refresh")?.addEventListener("click",loadSettings);
  window.addEventListener("trs:media-updated",loadMedia);
  document.querySelector('[data-view="media"]')?.addEventListener("click",loadMedia);
  document.querySelector('[data-view="audit"]')?.addEventListener("click",loadAudit);
  document.querySelector('[data-view="settings"]')?.addEventListener("click",loadSettings);
  loadMedia();
})();
