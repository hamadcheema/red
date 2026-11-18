(() => {
  "use strict";
  const API="/admin-api";
  const $=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
  const button=(label,fn,cls="secondary-button")=>{const b=el("button",cls,label);b.type="button";b.addEventListener("click",fn);return b};
  const panel=(title,desc)=>{const p=el("section","panel control-panel");const h=el("div","panel-heading");const d=el("div");d.append(el("h2","",title),el("p","",desc));h.append(d);p.append(h);return p};
  const call=async(path,options={})=>{const r=await fetch(API+path,{credentials:"include",...options,headers:{"content-type":"application/json",accept:"application/json",...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Request failed ("+r.status+")");return data};
  const status=(root,msg,bad=false)=>{let n=root.querySelector(".control-status");if(!n){n=el("p","control-status");n.setAttribute("role","status");n.setAttribute("aria-live","polite");root.append(n)}n.textContent=msg;n.dataset.error=bad?"true":"false"};
  const mount=(id)=>{const root=$(id);if(root)root.replaceChildren();return root};
  const card=(title,value,detail)=>{const c=el("article","stat-card");c.append(el("span","stat-label",title),el("strong","",value),el("span","stat-foot",detail));return c};
  const formatDate=v=>v?new Date(v).toLocaleString():"—";
  const views={
    analytics: ["Website analytics","Traffic measurement and visitor trends."],
    calendar: ["Publishing calendar","Schedule approved showcase collections for automatic publication."],
    inquiries: ["Inquiry inbox","Review messages submitted through the public contact form."],
    notifications: ["Notification center","Recent admin activity, new inquiries and scheduled publications."],
    health: ["System health","Live checks for the public website, repository and admin services."],
    preview: ["Live website preview","Preview page edits in the context of the real website without publishing."],
    files: ["Advanced file manager","Review uploaded assets, file sizes and where each asset is used."],
    security: ["Access & security","Review active admin sessions and revoke other sessions."],
    "site-settings": ["Website settings","Manage shared contact details, site tagline and announcement banner."]
  };
  Object.entries(views).forEach(([id,[title,description]])=>{
    const nav=el("button","nav-link","");nav.type="button";nav.dataset.view=id;nav.append(el("span","nav-icon","◇"),document.createTextNode(" "+title));
    const navRoot=document.querySelector(".nav");if(navRoot)navRoot.append(nav);
    const section=el("section","view");section.id="view-"+id;section.hidden=true;
    const heading=el("div","section-heading");heading.append(el("div",""));heading.firstChild.append(el("h2","",title),el("p","",description));section.append(heading);
    const content=el("div","control-content");section.append(content);
    const parent=document.querySelector(".content");if(parent)parent.append(section);
    nav.addEventListener("click",()=>{if(window.showAdminView)window.showAdminView(id);load(id)});
  });
  const content=id=>$("view-"+id)?.querySelector(".control-content");
  async function loadAnalytics(){
    const root=mount("view-analytics")?.querySelector(".control-content");if(!root)return;
    const p=panel("Cloudflare Web Analytics","Privacy-focused website analytics already configured for theredsparrow.online.");
    p.append(card("MEASUREMENT","Enabled","Cloudflare Web Analytics site is registered and automatic installation is enabled."));
    const note=el("p","editor-footnote","Traffic charts and visitor breakdowns remain inside Cloudflare. No API token is placed in the public admin page.");
    p.append(note);
    const link=el("a","small-button","Open Cloudflare Analytics ↗");link.href="https://dash.cloudflare.com/c979fbebb9b22fce788bfa99b4d825b6/theredsparrow.online/analytics";link.target="_blank";link.rel="noopener";p.append(link);
    root.append(p);
  }
  async function loadCalendar(){
    const root=mount("view-calendar")?.querySelector(".control-content");if(!root)return;
    const p=panel("Schedule a collection","Choose a saved collection and a future publication time. The Worker publishes it automatically when due.");
    const form=el("form","control-form");
    const kind=el("select");kind.innerHTML='<option value="projects">Game projects</option><option value="social">Social previews</option><option value="brands">Company assets</option>';
    const date=el("input");date.type="datetime-local";date.required=true;
    const submit=el("button","primary-button","Schedule publication");submit.type="submit";
    form.append(el("label","","Collection"),kind,el("label","","Publish at"),date,submit);
    form.addEventListener("submit",async e=>{e.preventDefault();submit.disabled=true;try{const scheduledAt=new Date(date.value).toISOString();const r=await call("/schedule",{method:"POST",body:JSON.stringify({kind:kind.value,scheduledAt})});status(p,"Publication scheduled for "+formatDate(r.scheduledAt));date.value="";await loadCalendar()}catch(err){status(p,err.message,true)}finally{submit.disabled=false}});
    p.append(form);root.append(p);
    const list=panel("Upcoming publications","Scheduled collection publishes waiting to run.");
    try{const data=await call("/schedule");if(!data.items?.length)list.append(el("p","editor-footnote","No publications scheduled."));
      for(const item of data.items){const row=el("div","control-row");const detail=el("div");detail.append(el("strong","",({projects:"Game projects",social:"Social previews",brands:"Company assets"}[item.kind]||item.kind)),el("small","",formatDate(item.scheduledAt)+" · "+item.status));row.append(detail,button("Cancel",async()=>{if(!confirm("Cancel this scheduled publication?"))return;try{await call("/schedule?id="+encodeURIComponent(item.id),{method:"DELETE"});await loadCalendar()}catch(e){status(list,e.message,true)}}));list.append(row)}
    }catch(e){status(list,"Could not load schedule: "+e.message,true)}
    root.append(list);
  }
  async function loadInquiries(){
    const root=mount("view-inquiries")?.querySelector(".control-content");if(!root)return;
    const p=panel("Incoming messages","Messages are stored privately in Cloudflare KV and are visible only after admin sign-in.");
    try{const data=await call("/inquiries");p.append(card("TOTAL",String(data.total||0),"Stored enquiries"),card("NEW",String(data.unread||0),"Awaiting review"));
      if(!data.items?.length)p.append(el("p","editor-footnote","No enquiries received yet."));
      for(const item of data.items||[]){const row=el("article","inquiry-card");const head=el("div","control-row");const detail=el("div");detail.append(el("strong","",item.subject||"Website enquiry"),el("small","",item.name+" · "+item.email+" · "+formatDate(item.createdAt)));head.append(detail,el("span",item.status==="new"?"status-new":"status-read",item.status==="new"?"NEW":item.status.toUpperCase()));const body=el("p","inquiry-message",item.message);const actions=el("div","control-actions");if(item.status==="new")actions.append(button("Mark read",()=>updateInquiry(item.id,"read",p)));if(item.status!=="archived")actions.append(button("Archive",()=>updateInquiry(item.id,"archived",p)));else actions.append(button("Restore",()=>updateInquiry(item.id,"read",p)));actions.append(button("Delete",async()=>{if(!confirm("Permanently delete this enquiry?"))return;try{await call("/inquiries?id="+encodeURIComponent(item.id),{method:"DELETE"});await loadInquiries()}catch(e){status(p,e.message,true)}}));row.append(head,body,actions);p.append(row)}
    }catch(e){status(p,"Could not load enquiries: "+e.message,true)}
    root.append(p);
  }
  async function updateInquiry(id,state,root){try{await call("/inquiries/update",{method:"POST",body:JSON.stringify({id,state})});await loadInquiries()}catch(e){status(root,e.message,true)}}
  async function loadNotifications(){
    const root=mount("view-notifications")?.querySelector(".control-content");if(!root)return;
    const p=panel("Recent notifications","A combined feed of new enquiries, upcoming publications and recent admin activity.");
    try{const data=await call("/notifications");if(!data.items?.length)p.append(el("p","editor-footnote","You're all caught up. No new notifications."));
      for(const item of data.items||[]){const row=el("article","notification-row");row.append(el("strong","",item.title),el("p","",item.detail||""),el("small","",formatDate(item.at)));if(item.href){const a=el("a","small-button","Open");a.href=item.href;row.append(a)}p.append(row)}
    }catch(e){status(p,"Could not load notifications: "+e.message,true)}
    root.append(p);
  }
  async function loadHealth(){
    const root=mount("view-health")?.querySelector(".control-content");if(!root)return;
    const p=panel("Health checks","Checks are read-only and do not change your website or account settings.");
    const refresh=button("Run checks",loadHealth);p.append(refresh);root.append(p);
    try{const data=await call("/system/health");const grid=el("div","stats-grid");for(const check of data.checks||[]){const c=card(check.label,check.ok?"Healthy":"Attention needed",check.detail||"");c.classList.add(check.ok?"health-good":"health-warn");grid.append(c)}p.append(grid);status(p,"Last checked "+formatDate(data.checkedAt))}
    catch(e){status(p,"Health check failed: "+e.message,true)}
  }
  async function loadPreview(){
    const root=mount("view-preview")?.querySelector(".control-content");if(!root)return;
    const p=panel("Preview an unpublished page","Uses the current page editor fields. The preview is isolated and does not commit to GitHub.");
    const page=$("edit-page"),title=$("edit-title"),description=$("edit-description"),heading=$("edit-heading"),intro=$("edit-intro"),image=$("edit-image"),alt=$("edit-image-alt");
    const btn=button("Build preview",async()=>{btn.disabled=true;try{const data=await call("/preview/page",{method:"POST",body:JSON.stringify({slug:page?.value||"home",title:title?.value||"",description:description?.value||"",heading:heading?.value||"",intro:intro?.value||"",imageUrl:image?.value||"",imageAlt:alt?.value||""})});frame.srcdoc=data.html;status(p,"Preview generated from current editor values. Nothing was published.")}catch(e){status(p,e.message,true)}finally{btn.disabled=false}});
    const hint=el("p","editor-footnote","Open Website pages, edit a page, then return here and build the preview. You can also preview the original content by leaving the fields unchanged.");
    const frame=el("iframe","live-preview");frame.title="Unpublished website preview";frame.setAttribute("sandbox","");frame.srcdoc='<p style="font:14px sans-serif;padding:20px">Build a preview to see the selected page here.</p>';
    p.append(hint,btn,frame);root.append(p);
  }
  async function loadFiles(){
    const root=mount("view-files")?.querySelector(".control-content");if(!root)return;
    const p=panel("Repository assets","Uploaded images are stored in assets/uploads/. The usage check helps prevent removing referenced files.");
    const search=el("input");search.type="search";search.placeholder="Filter by filename…";search.setAttribute("aria-label","Filter uploaded assets");
    const list=el("div","control-list");p.append(search,list);root.append(p);
    try{const data=await call("/media/list");const items=data.items||[];
      const render=()=>{list.replaceChildren();const filtered=items.filter(x=>x.name.toLowerCase().includes(search.value.trim().toLowerCase()));if(!filtered.length){list.append(el("p","editor-footnote","No matching files."));return}
        filtered.forEach(item=>{const row=el("article","file-row");const info=el("div");info.append(el("strong","",item.name),el("small","",(item.size/1024).toFixed(1)+" KB · "+item.path));const actions=el("div","control-actions");const open=el("a","small-button","Open");open.href=item.siteUrl||item.url;open.target="_blank";open.rel="noopener";actions.append(open,button("Check usage",async()=>{try{const u=await call("/media/usage?path="+encodeURIComponent(item.path));status(row,u.usedBy?.length?"Used by: "+u.usedBy.join(", "):"No current references detected.")}catch(e){status(row,e.message,true)}}));row.append(info,actions);list.append(row)});
      };search.addEventListener("input",render);render();
    }catch(e){status(p,"Could not load files: "+e.message,true)}
  }
  async function loadSecurity(){
    const root=mount("view-security")?.querySelector(".control-content");if(!root)return;
    const p=panel("Admin sessions","Only the authorized owner account can access this workspace. Session identifiers are never displayed.");
    p.append(button("Revoke all other sessions",async()=>{if(!confirm("Sign out every other admin session? Your current session will remain active."))return;try{const r=await call("/security/revoke-sessions",{method:"POST",body:"{}"});status(p,"Revoked "+r.revoked+" other session(s).");await loadSecurity()}catch(e){status(p,e.message,true)}}));
    try{const data=await call("/security/sessions");p.append(el("p","editor-footnote","Active sessions: "+data.total+" · Session lifetime: 8 hours"));for(const s of data.items||[]){const row=el("div","control-row");row.append(el("div","",s.current?"Current session":"Signed-in session"),el("small","",formatDate(s.created)));if(s.current)row.append(el("span","status-read","CURRENT"));p.append(row)}}catch(e){status(p,"Could not load sessions: "+e.message,true)}
    root.append(p);
  }

  async function loadSiteSettings(){
    const root=mount("view-site-settings")?.querySelector(".control-content");if(!root)return;
    const p=panel("Shared website settings","Save changes as a private draft, review them, then publish across the public pages.");
    const form=el("form","control-form settings-form");form.style.gridTemplateColumns="1fr 1fr";
    const field=(label,type,value,max)=>{const wrap=el("label","",label),input=el("input");input.type=type;input.value=value||"";if(max)input.maxLength=max;wrap.append(input);form.append(wrap);return input};
    const contact=field("General enquiries email","email","admin@theredsparrow.online",254),direct=field("Direct contact email","email","hammad@theredsparrow.online",254),tagline=field("Website tagline","text","Independent Unity game development.",120);
    const announceWrap=el("label","","Enable announcement banner"),enabled=el("input");enabled.type="checkbox";announceWrap.append(enabled);form.append(announceWrap);
    const message=field("Announcement message","text","",180);
    const save=el("button","primary-button","Save settings draft");save.type="submit";const publish=button("Publish website settings",async()=>{publish.disabled=true;try{const r=await call("/publish/site-settings",{method:"POST",body:"{}"});status(p,"Published shared settings to "+r.files+" website page(s).");await loadSiteSettings()}catch(e){status(p,e.message,true)}finally{publish.disabled=false}},"primary-button");
    form.append(save,publish);form.addEventListener("submit",async e=>{e.preventDefault();save.disabled=true;try{await call("/site-settings",{method:"POST",body:JSON.stringify({contactEmail:contact.value,directEmail:direct.value,tagline:tagline.value,announcementEnabled:enabled.checked,announcement:message.value})});status(p,"Website settings draft saved securely.");}catch(err){status(p,err.message,true)}finally{save.disabled=false}});
    p.append(form);root.append(p);
    try{const data=await call("/site-settings"),v=data.draft||data.settings||{};contact.value=v.contactEmail||contact.value;direct.value=v.directEmail||direct.value;tagline.value=v.tagline||tagline.value;enabled.checked=!!v.announcementEnabled;message.value=v.announcement||"";status(p,data.draft?"Unpublished settings draft loaded.":"Showing current published settings.")}catch(e){status(p,"Could not load website settings: "+e.message,true)}
  }

  const loaders={analytics:loadAnalytics,calendar:loadCalendar,inquiries:loadInquiries,notifications:loadNotifications,health:loadHealth,preview:loadPreview,files:loadFiles,security:loadSecurity,"site-settings":loadSiteSettings};
  const loaded=new Set();
  async function load(id){if(!loaders[id])return;loaded.delete(id);await loaders[id]();loaded.add(id)}
  window.addEventListener("trs:control-view",e=>load(e.detail));
  window.addEventListener("trs:admin-authenticated",()=>{loaded.clear();});
})();