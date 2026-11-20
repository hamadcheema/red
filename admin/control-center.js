(() => {
  "use strict";
  const API="/admin-api";
  const $=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
  const button=(label,fn,cls="secondary-button")=>{const b=el("button",cls,label);b.type="button";b.addEventListener("click",fn);return b};
  const panel=(title,desc)=>{const p=el("section","panel control-panel");const h=el("div","panel-heading");const d=el("div");d.append(el("h2","",title),el("p","",desc));h.append(d);p.append(h);return p};
  const call=async(path,options={})=>{const r=await fetch(API+path,{credentials:"include",...options,headers:{"content-type":"application/json",accept:"application/json",...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Request failed ("+r.status+")");return data};
  const status=(root,msg,bad=false)=>{let n=root.querySelector(".control-status");if(!n){n=el("p","control-status");n.setAttribute("role","status");n.setAttribute("aria-live","polite");root.append(n)}n.textContent=msg;n.dataset.error=bad?"true":"false"};
  const mount=(id)=>{const root=$(id);const content=root?.querySelector(".control-content");if(content)content.replaceChildren();return root};
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
    const nav=el("button","nav-link","");nav.type="button";nav.dataset.view=id;nav.dataset.label=title;nav.append(el("span","nav-icon","◇"),document.createTextNode(" "+title));
    const navRoot=document.querySelector(".nav");if(navRoot){if(id==="analytics")navRoot.append(el("div","nav-group-label","OPERATIONS"));if(id==="preview")navRoot.append(el("div","nav-group-label","TOOLS"));navRoot.append(nav);}
    const section=el("section","view");section.id="view-"+id;
    const heading=el("div","section-heading");heading.append(el("div",""));heading.firstChild.append(el("h2","",title),el("p","",description));section.append(heading);
    const content=el("div","control-content");section.append(content);
    const parent=document.querySelector(".content");if(parent){const footer=parent.querySelector(".footer");parent.insertBefore(section,footer||null);}
    nav.addEventListener("click",()=>{if(window.showAdminView)window.showAdminView(id);else load(id);window.closeAdminSidebar?.()});
  });
  const content=id=>$("view-"+id)?.querySelector(".control-content");
  async function loadAnalytics(){
    const root=mount("view-analytics")?.querySelector(".control-content");if(!root)return;
    const p=panel("Cloudflare Web Analytics","Cloudflare is the intended analytics provider. Confirm that Web Analytics is enabled for theredsparrow.online before relying on visitor data.");
    p.append(card("ANALYTICS PROVIDER","Cloudflare","Open the Cloudflare dashboard to inspect current traffic and analytics configuration."));
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
    form.addEventListener("submit",async e=>{e.preventDefault();submit.disabled=true;try{const scheduledAt=new Date(date.value).toISOString();const r=await call("/schedule",{method:"POST",body:JSON.stringify({kind:kind.value,scheduledAt})});const scheduledFor=r.scheduledAt;date.value="";await loadCalendar();status(root,"Publication scheduled for "+formatDate(scheduledFor))}catch(err){status(p,err.message,true)}finally{submit.disabled=false}});
    p.append(form);root.append(p);
    const list=panel("Upcoming publications","Scheduled collection publishes waiting to run.");
    try{const data=await call("/schedule");if(!data.items?.length)list.append(el("p","editor-footnote","No publications scheduled."));
      for(const item of data.items){const row=el("div","control-row");const detail=el("div");detail.append(el("strong","",({projects:"Game projects",social:"Social previews",brands:"Company assets"}[item.kind]||item.kind)),el("small","",formatDate(item.scheduledAt)+" · "+item.status));if(item.error)detail.append(el("small","",item.error));row.append(detail);if(item.status==="scheduled")row.append(button("Cancel",async()=>{if(!confirm("Cancel this scheduled publication?"))return;try{await call("/schedule?id="+encodeURIComponent(item.id),{method:"DELETE"});await loadCalendar();status(root,"Scheduled publication cancelled.")}catch(e){status(list,e.message,true)}}));if(item.status==="failed")row.append(button("Retry in 2 minutes",async()=>{try{const r=await call("/schedule/retry",{method:"POST",body:JSON.stringify({id:item.id})});await loadCalendar();status(root,"Publication rescheduled for "+formatDate(r.scheduledAt))}catch(e){status(list,e.message,true)}}));list.append(row)}
    }catch(e){status(list,"Could not load schedule: "+e.message,true)}
    root.append(list);
  }
  let inquiryItems=[],deletedInquiryItems=[],inquiryData={total:0,unread:0,archived:0},inquiryFolder="inbox",selectedInquiryId=null,inquirySearch="",inquiryDateFilter="any",selectedInquiryIds=new Set();
  async function loadInquiries(){
    const root=mount("view-inquiries")?.querySelector(".control-content");if(!root)return;
    const p=panel("Inquiry inbox","Search, filter, archive, recover and manage website enquiries.");
    const toolbar=el("div","inquiry-toolbar"),search=el("input");search.type="search";search.placeholder="Search name, email, subject or message";search.setAttribute("aria-label","Search enquiries");search.value=inquirySearch;
    const dateFilter=el("select");dateFilter.setAttribute("aria-label","Filter enquiries by date");dateFilter.innerHTML='<option value="any">Any date</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option>';dateFilter.value=inquiryDateFilter;
    const refresh=button("Refresh",loadInquiries);toolbar.append(search,dateFilter,refresh);p.append(toolbar);
    const summary=el("div","inquiry-summary");p.append(summary);
    const bulk=el("div","inquiry-bulk-toolbar");p.append(bulk);
    const shell=el("div","inquiry-shell"),folders=el("nav","inquiry-folders"),listPane=el("section","inquiry-list-pane"),reader=el("section","inquiry-reader");
    folders.setAttribute("aria-label","Inbox folders");listPane.setAttribute("aria-label","Inquiry messages");reader.setAttribute("aria-label","Selected inquiry");
    shell.append(folders,listPane,reader);p.append(shell);root.append(p);
    search.addEventListener("input",()=>{inquirySearch=search.value;renderInbox()});
    dateFilter.addEventListener("change",()=>{inquiryDateFilter=dateFilter.value;renderInbox()});
    try{
      const [active,deleted]=await Promise.all([call("/inquiries"),call("/inquiries/deleted")]);
      inquiryData=active;inquiryItems=active.items||[];deletedInquiryItems=deleted.items||[];
      const pool=inquiryFolder==="deleted"?deletedInquiryItems:inquiryItems;
      if(!selectedInquiryId||!pool.some(x=>x.id===selectedInquiryId))selectedInquiryId=pool[0]?.id||null;
      renderInbox();
    }catch(e){status(p,"Could not load enquiries: "+e.message,true)}
    function renderInbox(){
      const unread=inquiryItems.filter(x=>x.status==="new").length,archived=inquiryItems.filter(x=>x.status==="archived").length;
      summary.replaceChildren(card("TOTAL",String(inquiryData.total??inquiryItems.length),"Active enquiries"),card("UNREAD",String(inquiryData.unread??unread),"Awaiting review"),card("ARCHIVED",String(inquiryData.archived??archived),"Filed enquiries"),card("RECENTLY DELETED",String(deletedInquiryItems.length),"Recoverable for 30 days"));
      const folderDefs=[["inbox","Inbox",inquiryItems.filter(x=>x.status!=="archived"&&x.status!=="deleted").length],["unread","Unread",unread],["read","Read",inquiryItems.filter(x=>x.status==="read").length],["archived","Archived",archived],["deleted","Recently deleted",deletedInquiryItems.length]];
      folders.replaceChildren();
      for(const [id,label,count] of folderDefs){const f=button(label+"  "+count,()=>{inquiryFolder=id;selectedInquiryId=null;selectedInquiryIds.clear();renderInbox()}, "inquiry-folder"+(inquiryFolder===id?" active":""));f.setAttribute("aria-current",inquiryFolder===id?"page":"false");folders.append(f)}
      const source=inquiryFolder==="deleted"?deletedInquiryItems:inquiryItems,term=inquirySearch.trim().toLowerCase(),now=Date.now();
      const visible=source.filter(item=>{
        const inFolder=inquiryFolder==="deleted"?item.status==="deleted":inquiryFolder==="archived"?item.status==="archived":inquiryFolder==="unread"?item.status==="new":inquiryFolder==="read"?item.status==="read":inquiryFolder==="inbox"?item.status!=="archived":true;
        const matches=!term||[item.name,item.email,item.subject,item.message].join(" ").toLowerCase().includes(term);
        const stamp=Date.parse(item.createdAt||"");const days=inquiryDateFilter==="today"?1:Number(inquiryDateFilter);
        const dateOk=inquiryDateFilter==="any"||(Number.isFinite(stamp)&&(inquiryDateFilter==="today"?new Date(stamp).toDateString()===new Date().toDateString():now-stamp<=days*86400000));
        return inFolder&&matches&&dateOk;
      }).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
      const validIds=new Set(visible.map(x=>x.id));selectedInquiryIds=new Set([...selectedInquiryIds].filter(id=>validIds.has(id)));
      listPane.replaceChildren();
      const listHeading=el("div","inquiry-list-heading");const selectAll=el("input");selectAll.type="checkbox";selectAll.setAttribute("aria-label","Select all visible enquiries");selectAll.checked=visible.length>0&&visible.every(x=>selectedInquiryIds.has(x.id));selectAll.addEventListener("change",()=>{if(selectAll.checked)visible.forEach(x=>selectedInquiryIds.add(x.id));else visible.forEach(x=>selectedInquiryIds.delete(x.id));renderInbox()});
      listHeading.append(selectAll,el("strong","","Messages"),el("small","",visible.length+" shown · latest 100 available"));listPane.append(listHeading);
      if(!visible.length)listPane.append(el("p","inquiry-empty",term?"No messages match your search.":"This folder is empty."));
      for(const item of visible){
        const row=el("div","inquiry-select-row"),check=el("input");check.type="checkbox";check.checked=selectedInquiryIds.has(item.id);check.setAttribute("aria-label","Select enquiry from "+(item.name||"visitor"));check.addEventListener("change",()=>{if(check.checked)selectedInquiryIds.add(item.id);else selectedInquiryIds.delete(item.id);renderBulk()});
        const open=button("",()=>openInquiry(item.id),"inquiry-message-row"+(selectedInquiryId===item.id?" selected":"")+(item.status==="new"?" unread":""));open.setAttribute("aria-pressed",selectedInquiryId===item.id?"true":"false");
        const top=el("span","inquiry-row-top");top.append(el("strong","inquiry-sender",item.name||"Website visitor"),el("time","inquiry-date",new Date(item.createdAt).toLocaleDateString()));
        open.append(top,el("span","inquiry-subject",item.subject||"Website enquiry"),el("span","inquiry-snippet",String(item.message||"").replace(/\\s+/g," ").slice(0,115)));
        row.append(check,open);listPane.append(row);
      }
      renderBulk();renderReader();shell.classList.toggle("has-selection",!!selectedInquiryId);
    }
    function renderBulk(){
      bulk.replaceChildren();const count=selectedInquiryIds.size;bulk.append(el("strong","","Selected: "+count));
      if(inquiryFolder==="deleted"){
        bulk.append(button("Permanently delete selected",async()=>{if(!count)return;if(!confirm("Permanently delete "+count+" selected enquiry/enquiries? This cannot be undone."))return;try{const result=await call("/inquiries/purge",{method:"POST",body:JSON.stringify({ids:[...selectedInquiryIds]})});selectedInquiryIds.clear();selectedInquiryId=null;await loadInquiries();status(p,"Permanently deleted "+result.deleted+" enquiry/enquiries.")}catch(e){status(p,e.message,true)}}));
      }else{
        bulk.append(button("Mark read",()=>bulkAction("read")),button("Archive",()=>bulkAction("archive")),button("Move to Recently deleted",()=>bulkAction("delete")));
      }
    }
    async function bulkAction(action){
      if(!selectedInquiryIds.size)return;
      const ids=[...selectedInquiryIds];if(action==="delete"&&!confirm("Move "+ids.length+" selected enquiry/enquiries to Recently deleted? You can recover them for 30 days."))return;
      try{const result=await call("/inquiries/bulk",{method:"POST",body:JSON.stringify({ids,action})});selectedInquiryIds.clear();selectedInquiryId=null;await loadInquiries();status(p,"Updated "+result.updated+" enquiry/enquiries.")}catch(e){status(p,e.message,true)}
    }
    function openInquiry(id){
      selectedInquiryId=id;const item=(inquiryFolder==="deleted"?deletedInquiryItems:inquiryItems).find(x=>x.id===id);
      if(item?.status==="new")updateInquiry(id,"read",p);
      renderInbox();
    }
    function renderReader(){
      reader.replaceChildren();const pool=inquiryFolder==="deleted"?deletedInquiryItems:inquiryItems,item=pool.find(x=>x.id===selectedInquiryId);
      if(!item){reader.append(el("div","inquiry-reader-empty","Select a message to read it"));return}
      const back=button("← Back to messages",()=>{selectedInquiryId=null;renderInbox()},"inquiry-back");
      const actions=el("div","inquiry-reader-actions"),reply=el("a","small-button gmail-reply","Reply in Gmail ↗");
      const params=new URLSearchParams({view:"cm",fs:"1",to:item.email||"",su:"Re: "+(item.subject||"Website enquiry"),body:"Hi "+(item.name||"there")+",\\n\\nThank you for contacting The Red Sparrow.\\n\\nBest regards,\\nThe Red Sparrow"});
      reply.href="https://mail.google.com/mail/?"+params.toString();reply.target="_blank";reply.rel="noopener noreferrer";actions.append(reply);
      if(item.status==="deleted"){
        actions.append(button("Restore",async()=>{try{await call("/inquiries/restore",{method:"POST",body:JSON.stringify({id:item.id})});selectedInquiryId=null;await loadInquiries();status(p,"Enquiry restored to its previous folder.")}catch(e){status(p,e.message,true)}}));
        actions.append(button("Permanently delete",async()=>{if(!confirm("Permanently delete this enquiry? This cannot be undone."))return;try{await call("/inquiries/purge",{method:"POST",body:JSON.stringify({ids:[item.id]})});selectedInquiryId=null;await loadInquiries();status(p,"Enquiry permanently deleted.")}catch(e){status(p,e.message,true)}}));
      }else{
        if(item.status!=="archived")actions.append(button("Archive",()=>updateInquiry(item.id,"archived",p)));else actions.append(button("Restore to inbox",()=>updateInquiry(item.id,"read",p)));
        actions.append(button("Move to Recently deleted",async()=>{if(!confirm("Move this enquiry to Recently deleted? It can be restored for 30 days."))return;try{await call("/inquiries?id="+encodeURIComponent(item.id),{method:"DELETE"});selectedInquiryId=null;await loadInquiries();status(p,"Enquiry moved to Recently deleted.")}catch(e){status(p,e.message,true)}}));
      }
      const head=el("div","inquiry-reader-heading");head.append(el("h3","",item.subject||"Website enquiry"),el("span",item.status==="new"?"status-new":"status-read",item.status==="deleted"?"DELETED":item.status.toUpperCase()));
      const sender=el("div","inquiry-sender-details"),avatar=el("span","inquiry-avatar",(item.name||"V").trim().charAt(0).toUpperCase()),meta=el("div");meta.append(el("strong","",item.name||"Website visitor"),el("a","",item.email||"No sender email"));if(item.email)meta.querySelector("a").href="mailto:"+item.email;meta.append(el("small","",formatDate(item.createdAt)));if(item.deletedAt)meta.append(el("small","","Deleted "+formatDate(item.deletedAt)));sender.append(avatar,meta);
      reader.append(back,actions,head,sender,el("div","inquiry-reader-body",item.message||""));
    }
  }
  async function updateInquiry(id,state,root){
    try{
      await call("/inquiries/update",{method:"POST",body:JSON.stringify({id,state})});
      if(state==="archived"||(state==="read"&&inquiryFolder==="archived"))selectedInquiryId=null;
      await loadInquiries();
      status($("view-inquiries")?.querySelector(".control-content")||root,state==="archived"?"Enquiry archived.":inquiryFolder==="archived"?"Enquiry restored to Inbox.":"Enquiry marked as read.");
    }catch(e){status(root,e.message,true)}
  }
  function renderCurrentInquiryView(){const active=$("view-inquiries")?.querySelector(".control-content");if(active)loadInquiries()}

  async function loadNotifications(){
    const root=mount("view-notifications")?.querySelector(".control-content");if(!root)return;
    const p=panel("Recent notifications","A combined feed of new enquiries, upcoming publications and recent admin activity.");p.append(button("Refresh notifications",loadNotifications));
    try{const data=await call("/notifications");if(!data.items?.length)p.append(el("p","editor-footnote","You're all caught up. No new notifications."));
      for(const item of data.items||[]){const row=el("article","notification-row");row.append(el("strong","",item.title),el("p","",item.detail||""),el("small","",formatDate(item.at)));if(item.href){const destination=item.href.includes("calendar")?"calendar":"inquiries";row.append(button("Open",()=>window.showAdminView?.(destination)))}p.append(row)}
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
    const btn=button("Build preview",async()=>{btn.disabled=true;try{const data=await call("/preview/page",{method:"POST",body:JSON.stringify({slug:page?.value||"home",title:title?.value||"",description:description?.value||"",heading:heading?.value||"",intro:intro?.value||"",imageUrl:image?.value||"",imageAlt:alt?.value||""})});frame.srcdoc=data.html.replace(/<head([^>]*)>/i,'<head$1><base href="https://theredsparrow.online/">');status(p,"Preview generated from current editor values. Nothing was published.")}catch(e){status(p,e.message,true)}finally{btn.disabled=false}});
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
    p.append(button("Revoke all other sessions",async()=>{if(!confirm("Sign out every other admin session? Your current session will remain active."))return;try{const r=await call("/security/revoke-sessions",{method:"POST",body:"{}"});await loadSecurity();status(root,"Revoked "+r.revoked+" other session(s).")}catch(e){status(p,e.message,true)}}));
    try{const data=await call("/security/sessions");p.append(el("p","editor-footnote","Active sessions: "+data.total+" · Session lifetime: 8 hours"));for(const s of data.items||[]){const row=el("div","control-row");row.append(el("div","",s.current?"Current session":"Signed-in session"),el("small","",formatDate(s.created)));if(s.current)row.append(el("span","status-read","CURRENT"));p.append(row)}}catch(e){status(p,"Could not load sessions: "+e.message,true)}
    root.append(p);
  }

  async function loadSiteSettings(){
    const root=mount("view-site-settings")?.querySelector(".control-content");if(!root)return;
    const p=panel("Shared website settings","Save changes as a private draft, review them, then publish across the public pages.");
    const form=el("form","control-form settings-form");
    const field=(label,type,value,max)=>{const wrap=el("label","",label),input=el("input");input.type=type;input.value=value||"";if(max)input.maxLength=max;wrap.append(input);form.append(wrap);return input};
    const contact=field("General enquiries email","email","admin@theredsparrow.online",254),direct=field("Direct contact email","email","hammad@theredsparrow.online",254),tagline=field("Website tagline","text","Independent Unity game development.",120);
    const announceWrap=el("label","","Enable announcement banner"),enabled=el("input");enabled.type="checkbox";announceWrap.append(enabled);form.append(announceWrap);
    const message=field("Announcement message","text","",180);
    const save=el("button","primary-button","Save settings draft");save.type="submit";const publish=button("Publish website settings",async()=>{publish.disabled=true;try{const r=await call("/publish/site-settings",{method:"POST",body:"{}"});await loadSiteSettings();status(root,"Published shared settings to "+r.files+" website page(s).")}catch(e){status(p,e.message,true)}finally{publish.disabled=false}},"primary-button");
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