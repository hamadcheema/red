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
    activity: ["Personal activity timeline","Review and export your recorded admin activity."],
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
  async function loadDashboard(){
    const view=$("view-overview");if(!view)return;
    let root=view.querySelector(".dashboard-live");if(!root){root=el("div","dashboard-live control-content");view.append(root)}root.replaceChildren();
    const p=panel("Enquiry & activity overview","Live figures from your private Cloudflare KV workspace.");
    root.append(p);
    try{
      const data=await call("/dashboard"),grid=el("div","inquiry-summary dashboard-metrics");
      grid.append(card("TOTAL ENQUIRIES",String(data.inquiries?.total??0),"Active enquiries"),card("UNREAD",String(data.inquiries?.unread??0),"Awaiting review"),card("PUBLISHED PROJECTS",String(data.published?.projects??0),"Showcase projects"),card("RECENTLY DELETED",String(data.inquiries?.deleted??0),"Recoverable for 30 days"));
      grid.append(card("NEW TODAY",String(data.periods?.newToday??0),"Enquiries received today · Pakistan time"),card("LAST 7 DAYS",String(data.periods?.newLast7Days??0),"New enquiries · rolling 7 days"),card("LAST 30 DAYS",String(data.periods?.newLast30Days??0),"New enquiries · rolling 30 days"));
      p.append(grid);
      const head=el("div","inquiry-list-heading");head.append(el("strong","","Recent activity"),button("Open full activity log",()=>window.showAdminView?.("audit")));p.append(head);
      const events=data.recentActivity||[];
      if(!events.length)p.append(el("p","inquiry-empty","No activity has been recorded yet."));
      for(const event of events){const row=el("article","notification-row");row.append(el("strong","",String(event.action||"Admin event").replace(/-/g," ")),el("p","",event.detail||""),el("small","",formatDate(event.at)+" · "+(event.email||"admin")));p.append(row)}
      p.append(button("Open inquiry inbox",()=>window.showAdminView?.("inquiries")));
    }catch(e){status(p,"Could not load dashboard data: "+e.message,true)}
  }

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
      for(const item of data.items){const row=el("div","control-row");const detail=el("div");detail.append(el("strong","",({projects:"Game projects",social:"Social previews",brands:"Company assets"}[item.kind]||item.kind)),el("small","",formatDate(item.scheduledAt)+" · "+item.status));if(item.error)detail.append(el("small","",item.error));row.append(detail);if(item.status==="scheduled")row.append(button("Cancel",async()=>{if(!await window.trsConfirm("Cancel this scheduled publication?"))return;try{await call("/schedule?id="+encodeURIComponent(item.id),{method:"DELETE"});await loadCalendar();status(root,"Scheduled publication cancelled.")}catch(e){status(list,e.message,true)}}));if(item.status==="failed")row.append(button("Retry in 2 minutes",async()=>{try{const r=await call("/schedule/retry",{method:"POST",body:JSON.stringify({id:item.id})});await loadCalendar();status(root,"Publication rescheduled for "+formatDate(r.scheduledAt))}catch(e){status(list,e.message,true)}}));list.append(row)}
    }catch(e){status(list,"Could not load schedule: "+e.message,true)}
    root.append(list);
  }
  let inquiryItems=[],deletedInquiryItems=[],inquiryData={total:0,unread:0,archived:0},deletedInquiryTotal=0,inquiryHasMore=false,deletedHasMore=false,inquiryOffset=0,deletedOffset=0,inquiryFolder="inbox",selectedInquiryId=null,inquirySearch="",inquiryDateFilter="any",selectedInquiryIds=new Set();
  async function loadInquiries(){
    const root=mount("view-inquiries")?.querySelector(".control-content");if(!root)return;
    const p=panel("Inquiry inbox","Search, filter, archive, recover and manage website enquiries.");
    const toolbar=el("div","inquiry-toolbar"),search=el("input");search.type="search";search.placeholder="Search name, email, subject or message";search.setAttribute("aria-label","Search enquiries");search.value=inquirySearch;
    const dateFilter=el("select");dateFilter.setAttribute("aria-label","Filter enquiries by date");dateFilter.innerHTML='<option value="any">Any date</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option>';dateFilter.value=inquiryDateFilter;
    const refresh=button("Refresh",loadInquiries),exportCsv=button("Export CSV",async()=>{
      exportCsv.disabled=true;exportCsv.textContent="Exporting…";
      try{
        const result=await fetch("/admin-api/inquiries/export",{credentials:"include"});
        if(!result.ok){const error=await result.json().catch(()=>({}));throw new Error(error.error||"Export failed ("+result.status+").")}
        const blob=await result.blob(),url=URL.createObjectURL(blob),link=el("a");link.href=url;link.download="the-red-sparrow-enquiries.csv";link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        status(p,"CSV export downloaded. It includes all active enquiries, including archived messages.");
      }catch(error){status(p,"Could not export enquiries: "+error.message,true)}
      finally{exportCsv.disabled=false;exportCsv.textContent="Export CSV"}
    });exportCsv.className="small-button";toolbar.append(search,dateFilter,refresh,exportCsv);p.append(toolbar);
    const summary=el("div","inquiry-summary");p.append(summary);
    const bulk=el("div","inquiry-bulk-toolbar");p.append(bulk);
    const shell=el("div","inquiry-shell"),folders=el("nav","inquiry-folders"),listPane=el("section","inquiry-list-pane"),reader=el("section","inquiry-reader");
    folders.setAttribute("aria-label","Inbox folders");listPane.setAttribute("aria-label","Inquiry messages");reader.setAttribute("aria-label","Selected inquiry");
    shell.append(folders,listPane,reader);p.append(shell);root.append(p);
    search.addEventListener("input",()=>{inquirySearch=search.value;renderInbox()});
    dateFilter.addEventListener("change",()=>{inquiryDateFilter=dateFilter.value;renderInbox()});
    try{
      const [active,deleted]=await Promise.all([call("/inquiries?offset=0&limit=100"),call("/inquiries/deleted?offset=0&limit=100")]);
      inquiryData=active;inquiryItems=active.items||[];deletedInquiryItems=deleted.items||[];deletedInquiryTotal=deleted.total||0;inquiryOffset=inquiryItems.length;deletedOffset=deletedInquiryItems.length;inquiryHasMore=!!active.hasMore;deletedHasMore=!!deleted.hasMore;
      const pool=inquiryFolder==="deleted"?deletedInquiryItems:inquiryItems;
      if(!selectedInquiryId||!pool.some(x=>x.id===selectedInquiryId))selectedInquiryId=pool[0]?.id||null;
      renderInbox();
    }catch(e){status(p,"Could not load enquiries: "+e.message,true)}
    function renderInbox(){
      const unread=inquiryItems.filter(x=>x.status==="new").length,archived=inquiryItems.filter(x=>x.status==="archived").length;
      summary.replaceChildren(card("TOTAL",String(inquiryData.total??inquiryItems.length),"Active enquiries"),card("UNREAD",String(inquiryData.unread??unread),"Awaiting review"),card("ARCHIVED",String(inquiryData.archived??archived),"Filed enquiries"),card("RECENTLY DELETED",String(deletedInquiryTotal),"Recoverable for 30 days"));
      const folderDefs=[["inbox","Inbox",inquiryItems.filter(x=>x.status!=="archived"&&x.status!=="deleted").length],["unread","Unread",unread],["read","Read",inquiryItems.filter(x=>x.status==="read").length],["archived","Archived",archived],["deleted","Recently deleted",deletedInquiryItems.length]];
      folders.replaceChildren();
      for(const [id,label,count] of folderDefs){const f=button(label+"  "+count,()=>{inquiryFolder=id;selectedInquiryId=null;selectedInquiryIds.clear();renderInbox()}, "inquiry-folder"+(inquiryFolder===id?" active":""));f.setAttribute("aria-current",inquiryFolder===id?"page":"false");folders.append(f)}
      const source=inquiryFolder==="deleted"?deletedInquiryItems:inquiryItems,term=inquirySearch.trim().toLowerCase(),now=Date.now();
      const visible=source.filter(item=>{
        const inFolder=inquiryFolder==="deleted"?item.status==="deleted":inquiryFolder==="archived"?item.status==="archived":inquiryFolder==="unread"?item.status==="new":inquiryFolder==="read"?item.status==="read":inquiryFolder==="inbox"?item.status!=="archived":true;
        const matches=!term||[item.name,item.email,item.subject,item.message].join(" ").toLowerCase().includes(term);
        const stamp=Date.parse(item.createdAt||"");const days=inquiryDateFilter==="today"?1:Number(inquiryDateFilter);
const karachiDate=value=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Karachi",year:"numeric",month:"2-digit",day:"2-digit"}).format(value);
                const dateOk=inquiryDateFilter==="any"||(Number.isFinite(stamp)&&(inquiryDateFilter==="today"?karachiDate(stamp)===karachiDate(now):now-stamp<=days*86400000));
        return inFolder&&matches&&dateOk;
      }).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
      const validIds=new Set(visible.map(x=>x.id));selectedInquiryIds=new Set([...selectedInquiryIds].filter(id=>validIds.has(id)));
      listPane.replaceChildren();
      const listHeading=el("div","inquiry-list-heading");const selectAll=el("input");selectAll.type="checkbox";selectAll.setAttribute("aria-label","Select all visible enquiries");selectAll.checked=visible.length>0&&visible.every(x=>selectedInquiryIds.has(x.id));selectAll.addEventListener("change",()=>{if(selectAll.checked)visible.forEach(x=>selectedInquiryIds.add(x.id));else visible.forEach(x=>selectedInquiryIds.delete(x.id));renderInbox()});
      listHeading.append(selectAll,el("strong","","Messages"),el("small","",visible.length+" shown · "+(inquiryFolder==="deleted"?deletedInquiryItems.length+"/"+deletedInquiryTotal:inquiryItems.length+"/"+(inquiryData.total??inquiryItems.length))+" loaded"));listPane.append(listHeading);
      if(!visible.length)listPane.append(el("p","inquiry-empty",term?"No messages match your search.":"This folder is empty."));
      for(const item of visible){
        const row=el("div","inquiry-select-row"),check=el("input");check.type="checkbox";check.checked=selectedInquiryIds.has(item.id);check.setAttribute("aria-label","Select enquiry from "+(item.name||"visitor"));check.addEventListener("change",()=>{if(check.checked)selectedInquiryIds.add(item.id);else selectedInquiryIds.delete(item.id);renderBulk()});
        const open=button("",()=>openInquiry(item.id),"inquiry-message-row"+(selectedInquiryId===item.id?" selected":"")+(item.status==="new"?" unread":""));open.setAttribute("aria-pressed",selectedInquiryId===item.id?"true":"false");
        const top=el("span","inquiry-row-top");top.append(el("strong","inquiry-sender",item.name||"Website visitor"),el("time","inquiry-date",new Date(item.createdAt).toLocaleDateString()));
        open.append(top,el("span","inquiry-subject",item.subject||"Website enquiry"),el("span","inquiry-snippet",String(item.message||"").replace(/\s+/g," ").slice(0,115)));
        row.append(check,open);listPane.append(row);
      }
      const more=inquiryFolder==="deleted"?deletedHasMore:inquiryHasMore;
      if(more)listPane.append(button("Load older enquiries",async()=>{const isDeleted=inquiryFolder==="deleted",offset=isDeleted?deletedOffset:inquiryOffset;try{const data=await call((isDeleted?"/inquiries/deleted":"/inquiries")+"?offset="+offset+"&limit=100");const target=isDeleted?deletedInquiryItems:inquiryItems,seen=new Set(target.map(x=>x.id));target.push(...(data.items||[]).filter(x=>!seen.has(x.id)));if(isDeleted){deletedOffset=target.length;deletedHasMore=!!data.hasMore;deletedInquiryTotal=data.total||deletedInquiryTotal}else{inquiryOffset=target.length;inquiryHasMore=!!data.hasMore;inquiryData=data}renderInbox()}catch(e){status(p,"Could not load older enquiries: "+e.message,true)}}));
      renderBulk();renderReader();shell.classList.toggle("has-selection",!!selectedInquiryId);
    }
    function renderBulk(){
      bulk.replaceChildren();const count=selectedInquiryIds.size;bulk.append(el("strong","","Selected: "+count));
      if(inquiryFolder==="deleted"){
        bulk.append(button("Permanently delete selected",async()=>{if(!count)return;if(!await window.trsConfirm("Permanently delete "+count+" selected enquiry/enquiries? This cannot be undone."))return;try{const result=await call("/inquiries/purge",{method:"POST",body:JSON.stringify({ids:[...selectedInquiryIds]})});selectedInquiryIds.clear();selectedInquiryId=null;await loadInquiries();status(p,"Permanently deleted "+result.deleted+" enquiry/enquiries.")}catch(e){status(p,e.message,true)}}));
      }else{
        bulk.append(button("Mark read",()=>bulkAction("read")),button("Archive",()=>bulkAction("archive")),button("Move to Recently deleted",()=>bulkAction("delete")));
      }
    }
    async function bulkAction(action){
      if(!selectedInquiryIds.size)return;
      const ids=[...selectedInquiryIds];if(action==="delete"&&!await window.trsConfirm("Move "+ids.length+" selected enquiry/enquiries to Recently deleted? You can recover them for 30 days."))return;
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
      const params=new URLSearchParams({view:"cm",fs:"1",to:item.email||"",su:"Re: "+(item.subject||"Website enquiry"),body:"Hi "+(item.name||"there")+",\n\nThank you for contacting The Red Sparrow.\n\nBest regards,\nThe Red Sparrow"});
      reply.href="https://mail.google.com/mail/?"+params.toString();reply.target="_blank";reply.rel="noopener noreferrer";actions.append(reply);
      if(item.status==="deleted"){
        actions.append(button("Restore",async()=>{try{await call("/inquiries/restore",{method:"POST",body:JSON.stringify({id:item.id})});selectedInquiryId=null;await loadInquiries();status(p,"Enquiry restored to its previous folder.")}catch(e){status(p,e.message,true)}}));
        actions.append(button("Permanently delete",async()=>{if(!await window.trsConfirm("Permanently delete this enquiry? This cannot be undone."))return;try{await call("/inquiries/purge",{method:"POST",body:JSON.stringify({ids:[item.id]})});selectedInquiryId=null;await loadInquiries();status(p,"Enquiry permanently deleted.")}catch(e){status(p,e.message,true)}}));
      }else{
        if(item.status!=="archived")actions.append(button("Archive",()=>updateInquiry(item.id,"archived",p)));else actions.append(button("Restore to inbox",()=>updateInquiry(item.id,"read",p)));
        actions.append(button("Move to Recently deleted",async()=>{if(!await window.trsConfirm("Move this enquiry to Recently deleted? It can be restored for 30 days."))return;try{await call("/inquiries?id="+encodeURIComponent(item.id),{method:"DELETE"});selectedInquiryId=null;await loadInquiries();status(p,"Enquiry moved to Recently deleted.")}catch(e){status(p,e.message,true)}}));
      }
      const head=el("div","inquiry-reader-heading");head.append(el("h3","",item.subject||"Website enquiry"),el("span",item.status==="new"?"status-new":"status-read",item.status==="deleted"?"DELETED":item.status.toUpperCase()));
      const sender=el("div","inquiry-sender-details"),avatar=el("span","inquiry-avatar",(item.name||"V").trim().charAt(0).toUpperCase()),meta=el("div");meta.append(el("strong","",item.name||"Website visitor"),el("a","",item.email||"No sender email"));if(item.email)meta.querySelector("a").href="mailto:"+encodeURIComponent(item.email);meta.append(el("small","",formatDate(item.createdAt)));if(item.deletedAt)meta.append(el("small","","Deleted "+formatDate(item.deletedAt)));sender.append(avatar,meta);
      reader.append(back,actions,head,sender,el("div","inquiry-reader-body",item.message||""));
    }
  }
  async function updateInquiry(id,state,root){
    try{
      await call("/inquiries/update",{method:"POST",body:JSON.stringify({id,state})});
      const item=inquiryItems.find(entry=>entry.id===id);
      if(item){const oldState=item.status;item.status=state;if(oldState==="new"&&state==="read")inquiryData.unread=Math.max(0,(inquiryData.unread||0)-1);if(oldState==="archived"&&state!=="archived")inquiryData.archived=Math.max(0,(inquiryData.archived||0)-1);if(oldState!=="archived"&&state==="archived")inquiryData.archived=(inquiryData.archived||0)+1;}
      if(state==="archived"||(state==="read"&&inquiryFolder==="archived"))selectedInquiryId=null;
      renderInbox();
      status($("view-inquiries")?.querySelector(".control-content")||root,state==="archived"?"Enquiry archived.":inquiryFolder==="archived"?"Enquiry restored to Inbox.":"Enquiry marked as read.");
    }catch(e){status(root,e.message,true)}
  }
  function renderCurrentInquiryView(){const active=$("view-inquiries")?.querySelector(".control-content");if(active)loadInquiries()}

  async function loadActivityTimeline(){
    const root=mount("view-activity")?.querySelector(".control-content");if(!root)return;
    const p=panel("Your activity timeline","A read-only timeline of actions recorded for your authorized admin account. Choose a date range to review or export activity.");
    const toolbar=el("div","activity-toolbar");
    const from=el("input");from.type="date";from.setAttribute("aria-label","Activity start date");
    const to=el("input");to.type="date";to.setAttribute("aria-label","Activity end date");
    const kind=el("select");kind.setAttribute("aria-label","Filter activity type");
    [["all","All activity"],["content","Content changes"],["website","Website settings"],["inquiry","Enquiry actions"],["media","Media actions"],["security","Security actions"]].forEach(([value,label])=>{const option=el("option","",label);option.value=value;kind.append(option)});
    const refresh=button("Refresh",loadActivityTimeline);
    const exportButton=button("Export CSV",()=>{const rows=filtered.map(item=>[item.at,item.email,item.action,item.detail]);const cell=value=>{let text=String(value??"");if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};const csv="\uFEFF"+[["Date","Admin","Action","Details"],...rows].map(row=>row.map(cell).join(",")).join("\r\n")+"\r\n";const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=el("a");a.href=url;a.download="the-red-sparrow-activity.csv";a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status(p,"Activity report exported.")});
    toolbar.append(from,to,kind,refresh,exportButton);p.append(toolbar);
    const summary=el("div","inquiry-summary");p.append(summary);
    const timeline=el("div","activity-timeline");p.append(timeline);root.append(p);
    let events=[],filtered=[];
    const karachiDate=value=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Karachi",year:"numeric",month:"2-digit",day:"2-digit"}).format(value);
    const render=()=>{
      const start=from.value?Date.parse(from.value+"T00:00:00+05:00"):-Infinity;
      const end=to.value?Date.parse(to.value+"T23:59:59.999+05:00"):Infinity;
      filtered=events.filter(item=>{const stamp=Date.parse(item.at||"");if(!Number.isFinite(stamp)||stamp<start||stamp>end)return false;const action=String(item.action||"").toLowerCase();return kind.value==="all"||(kind.value==="content"&&/(project|social|brand|content|publish)/.test(action))||(kind.value==="website"&&/(site|setting|brand|section)/.test(action))||(kind.value==="inquiry"&&/(inquir|enquir)/.test(action))||(kind.value==="media"&&/media|upload|delete/.test(action))||(kind.value==="security"&&/auth|session|security|login|logout/.test(action))});
      summary.replaceChildren(card("MATCHING EVENTS",String(filtered.length),"In selected date range"),card("TODAY",String(events.filter(x=>karachiDate(Date.parse(x.at||""))===karachiDate(Date.now())).length),"Recorded events today"),card("LAST 7 DAYS",String(events.filter(x=>Date.now()-Date.parse(x.at||"")<=604800000&&Date.now()>=Date.parse(x.at||"")).length),"Recorded events"));
      timeline.replaceChildren();
      if(!filtered.length){timeline.append(el("p","inquiry-empty","No activity matches this filter and date range."));return}
      for(const item of filtered){const row=el("article","activity-event");const date=el("time","activity-event-date",formatDate(item.at));if(item.at)date.dateTime=item.at;const body=el("div","activity-event-body");body.append(el("strong","",String(item.action||"Admin event").replace(/-/g," ")),el("p","",item.detail||"No additional details."),el("small","",item.email||"Authorized admin"));row.append(date,body);timeline.append(row)}
    };
    [from,to,kind].forEach(input=>input.addEventListener("change",render));
    try{const data=await call("/audit?limit=500");events=(data.events||[]).filter(item=>item&&item.at).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));render();status(p,"Loaded "+events.length+" recent audit events. The timeline reflects the audit retention window.");}
    catch(e){status(p,"Could not load activity: "+e.message,true)}
  }
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
    p.append(button("Revoke all other sessions",async()=>{if(!await window.trsConfirm("Sign out every other admin session? Your current session will remain active."))return;try{const r=await call("/security/revoke-sessions",{method:"POST",body:"{}"});await loadSecurity();status(root,"Revoked "+r.revoked+" other session(s).")}catch(e){status(p,e.message,true)}}));
    try{const data=await call("/security/sessions");p.append(el("p","editor-footnote","Active sessions: "+data.total+" · Session lifetime: 8 hours. Session references are temporary fingerprints, not login credentials."));for(const item of data.items||[]){const row=el("div","control-row");const detail=el("div");detail.append(el("strong","",item.current?"Current session":"Signed-in session"),el("small","",(item.login||"Authorized account")+" · "+formatDate(item.created)));row.append(detail);if(item.current)row.append(el("span","status-read","CURRENT"));else row.append(button("Revoke session",async()=>{if(!await window.trsConfirm("Sign out this specific admin session? This will not affect your current session."))return;try{await call("/security/revoke-session",{method:"POST",body:JSON.stringify({sessionRef:item.sessionRef})});await loadSecurity();status(root,"Selected admin session revoked.")}catch(e){status(row,e.message,true)}},"manager-delete"));p.append(row)}}catch(e){status(p,"Could not load sessions: "+e.message,true)}
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
    const brandField=el("fieldset","brand-settings-fieldset"),brandLegend=el("legend","","Brand identity");brandField.append(brandLegend);
    const colorLabel=el("label","brand-setting-row","Accent colour"),accent=el("input");accent.type="color";accent.value="#ed4b45";colorLabel.append(accent);brandField.append(colorLabel);
    const fontLabel=el("label","brand-setting-row","Typography"),font=el("select");
    [["system","System UI"],["arial","Arial"],["georgia","Georgia"],["trebuchet","Trebuchet MS"]].forEach(([value,label])=>{const option=el("option","",label);option.value=value;font.append(option)});
    fontLabel.append(font);brandField.append(fontLabel);
    const logoLabel=el("label","brand-setting-row","Website logo"),logo=el("select");
    const defaultLogo=el("option","","Default site icon");defaultLogo.value="/favicon.svg";logo.append(defaultLogo);
    logoLabel.append(logo);brandField.append(logoLabel);
    const brandNote=el("p","field-hint","Upload a logo in Media Library first, then select it here. The selected logo, accent colour and font are applied across the public website when published.");brandField.append(brandNote);
    const brandPreview=el("div","brand-preview");brandPreview.setAttribute("role","group");brandPreview.setAttribute("aria-label","Live brand preview");
    const previewImage=el("img","brand-preview-logo");previewImage.src="/favicon.svg";previewImage.alt="Selected website logo";
    const previewContent=el("div","brand-preview-content");previewContent.append(el("span","brand-preview-kicker","LIVE BRAND PREVIEW"),el("strong","brand-preview-name","THE RED SPARROW"),el("p","brand-preview-copy","Ideas into interactive worlds."));
    const previewAccent=el("span","brand-preview-accent","ACCENT COLOUR");
    brandPreview.append(previewImage,previewContent,previewAccent);brandField.append(brandPreview);
    const previewFontStacks={system:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',arial:'Arial,Helvetica,sans-serif',georgia:'Georgia,"Times New Roman",serif',trebuchet:'"Trebuchet MS",Arial,sans-serif'};
    const updateBrandPreview=()=>{previewImage.src=logo.value||"/favicon.svg";previewImage.onerror=()=>{previewImage.onerror=null;previewImage.src="/favicon.svg"};brandPreview.style.setProperty("--preview-accent",accent.value);previewContent.style.fontFamily=previewFontStacks[font.value]||previewFontStacks.system;previewAccent.textContent=accent.value.toUpperCase()};
    accent.addEventListener("input",updateBrandPreview);font.addEventListener("change",updateBrandPreview);logo.addEventListener("change",updateBrandPreview);
    form.append(brandField);
    const comparison=el("section","brand-comparison");comparison.setAttribute("aria-label","Published and draft brand comparison");
    const comparisonHeading=el("h3","","Published vs editing");const comparisonHint=el("p","field-hint","Compare the live identity with the values currently selected above. These changes are not public until you publish.");
    const comparisonGrid=el("div","brand-comparison-grid");
    const publishedCard=el("article","brand-comparison-card"),editingCard=el("article","brand-comparison-card");
    const makeSnapshot=(card,label)=>{const heading=el("strong","brand-comparison-label",label),image=el("img","brand-comparison-logo");image.alt=label+" logo";const meta=el("div","brand-comparison-meta"),colour=el("span","brand-comparison-colour"),fontName=el("span","brand-comparison-font");meta.append(colour,fontName);card.append(heading,image,meta);return{image,colour,fontName}};
    const publishedSnapshot=makeSnapshot(publishedCard,"Currently published"),editingSnapshot=makeSnapshot(editingCard,"Editing / draft");
    comparisonGrid.append(publishedCard,editingCard);comparison.append(comparisonHeading,comparisonHint,comparisonGrid);form.append(comparison);
    const fontLabels={system:"System UI",arial:"Arial",georgia:"Georgia",trebuchet:"Trebuchet MS"};
    const updateComparison=(publishedBrand)=>{const current=publishedBrand||{accentColor:"#ed4b45",fontFamily:"system",logoPath:"/favicon.svg"};const update=(snapshot,brand)=>{const path=brand.logoPath||"/favicon.svg";snapshot.image.src=path;snapshot.image.onerror=()=>{snapshot.image.onerror=null;snapshot.image.src="/favicon.svg"};snapshot.colour.textContent=brand.accentColor||"#ed4b45";snapshot.colour.style.borderColor=brand.accentColor||"#ed4b45";snapshot.colour.style.backgroundColor=brand.accentColor||"#ed4b45";snapshot.fontName.textContent=fontLabels[brand.fontFamily]||"System UI"};update(publishedSnapshot,current);update(editingSnapshot,{accentColor:accent.value,fontFamily:font.value,logoPath:logo.value})};
    accent.addEventListener("input",()=>updateComparison(window.trsPublishedBrand));font.addEventListener("change",()=>updateComparison(window.trsPublishedBrand));logo.addEventListener("change",()=>updateComparison(window.trsPublishedBrand));
    try{const media=await call("/media/list");(media.items||[]).forEach(item=>{const option=el("option","",item.name);option.value="/"+item.path;logo.append(option)})}catch{}

    const visibilityField=el("fieldset","section-visibility-fieldset"),legend=el("legend","","Homepage section visibility");visibilityField.append(legend);
    const sectionLabels=[["hero","Hero introduction"],["intro","About / introduction"],["services","Services overview"],["projects","Game project showcases"],["social","Social media previews"],["brands","Brand assets"],["workflow","Development workflow"],["contact","Contact call-to-action"]];
    const visibilityInputs={};
    sectionLabels.forEach(([key,label])=>{const row=el("label","section-visibility-row"),input=el("input");input.type="checkbox";input.checked=true;visibilityInputs[key]=input;row.append(input,document.createTextNode(" "+label));visibilityField.append(row)});
    const note=el("p","field-hint","Turning a section off only hides it on the public homepage. Its content remains saved and can be shown again at any time.");visibilityField.append(note);form.append(visibilityField);
    const save=el("button","primary-button","Save settings draft");save.type="submit";const publish=button("Publish website settings",async()=>{publish.disabled=true;try{const r=await call("/publish/site-settings",{method:"POST",body:"{}"});await loadSiteSettings();status(root,"Published shared settings to "+r.files+" website page(s).")}catch(e){status(p,e.message,true)}finally{publish.disabled=false}},"primary-button");
    form.append(save,publish);form.addEventListener("submit",async e=>{e.preventDefault();save.disabled=true;try{await call("/site-settings",{method:"POST",body:JSON.stringify({contactEmail:contact.value,directEmail:direct.value,tagline:tagline.value,announcementEnabled:enabled.checked,announcement:message.value,sectionVisibility:Object.fromEntries(Object.entries(visibilityInputs).map(([key,input])=>[key,input.checked])),brand:{accentColor:accent.value,fontFamily:font.value,logoPath:logo.value}})});status(p,"Website settings draft saved securely.");}catch(err){status(p,err.message,true)}finally{save.disabled=false}});
    p.append(form);root.append(p);
    try{const data=await call("/site-settings"),v=data.draft||data.settings||{};contact.value=v.contactEmail||contact.value;direct.value=v.directEmail||direct.value;tagline.value=v.tagline||tagline.value;enabled.checked=!!v.announcementEnabled;message.value=v.announcement||"";accent.value=v.brand?.accentColor||"#ed4b45";font.value=v.brand?.fontFamily||"system";logo.value=v.brand?.logoPath||"/favicon.svg";updateBrandPreview();window.trsPublishedBrand=data.settings?.brand||{accentColor:"#ed4b45",fontFamily:"system",logoPath:"/favicon.svg"};updateComparison(window.trsPublishedBrand);Object.entries(visibilityInputs).forEach(([key,input])=>input.checked=(v.sectionVisibility||{})[key]!==false);status(p,data.draft?"Unpublished settings draft loaded.":"Showing current published settings.")}catch(e){status(p,"Could not load website settings: "+e.message,true)}
  }

  const loaders={overview:loadDashboard,analytics:loadAnalytics,calendar:loadCalendar,inquiries:loadInquiries,notifications:loadNotifications,activity:loadActivityTimeline,health:loadHealth,preview:loadPreview,files:loadFiles,security:loadSecurity,"site-settings":loadSiteSettings};
  const loaded=new Set();
  async function load(id){if(!loaders[id])return;loaded.delete(id);await loaders[id]();loaded.add(id)}
  window.addEventListener("trs:control-view",e=>load(e.detail));
  window.addEventListener("trs:admin-authenticated",()=>{loaded.clear();loadDashboard();});
})();