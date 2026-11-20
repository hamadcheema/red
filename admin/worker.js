const ORIGIN="https://theredsparrow.online";
const API="/admin-api";
const FILES={home:"index.html",about:"about.html",services:"services.html",contact:"contact.html",privacy:"privacy.html",terms:"terms.html"};
const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":ORIGIN,"access-control-allow-credentials":"true","vary":"Origin",...headers}});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function enc(s){const b=new TextEncoder().encode(s);let x="";for(let i=0;i<b.length;i+=8192)x+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(x)}
function dec(s){return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)))}
function meta(html,attr,key,value){const tags=html.match(/<meta\b[^>]*>/gi)||[];const old=tags.find(t=>t.includes(attr+'="'+key+'"'));const tag='<meta '+attr+'="'+key+'" content="'+esc(value)+'">';return old?html.replace(old,tag):html.replace(/<\/head>/i,"  "+tag+"\n</head>")}
function link(html,rel,value){const tags=html.match(/<link\b[^>]*>/gi)||[];const old=tags.find(t=>/rel="canonical"/i.test(t));const tag='<link rel="'+rel+'" href="'+esc(value)+'">';return old?html.replace(old,tag):html.replace(/<\/head>/i,"  "+tag+"\n</head>")}
function seoPatch(html,v){for(const [x,max,label] of [[v.title,70,"title"],[v.description,180,"description"],[v.ogTitle||v.title,70,"social title"],[v.ogDescription||v.description,200,"social description"],[v.ogImageAlt||"",200,"social image description"]])if((!x&&label!=="social image description")||String(x).length>max)throw Error("Invalid "+label+".");for(const x of [v.canonical,v.ogImage]){const u=new URL(x);if(u.protocol!=="https:"||u.hostname!=="theredsparrow.online"||u.username||u.password)throw Error("URLs must use HTTPS on theredsparrow.online.")}html=html.replace(/<title>[\s\S]*?<\/title>/i,"<title>"+esc(v.title)+"</title>");html=meta(html,"name","description",v.description);html=link(html,"canonical",v.canonical);for(const [a,k,val] of [["property","og:title",v.ogTitle||v.title],["property","og:description",v.ogDescription||v.description],["property","og:url",v.canonical],["property","og:image",v.ogImage],["name","twitter:title",v.ogTitle||v.title],["name","twitter:description",v.ogDescription||v.description],["name","twitter:image",v.ogImage],["property","og:image:alt",v.ogImageAlt||v.ogTitle||v.title],["name","twitter:image:alt",v.ogImageAlt||v.ogTitle||v.title]])html=meta(html,a,k,val);return html}
function headingMarkup(value){return String(value).split(/\r?\n/).map(line=>esc(line).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>")).join("<br>")}
function pagePatch(html,v){
for(const [x,max,optional] of [[v.title,70,false],[v.description,180,false],[v.heading,100,false],[v.intro,500,false],[v.imageAlt||"",160,true]])if((!optional&&!x)||String(x).length>max)throw Error("Complete all fields within their character limits.");
html=html.replace(/<title>[\s\S]*?<\/title>/i,"<title>"+esc(v.title)+"</title>");
html=meta(html,"name","description",v.description);
html=html.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i,"$1"+headingMarkup(v.heading)+"$2");
html=html.replace(/(<p\s+class="hero-copy"[^>]*>)[\s\S]*?(<\/p>)/i,"$1"+esc(v.intro)+"$2");
const marker=/<figure class="admin-page-image">[\s\S]*?<\/figure>/i;
const image=String(v.imageUrl||"").trim();
let markup="";
if(image){
let parsed;try{parsed=new URL(image)}catch{throw Error("Choose an image from the media library.")}
if(parsed.origin!==ORIGIN||!parsed.pathname.startsWith("/assets/uploads/")||! /\.(png|jpe?g|webp|gif)$/i.test(parsed.pathname))throw Error("Only uploaded Media Library images can be inserted.");
markup='<figure class="admin-page-image"><img src="'+esc(parsed.pathname)+'" alt="'+esc(String(v.imageAlt||"").trim())+'" loading="lazy" decoding="async"></figure>';
}
html=html.replace(marker,"");
html=html.replace(/<\/h1>/i,"</h1>"+markup);
return html
}

const collectionKinds={projects:{heading:"Game project showcases",eyebrow:"SELECTED WORK"},social:{heading:"Social media previews",eyebrow:"FROM OUR CHANNELS"},brands:{heading:"Brand assets",eyebrow:"THE BRAND"}};
function collectionMarkup(kind,items){
const cfg=collectionKinds[kind],cards=items.map(item=>{
const image=esc(item.image),title=esc(item.title),description=esc(item.description),url=item.url?esc(item.url):"";
const body='<img src="'+image+'" alt="'+title+'" loading="lazy"><div class="showcase-card-copy"><h3>'+title+'</h3><p>'+description+'</p></div>';
return '<article class="showcase-card">'+(url?'<a href="'+url+'" target="_blank" rel="noopener">'+body+'</a>':body)+'</article>';
}).join("");
if(!items.length)return "<!-- ADMIN:"+kind+":START -->\n<!-- ADMIN:"+kind+":END -->";
return '<!-- ADMIN:'+kind+':START -->\n<section class="section showcase-section"><div class="container"><div class="section-heading"><div><p class="eyebrow">'+cfg.eyebrow+'</p><h2>'+cfg.heading+'</h2></div></div><div class="showcase-grid">'+cards+'</div></div></section>\n<!-- ADMIN:'+kind+':END -->';
}
async function gh(env,path,init={}){if(!env.GITHUB_TOKEN)throw Error("GitHub token not configured.");const r=await fetch("https://api.github.com"+path,{...init,headers:{authorization:"Bearer "+env.GITHUB_TOKEN,accept:"application/vnd.github+json","x-github-api-version":"2022-11-28","user-agent":"The-Red-Sparrow-Admin",...(init.headers||{})}});const t=await r.text();if(!r.ok)throw Error("GitHub API "+r.status+": "+t.slice(0,250));return t?JSON.parse(t):null}
const filePath=(env,p)=>"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO+"/contents/"+p.split("/").map(encodeURIComponent).join("/");
async function readFile(env,p,ref=env.GITHUB_BRANCH||"main"){const d=await gh(env,filePath(env,p)+"?ref="+encodeURIComponent(ref));return{sha:d.sha,content:dec(d.content)}}
async function writeFile(env,p,c,sha,msg){return gh(env,filePath(env,p),{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:msg,content:enc(c),sha,branch:env.GITHUB_BRANCH||"main"})})}
async function audit(env,email,action,detail){try{await env.DRAFTS.put("audit:"+Date.now()+":"+crypto.randomUUID(),JSON.stringify({email,action,detail,at:new Date().toISOString()}),{expirationTtl:15552000});return true}catch(error){console.error("Audit log write failed:",error?.message||error);return false}}
function normalizeMediaPath(value){try{const parsed=new URL(String(value||""),ORIGIN);if(parsed.origin!==ORIGIN)return "";const path=decodeURIComponent(parsed.pathname).replace(/^\//,"");return /^assets\/uploads\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp|gif)$/i.test(path)?path:""}catch{return ""}}

async function publishCollection(env,kind,items,actor="system"){
 if(!collectionKinds[kind]||!Array.isArray(items))throw Error("Invalid scheduled collection.");
 const path="index.html",old=await readFile(env,path),start="<!-- ADMIN:"+kind+":START -->",end="<!-- ADMIN:"+kind+":END -->",begin=old.content.indexOf(start),finish=old.content.indexOf(end,begin);
 if(begin<0||finish<0)throw Error("Homepage content markers are missing.");
 const next=old.content.slice(0,begin)+collectionMarkup(kind,items)+old.content.slice(finish+end.length);
 const out=await writeFile(env,path,next,old.sha,"Publish "+kind+" collection from "+actor);
 await env.DRAFTS.put("collection:"+kind,JSON.stringify(items),{expirationTtl:7776000});
 await env.DRAFTS.put("collection-published-at:"+kind,new Date().toISOString(),{expirationTtl:7776000});
 await audit(env,actor,"publish-collection",kind+":"+items.length);
 return out.commit?.sha||null;
}
const defaultSiteSettings={contactEmail:"admin@theredsparrow.online",directEmail:"hammad@theredsparrow.online",tagline:"Independent Unity game development.",announcementEnabled:false,announcement:""};
async function siteSettings(env){return {...defaultSiteSettings,...(await env.DRAFTS.get("site-settings:live","json")||{})}}
async function publishSiteSettings(env,v,actor){
 const values={contactEmail:String(v.contactEmail||"").trim(),directEmail:String(v.directEmail||"").trim(),tagline:String(v.tagline||"").trim(),announcementEnabled:!!v.announcementEnabled,announcement:String(v.announcement||"").trim()};
 for(const email of [values.contactEmail,values.directEmail])if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("Enter valid contact email addresses.");
 if(!values.tagline||values.tagline.length>120||values.announcement.length>180)throw Error("Tagline or announcement is outside its character limit.");
 const files=Object.values(FILES),commits=[];
 for(const path of files){
  const old=await readFile(env,path);let html=old.content;
  html=html.replaceAll("mailto:admin@theredsparrow.online","mailto:"+esc(values.contactEmail)).replaceAll("admin@theredsparrow.online",esc(values.contactEmail));
  html=html.replaceAll("mailto:hammad@theredsparrow.online","mailto:"+esc(values.directEmail)).replaceAll("hammad@theredsparrow.online",esc(values.directEmail));
  html=html.replaceAll("Independent Unity game development.",esc(values.tagline));
  const marker=/<!-- TRS-ANNOUNCEMENT:START -->[\s\S]*?<!-- TRS-ANNOUNCEMENT:END -->/g;
  html=html.replace(marker,"");
  if(values.announcementEnabled&&values.announcement){
   const bar='<!-- TRS-ANNOUNCEMENT:START --><aside class="trs-site-announcement" role="status" style="padding:10px 16px;text-align:center;background:#272027;color:#fff;font:600 13px/1.5 system-ui,sans-serif">'+esc(values.announcement)+'</aside><!-- TRS-ANNOUNCEMENT:END -->';
   html=html.replace(/(<body\b[^>]*>)/i,"$1"+bar);
  }
  if(html!==old.content){const out=await writeFile(env,path,html,old.sha,"Publish website settings from admin");commits.push(out.commit?.sha||null)}
 }
 await env.DRAFTS.put("site-settings:live",JSON.stringify(values),{expirationTtl:31536000});
 await audit(env,actor,"publish-site-settings","Updated shared website settings");
 return {published:true,files:commits.length,commits};
}
async function mediaUsage(env,p){
 const usedBy=[];
 for(const kind of Object.keys(collectionKinds))for(const key of ["collection:"+kind,"collection-draft:"+kind]){
  const items=await env.DRAFTS.get(key,"json")||[];if(items.some(item=>normalizeMediaPath(item.image)===p))usedBy.push(kind+" collection");
 }
 for(const slug of ["home","about","services","contact"]){const draft=await env.DRAFTS.get("draft:page:"+slug,"json");if(draft&&normalizeMediaPath(draft.image)===p)usedBy.push(slug+" page draft")}
 for(const slug of ["home","about","services","contact","privacy","terms"]){const draft=await env.DRAFTS.get("draft:seo:"+slug,"json");if(draft&&normalizeMediaPath(draft.ogImage)===p)usedBy.push(slug+" SEO draft")}
 for(const path of [...Object.values(FILES),"styles.css","og-image.svg","llms.txt"]){try{const file=await readFile(env,path);if(file.content.includes("/"+p)||file.content.includes(encodeURI("/"+p)))usedBy.push(path+" published page")}catch{}}
 return [...new Set(usedBy)];
}

const cookie=(v,max=28800)=>"trs_admin_session="+v+"; Path=/admin-api; Max-Age="+max+"; HttpOnly; Secure; SameSite=Lax";
function getCookie(req){return (req.headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("trs_admin_session="))?.slice(18)||""}
async function session(req,env){const token=getCookie(req);if(!token||!/^[a-f0-9-]{36}$/.test(token))return null;const s=await env.DRAFTS.get("session:"+token,"json");if(!s||s.login!=="hamadcheema")return null;return s}
async function run(req,env){const u=new URL(req.url),r=u.pathname.replace(/^\/admin-api\/?/,"");
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":ORIGIN,"access-control-allow-credentials":"true","access-control-allow-methods":"GET,POST,DELETE,OPTIONS","access-control-allow-headers":"content-type","vary":"Origin"}});
if(!["GET","HEAD"].includes(req.method)&&req.headers.get("origin")!==ORIGIN)return response({error:"Request origin not allowed."},403);
if(req.method==="GET"&&r==="auth/login"){if(!env.GITHUB_OAUTH_CLIENT_ID)return response({error:"GitHub OAuth app is not configured."},503);const state=crypto.randomUUID();await env.DRAFTS.put("oauth-state:"+state,"1",{expirationTtl:600});const q=new URLSearchParams({client_id:env.GITHUB_OAUTH_CLIENT_ID,redirect_uri:ORIGIN+API+"/auth/callback",scope:"read:user",state});return Response.redirect("https://github.com/login/oauth/authorize?"+q.toString(),302)}
if(req.method==="GET"&&r==="auth/callback"){const state=u.searchParams.get("state")||"",code=u.searchParams.get("code")||"";if(!state||!code||!await env.DRAFTS.get("oauth-state:"+state))return new Response("Invalid or expired login state.",{status:400});await env.DRAFTS.delete("oauth-state:"+state);const tokenRes=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"accept":"application/json","content-type":"application/json"},body:JSON.stringify({client_id:env.GITHUB_OAUTH_CLIENT_ID,client_secret:env.GITHUB_OAUTH_CLIENT_SECRET,code})});const tokenData=await tokenRes.json();if(!tokenRes.ok||!tokenData.access_token)return new Response("GitHub login failed.",{status:401});const userRes=await fetch("https://api.github.com/user",{headers:{authorization:"Bearer "+tokenData.access_token,accept:"application/vnd.github+json","user-agent":"The-Red-Sparrow-Admin"}});const user=await userRes.json();if(!userRes.ok||String(user.login).toLowerCase()!=="hamadcheema")return new Response("This GitHub account is not authorized.",{status:403});const sid=crypto.randomUUID();await env.DRAFTS.put("session:"+sid,JSON.stringify({login:user.login,id:user.id,created:Date.now()}),{expirationTtl:28800});return new Response(null,{status:302,headers:{location:ORIGIN+"/admin/", "set-cookie":cookie(sid),"cache-control":"no-store"}})}
if(req.method==="POST"&&r==="auth/logout"){const sid=getCookie(req);if(sid)await env.DRAFTS.delete("session:"+sid);return response({ok:true},200,{"set-cookie":cookie("",0)})}

if(req.method==="POST"&&r==="inquiries"){
 const b=await req.json(),name=String(b.name||"").trim(),email=String(b.email||"").trim(),subject=String(b.subject||"").trim(),message=String(b.message||"").trim();
 if(!b.consent||!name||name.length>80||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||subject.length>120||message.length<10||message.length>2000)return response({error:"Please complete the form with a valid email and a message of 10–2,000 characters."},400);
 const ip=req.headers.get("cf-connecting-ip")||"unknown",digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip)),ipKey=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join(""),rateKey="inquiry-rate:"+ipKey+":"+new Date().toISOString().slice(0,10),count=Number(await env.DRAFTS.get(rateKey)||"0");
 if(count>=3)return response({error:"Daily enquiry limit reached. Please try again tomorrow or email us directly."},429);
 await env.DRAFTS.put(rateKey,String(count+1),{expirationTtl:86400});
 const id=crypto.randomUUID(),item={id,name,email,subject:subject||"Website enquiry",message,createdAt:new Date().toISOString(),status:"new"};
 await env.DRAFTS.put("inquiry:"+id,JSON.stringify(item),{expirationTtl:7776000});
 return response({received:true,message:"Thank you. Your enquiry has been received."},201);
}

const who=await session(req,env);if(!who)return response({error:"Please sign in with the authorized GitHub account.",loginRequired:true},401);

if(req.method==="GET"&&r==="inquiries"){
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"inquiry:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 const all=(await Promise.all(keys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(x=>x&&x.status!=="deleted").sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
 const items=all.slice(0,100);
 return response({items,total:all.length,unread:all.filter(x=>x.status==="new").length,archived:all.filter(x=>x.status==="archived").length});
}
if(req.method==="GET"&&r==="inquiries/deleted"){
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"inquiry:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 const all=(await Promise.all(keys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(x=>x&&x.status==="deleted").sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));
 return response({items:all.slice(0,100),total:all.length});
}
if(req.method==="POST"&&r==="inquiries/update"){
 const b=await req.json(),id=String(b.id||""),state=String(b.state||"");if(!/^[a-f0-9-]{36}$/i.test(id)||!["read","archived"].includes(state))return response({error:"Invalid enquiry update."},400);
 const key="inquiry:"+id,item=await env.DRAFTS.get(key,"json");if(!item||item.status==="deleted")return response({error:"Enquiry not found."},404);item.status=state;item.updatedAt=new Date().toISOString();await env.DRAFTS.put(key,JSON.stringify(item),{expirationTtl:7776000});await audit(env,who.login,state==="archived"?"archive-inquiry":"mark-inquiry-read",id);return response({updated:true});
}
if(req.method==="POST"&&r==="inquiries/restore"){
 const b=await req.json(),id=String(b.id||"");if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid enquiry ID."},400);
 const key="inquiry:"+id,item=await env.DRAFTS.get(key,"json");if(!item||item.status!=="deleted")return response({error:"Deleted enquiry not found."},404);
 item.status=item.previousStatus&&["new","read","archived"].includes(item.previousStatus)?item.previousStatus:"read";delete item.previousStatus;delete item.deletedAt;item.updatedAt=new Date().toISOString();
 await env.DRAFTS.put(key,JSON.stringify(item),{expirationTtl:7776000});await audit(env,who.login,"restore-inquiry",id);return response({restored:true});
}
if(req.method==="POST"&&r==="inquiries/bulk"){
 const b=await req.json(),ids=Array.isArray(b.ids)?[...new Set(b.ids.map(String))]:[],action=String(b.action||"");
 if(!ids.length||ids.length>100||ids.some(id=>!/^[a-f0-9-]{36}$/i.test(id))||!["archive","delete","read"].includes(action))return response({error:"Choose up to 100 enquiries and a valid bulk action."},400);
 let changed=0;const now=new Date().toISOString();
 for(const id of ids){const key="inquiry:"+id,item=await env.DRAFTS.get(key,"json");if(!item||item.status==="deleted")continue;
  if(action==="delete"){item.previousStatus=item.status;item.status="deleted";item.deletedAt=now;await env.DRAFTS.put(key,JSON.stringify(item),{expirationTtl:2592000})}
  else{item.status=action==="archive"?"archived":"read";item.updatedAt=now;await env.DRAFTS.put(key,JSON.stringify(item),{expirationTtl:7776000})}
  changed++;
 }
 await audit(env,who.login,"bulk-"+action+"-inquiries",String(changed));return response({updated:changed,action});
}
if(req.method==="POST"&&r==="inquiries/purge"){
 const b=await req.json(),ids=Array.isArray(b.ids)?[...new Set(b.ids.map(String))]:[];
 if(!ids.length||ids.length>100||ids.some(id=>!/^[a-f0-9-]{36}$/i.test(id)))return response({error:"Choose up to 100 deleted enquiries."},400);
 let deleted=0;for(const id of ids){const key="inquiry:"+id,item=await env.DRAFTS.get(key,"json");if(item?.status==="deleted"){await env.DRAFTS.delete(key);deleted++}}
 await audit(env,who.login,"permanently-delete-inquiries",String(deleted));return response({deleted});
}
if(req.method==="DELETE"&&r==="inquiries"){
 const id=u.searchParams.get("id")||"";if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid enquiry ID."},400);
 const key="inquiry:"+id,item=await env.DRAFTS.get(key,"json");if(!item||item.status==="deleted")return response({error:"Enquiry not found."},404);
 item.previousStatus=item.status;item.status="deleted";item.deletedAt=new Date().toISOString();await env.DRAFTS.put(key,JSON.stringify(item),{expirationTtl:2592000});
 await audit(env,who.login,"delete-inquiry",id);return response({deleted:true,recoverable:true,retentionDays:30});
}
if(req.method==="GET"&&r==="dashboard"){
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"inquiry:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 const records=(await Promise.all(keys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(Boolean),active=records.filter(x=>x.status!=="deleted"),deleted=records.filter(x=>x.status==="deleted");
 const [projects,social,brands,auditPage]=await Promise.all(["projects","social","brands"].map(k=>env.DRAFTS.get("collection:"+k,"json")||[]).concat([env.DRAFTS.list({prefix:"audit:",limit:100})]));
 const recentKeys=auditPage.keys.sort((a,b)=>b.name.localeCompare(a.name)).slice(0,12);
 const recent=(await Promise.all(recentKeys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(Boolean).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 return response({inquiries:{total:active.length,unread:active.filter(x=>x.status==="new").length,archived:active.filter(x=>x.status==="archived").length,deleted:deleted.length},published:{projects:projects.length,social:social.length,brands:brands.length,total:projects.length+social.length+brands.length},recentActivity:recent});
}
if(req.method==="GET"&&r==="notifications"){
 const [inquiries,scheduled,auditPage]=await Promise.all([
  env.DRAFTS.list({prefix:"inquiry:",limit:100}),env.DRAFTS.list({prefix:"scheduled:",limit:100}),env.DRAFTS.list({prefix:"audit:",limit:100})
 ]);
 const all=await Promise.all(inquiries.keys.map(k=>env.DRAFTS.get(k.name,"json"))),events=await Promise.all(auditPage.keys.map(k=>env.DRAFTS.get(k.name,"json"))),jobs=await Promise.all(scheduled.keys.map(k=>env.DRAFTS.get(k.name,"json")));
 const items=[];
 all.filter(x=>x&&x.status==="new").forEach(x=>items.push({title:"New website enquiry",detail:x.subject+" · "+x.name,at:x.createdAt,href:"/admin/#inquiries"}));
 jobs.filter(x=>x&&x.status==="scheduled").forEach(x=>items.push({title:"Scheduled publication",detail:x.kind+" collection is due "+new Date(x.scheduledAt).toLocaleString(),at:x.createdAt,href:"/admin/#calendar"}));
 events.filter(Boolean).forEach(x=>items.push({title:String(x.action||"Admin event").replace(/-/g," "),detail:x.detail||"",at:x.at,href:"/admin/#audit"}));
 items.sort((a,b)=>String(b.at).localeCompare(String(a.at)));return response({items:items.slice(0,50)});
}
if(req.method==="GET"&&r==="system/health"){
 const checks=[];
 try{const site=await fetch(ORIGIN+"/",{method:"HEAD",redirect:"follow"});checks.push({label:"Public website",ok:site.ok,detail:"HTTP "+site.status+" · "+site.url})}catch(e){checks.push({label:"Public website",ok:false,detail:e.message})}
 try{const repo=await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO);checks.push({label:"GitHub repository",ok:!!repo.default_branch,detail:repo.full_name+" · "+repo.default_branch})}catch(e){checks.push({label:"GitHub repository",ok:false,detail:e.message})}
 try{const home=await readFile(env,"index.html");const markers=["<!-- ADMIN:projects:START -->","<!-- ADMIN:social:START -->","<!-- ADMIN:brands:START -->"];const missing=markers.filter(x=>!home.content.includes(x));checks.push({label:"Homepage content structure",ok:missing.length===0,detail:missing.length?"Missing "+missing.join(", "):"All showcase markers are present"})}catch(e){checks.push({label:"Homepage content structure",ok:false,detail:e.message})}
 try{await env.DRAFTS.put("health:probe",new Date().toISOString(),{expirationTtl:60});const probe=await env.DRAFTS.get("health:probe");checks.push({label:"Cloudflare KV storage",ok:!!probe,detail:probe?"Read/write test passed":"Read/write test failed"})}catch(e){checks.push({label:"Cloudflare KV storage",ok:false,detail:e.message})}
 try{await gh(env,filePath(env,"assets/uploads"));checks.push({label:"Media repository folder",ok:true,detail:"assets/uploads/ is accessible"})}catch(e){checks.push({label:"Media repository folder",ok:false,detail:e.message})}
 checks.push({label:"Admin authentication",ok:true,detail:"Authorized session verified"});
 return response({checks,checkedAt:new Date().toISOString()});
}
if(req.method==="POST"&&r==="preview/page"){
 const b=await req.json(),slug=String(b.slug||"");if(!["home","about","services","contact"].includes(slug))return response({error:"Page cannot be previewed here."},400);
 const old=await readFile(env,FILES[slug]),html=pagePatch(old.content,b);return response({html});
}
if(req.method==="GET"&&r==="media/usage"){
 const p=normalizeMediaPath(u.searchParams.get("path"));if(!p)return response({error:"Invalid media path."},400);
 const usedBy=await mediaUsage(env,p);return response({path:p,usedBy});
}
if(req.method==="GET"&&r==="security/sessions"){
 const sid=getCookie(req);let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"session:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 const items=(await Promise.all(keys.map(async k=>({key:k.name,session:await env.DRAFTS.get(k.name,"json")})))).filter(x=>x.session).map(x=>({created:x.session.created||null,current:x.key==="session:"+sid,login:x.session.login}));
 return response({items,total:items.length});
}
if(req.method==="POST"&&r==="security/revoke-sessions"){
 const sid=getCookie(req);let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"session:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 let revoked=0;for(const key of keys)if(key.name!=="session:"+sid){await env.DRAFTS.delete(key.name);revoked++}
 await audit(env,who.login,"revoke-sessions",String(revoked));return response({revoked});
}
if(req.method==="GET"&&r==="site-settings"){
 return response({settings:await siteSettings(env),draft:await env.DRAFTS.get("site-settings:draft","json")||null});
}
if(req.method==="POST"&&r==="site-settings"){
 const b=await req.json(),v={contactEmail:String(b.contactEmail||"").trim(),directEmail:String(b.directEmail||"").trim(),tagline:String(b.tagline||"").trim(),announcementEnabled:!!b.announcementEnabled,announcement:String(b.announcement||"").trim()};
 for(const email of [v.contactEmail,v.directEmail])if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response({error:"Enter valid contact email addresses."},400);
 if(!v.tagline||v.tagline.length>120||v.announcement.length>180)return response({error:"Tagline or announcement is outside its character limit."},400);
 await env.DRAFTS.put("site-settings:draft",JSON.stringify(v),{expirationTtl:7776000});await audit(env,who.login,"save-site-settings","Website settings draft");return response({saved:true,settings:v});
}
if(req.method==="POST"&&r==="publish/site-settings"){
 const draft=await env.DRAFTS.get("site-settings:draft","json");if(!draft)return response({error:"Save website settings before publishing."},400);
 const result=await publishSiteSettings(env,draft,who.login);await env.DRAFTS.delete("site-settings:draft");return response(result);
}
if(req.method==="GET"&&r==="schedule"){
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"scheduled:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 const items=(await Promise.all(keys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(x=>x&&["scheduled","failed","processing"].includes(x.status)).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
 return response({items});
}
if(req.method==="POST"&&r==="schedule"){
 const b=await req.json(),kind=String(b.kind||""),scheduledAt=Date.parse(String(b.scheduledAt||""));if(!collectionKinds[kind]||!Number.isFinite(scheduledAt)||scheduledAt<Date.now()+120000||scheduledAt>Date.now()+7776000000)return response({error:"Choose a valid collection and a time at least 2 minutes and no more than 90 days away."},400);
 const items=await env.DRAFTS.get("collection-draft:"+kind,"json")||await env.DRAFTS.get("collection:"+kind,"json")||[];if(!Array.isArray(items)||!items.length)return response({error:"Save at least one item in this collection before scheduling it."},400);
 const id=crypto.randomUUID(),job={id,kind,items,scheduledAt:new Date(scheduledAt).toISOString(),createdAt:new Date().toISOString(),createdBy:who.login,status:"scheduled"};
 await env.DRAFTS.put("scheduled:"+scheduledAt+":"+id,JSON.stringify(job),{expirationTtl:7776000});await audit(env,who.login,"schedule-publication",kind+":"+job.scheduledAt);return response({scheduled:true,id,scheduledAt:job.scheduledAt});
}
if(req.method==="DELETE"&&r==="schedule"){
 const id=u.searchParams.get("id")||"";if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid schedule ID."},400);
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"scheduled:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);for(const key of keys){const job=await env.DRAFTS.get(key.name,"json");if(job?.id===id){if(job.status!=="scheduled")return response({error:"Only pending publications can be cancelled."},409);await env.DRAFTS.delete(key.name);await audit(env,who.login,"cancel-scheduled-publication",job.kind);return response({cancelled:true})}}
 return response({error:"Scheduled publication not found."},404);
}
if(req.method==="POST"&&r==="schedule/retry"){
 const b=await req.json(),id=String(b.id||"");if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid schedule ID."},400);
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"scheduled:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 for(const key of keys){const job=await env.DRAFTS.get(key.name,"json");if(job?.id!==id)continue;if(job.status!=="failed")return response({error:"Only failed publications can be retried."},409);job.status="scheduled";job.scheduledAt=new Date(Date.now()+120000).toISOString();job.retriedAt=new Date().toISOString();delete job.error;delete job.processingAt;await env.DRAFTS.put(key.name,JSON.stringify(job),{expirationTtl:7776000});await audit(env,who.login,"retry-scheduled-publication",job.kind);return response({scheduled:true,scheduledAt:job.scheduledAt})}
 return response({error:"Scheduled publication not found."},404);
}

if(req.method==="GET"&&r==="status"){let connected=false,msg="GitHub token not configured";if(env.GITHUB_TOKEN)try{await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO);connected=true;msg="Repository access verified"}catch(e){msg=e.message}return response({ok:true,admin:who.login,githubConnected:connected,githubMessage:msg})}
if(req.method==="GET"&&r==="settings"){let connected=false,message="GitHub token not configured";if(env.GITHUB_TOKEN)try{await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO);connected=true;message="Repository access verified"}catch(e){message=e.message}return response({admin:who.login,repository:env.GITHUB_OWNER+"/"+env.GITHUB_REPO,branch:env.GITHUB_BRANCH||"main",sessionCreated:who.created||null,sessionExpires:who.created?who.created+28800000:null,githubConnected:connected,githubMessage:message})}
if(req.method==="GET"&&r==="audit"){let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"audit:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);const latest=keys.sort((a,b)=>b.name.localeCompare(a.name)).slice(0,50);const entries=await Promise.all(latest.map(item=>env.DRAFTS.get(item.name,"json")));return response({events:entries.filter(Boolean).sort((a,b)=>String(b.at).localeCompare(String(a.at)))})}
if(req.method==="GET"&&r==="media/list"){let items=[];try{const data=await gh(env,filePath(env,"assets/uploads"));items=data.filter(x=>x.type==="file"&&/\.(png|jpe?g|webp|gif)$/i.test(x.name)).map(x=>({name:x.name,path:x.path,size:x.size,url:x.download_url||("https://raw.githubusercontent.com/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO+"/"+(env.GITHUB_BRANCH||"main")+"/"+x.path),siteUrl:ORIGIN+"/"+x.path,previewUrl:ORIGIN+"/"+x.path+"?v="+x.sha,githubUrl:x.html_url})).sort((a,b)=>b.name.localeCompare(a.name))}catch(e){if(!String(e.message).includes("GitHub API 404"))throw e}return response({items})}
if((req.method==="GET"||req.method==="DELETE")&&r==="draft"){const k=u.searchParams.get("key")||"";if(!/^(page|seo):(home|about|services|contact|privacy|terms)$/.test(k))return response({error:"Invalid draft key."},400);if(req.method==="DELETE"){await env.DRAFTS.delete("draft:"+k);await audit(env,who.login,"reset-draft",k);return response({deleted:true,key:k})}return response({draft:await env.DRAFTS.get("draft:"+k,"json")})}
if(req.method==="POST"&&r==="draft"){const b=await req.json(),k=String(b.key||"");if(!/^(page|seo):(home|about|services|contact|privacy|terms)$/.test(k)||!b.value||typeof b.value!=="object")return response({error:"Invalid draft."},400);await env.DRAFTS.put("draft:"+k,JSON.stringify(b.value),{expirationTtl:7776000});await audit(env,who.login,"save-draft",k);return response({saved:true})}
if(req.method==="POST"&&r==="publish/page"){const b=await req.json(),slug=b.slug;if(!["home","about","services","contact"].includes(slug))return response({error:"Page cannot be edited here."},400);const p=FILES[slug],old=await readFile(env,p),next=pagePatch(old.content,b),out=await writeFile(env,p,next,old.sha,"Update "+slug+" content from admin");await audit(env,who.login,"publish-page",slug);return response({published:true,path:p,commit:out.commit?.sha||null})}
if(req.method==="POST"&&r==="publish/seo"){const b=await req.json(),slug=b.slug;if(!FILES[slug])return response({error:"Invalid page."},400);const p=FILES[slug],old=await readFile(env,p),next=seoPatch(old.content,b),out=await writeFile(env,p,next,old.sha,"Update "+slug+" SEO metadata from admin");await audit(env,who.login,"publish-seo",slug);return response({published:true,path:p,commit:out.commit?.sha||null})}
if(req.method==="POST"&&r==="media/upload"){const b=await req.json(),name=String(b.name||"").normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(0,80),type=String(b.type||""),raw=String(b.base64||"").replace(/^data:[^,]+;base64,/,"");if(!name||!["image/png","image/jpeg","image/webp","image/gif"].includes(type)||!raw||raw.length>7000000)return response({error:"Unsupported image or file exceeds 5 MB."},400);const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));if(bytes.length>5242880)return response({error:"Image exceeds 5 MB."},400);const sig={"image/png":[137,80,78,71,13,10,26,10],"image/jpeg":[255,216,255],"image/gif":[71,73,70,56],"image/webp":[82,73,70,70]}[type];if(!sig.every((v,i)=>bytes[i]===v)||(type==="image/webp"&&String.fromCharCode(...bytes.slice(8,12))!=="WEBP"))return response({error:"Image signature does not match its file type."},400);const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"}[type],cleanName=name.replace(/\.[^.]+$/,"")+"."+ext,folder=await gh(env,filePath(env,"assets/uploads"));const existing=Array.isArray(folder)?folder.filter(x=>x.type==="file"):[];if(existing.some(x=>x.name.toLowerCase()===cleanName.toLowerCase()||x.name.toLowerCase().endsWith("-"+cleanName.toLowerCase())))return response({error:"A file with this name already exists in Uploaded images. Rename the new file or delete the existing image first.",code:"FILENAME_EXISTS"},409);const prefix=new TextEncoder().encode("blob "+bytes.length+"\0"),blob=new Uint8Array(prefix.length+bytes.length);blob.set(prefix);blob.set(bytes,prefix.length);const digest=await crypto.subtle.digest("SHA-1",blob),gitSha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");if(existing.some(x=>x.sha===gitSha))return response({error:"This exact image is already uploaded under another filename. It was not uploaded again.",code:"DUPLICATE_IMAGE"},409);const p="assets/uploads/"+Date.now()+"-"+cleanName,out=await gh(env,filePath(env,p),{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Add media asset from admin",content:raw,branch:env.GITHUB_BRANCH||"main"})});await audit(env,who.login,"upload-media",p);return response({uploaded:true,path:p,url:ORIGIN+"/"+p,commit:out.commit?.sha||null})}

if(req.method==="POST"&&r==="media/delete"){const b=await req.json(),p=normalizeMediaPath(b.path);if(!p)return response({error:"Invalid media path."},400);const usedBy=[];for(const kind of Object.keys(collectionKinds)){for(const key of ["collection:"+kind,"collection-draft:"+kind]){const items=await env.DRAFTS.get(key,"json")||[];if(items.some(item=>normalizeMediaPath(item.image)===p))usedBy.push(kind+" collection")}}for(const slug of ["home","about","services","contact"]){const draft=await env.DRAFTS.get("draft:page:"+slug,"json");if(draft&&normalizeMediaPath(draft.image)===p)usedBy.push(slug+" page draft")}for(const slug of ["home","about","services","contact","privacy","terms"]){const draft=await env.DRAFTS.get("draft:seo:"+slug,"json");if(draft&&normalizeMediaPath(draft.ogImage)===p)usedBy.push(slug+" SEO draft")}const pages=await Promise.all([...Object.values(FILES),"styles.css","og-image.svg","llms.txt"].map(async path=>({path,content:(await readFile(env,path)).content})));for(const page of pages){if(page.content.includes("/"+p)||page.content.includes(encodeURI("/"+p)))usedBy.push(page.path+" published page")}if(usedBy.length)return response({error:"This image is still referenced by: "+[...new Set(usedBy)].join(", ")+". Remove or replace those references before deleting."},409);const current=await gh(env,filePath(env,p));if(!current||!current.sha)return response({error:"Media file not found."},404);const out=await gh(env,filePath(env,p),{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Delete unused media asset from admin",sha:current.sha,branch:env.GITHUB_BRANCH||"main"})});await audit(env,who.login,"delete-media",p);return response({deleted:true,path:p,commit:out.commit?.sha||null})}
if(req.method==="GET"&&r==="content"){const kind=u.searchParams.get("kind")||"";if(!collectionKinds[kind])return response({error:"Invalid content collection."},400);const publishedItems=await env.DRAFTS.get("collection:"+kind,"json")||[],draft=await env.DRAFTS.get("collection-draft:"+kind,"json");return response({items:draft||publishedItems,publishedItems,draft:!!draft,publishedAt:await env.DRAFTS.get("collection-published-at:"+kind)})}
if(req.method==="POST"&&r==="content"){const b=await req.json(),kind=String(b.kind||"");if(!collectionKinds[kind]||!Array.isArray(b.items)||b.items.length>30)return response({error:"Invalid content collection."},400);const items=[];for(const raw of b.items){const title=String(raw.title||"").trim(),description=String(raw.description||"").trim(),image=String(raw.image||"").trim(),url=String(raw.url||"").trim();if(!title||title.length>80||!description||description.length>300)return response({error:"Each item needs a title (80 characters max) and description (300 characters max)."},400);let parsed;try{parsed=new URL(image)}catch{return response({error:"Choose an image from the Media Library."},400)}if(parsed.origin!==ORIGIN||!parsed.pathname.startsWith("/assets/uploads/")||! /\.(png|jpe?g|webp|gif)$/i.test(parsed.pathname))return response({error:"Images must come from assets/uploads in the Media Library."},400);if(url){let target;try{target=new URL(url)}catch{return response({error:"Links must be valid HTTPS URLs."},400)}if(target.protocol!=="https:")return response({error:"Links must use HTTPS."},400)}items.push({title,description,image:parsed.pathname,url})}await env.DRAFTS.put("collection-draft:"+kind,JSON.stringify(items),{expirationTtl:7776000});await audit(env,who.login,"save-collection",kind+":"+items.length);return response({saved:true,count:items.length})}
if(req.method==="POST"&&r==="publish/content"){const b=await req.json(),kind=String(b.kind||"");if(!collectionKinds[kind])return response({error:"Invalid content collection."},400);const items=await env.DRAFTS.get("collection-draft:"+kind,"json")||await env.DRAFTS.get("collection:"+kind,"json")||[],path="index.html",old=await readFile(env,path),start="<!-- ADMIN:"+kind+":START -->",end="<!-- ADMIN:"+kind+":END -->",begin=old.content.indexOf(start),finish=old.content.indexOf(end,begin);if(begin<0||finish<0)return response({error:"Homepage content markers are missing. Please contact the administrator."},500);const next=old.content.slice(0,begin)+collectionMarkup(kind,items)+old.content.slice(finish+end.length),out=await writeFile(env,path,next,old.sha,"Publish "+kind+" collection from admin");try{await env.DRAFTS.put("collection:"+kind,JSON.stringify(items),{expirationTtl:7776000});await env.DRAFTS.put("collection-published-at:"+kind,new Date().toISOString(),{expirationTtl:7776000})}catch(error){console.error("Published collection snapshot update failed:",error?.message||error)}await audit(env,who.login,"publish-collection",kind+":"+items.length);return response({published:true,count:items.length,commit:out.commit?.sha||null})}
if(req.method==="GET"&&r==="history"){const p=u.searchParams.get("path")||"";if(!Object.values(FILES).includes(p))return response({error:"Path not allowed."},400);const c=await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO+"/commits?path="+encodeURIComponent(p)+"&per_page=12");return response({history:c.map(x=>({sha:x.sha,message:x.commit.message,date:x.commit.author?.date||x.commit.committer?.date}))})}
if(req.method==="POST"&&r==="rollback"){const b=await req.json(),p=String(b.path||""),sha=String(b.sha||"");if(!Object.values(FILES).includes(p)||!/^[a-f0-9]{40}$/.test(sha))return response({error:"Invalid rollback request."},400);const previous=await readFile(env,p,sha),current=await readFile(env,p),out=await writeFile(env,p,previous.content,current.sha,"Restore "+p+" from "+sha.slice(0,7));await audit(env,who.login,"rollback",p+":"+sha);return response({restored:true,commit:out.commit?.sha||null})}
return response({error:"Not found."},404)}
export default {async fetch(req,env){try{return await run(req,env)}catch(e){console.error(JSON.stringify({message:"admin request failed",error:e?.message||String(e),path:new URL(req.url).pathname}));return response({error:e?.message||"Unexpected server error."},500)}},
 async scheduled(controller,env){
  let inquiryCursor,deletedKeys=[];do{const page=await env.DRAFTS.list({prefix:"inquiry:",limit:1000,...(inquiryCursor?{cursor:inquiryCursor}:{})});deletedKeys.push(...page.keys);inquiryCursor=page.list_complete?null:page.cursor}while(inquiryCursor);
  const cutoff=Date.now()-30*24*60*60*1000;
  for(const key of deletedKeys){const item=await env.DRAFTS.get(key.name,"json");if(item?.status==="deleted"&&Date.parse(item.deletedAt||0)<=cutoff)await env.DRAFTS.delete(key.name)}
  let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"scheduled:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
  for(const key of keys){
   const job=await env.DRAFTS.get(key.name,"json");
   if(!job)continue;
   const staleProcessing=job.status==="processing"&&Date.now()-Date.parse(job.processingAt||job.scheduledAt)>900000;
   if(staleProcessing)job.status="scheduled";
   if(job.status!=="scheduled"||Date.parse(job.scheduledAt)>Date.now())continue;
   job.status="processing";job.processingAt=new Date().toISOString();await env.DRAFTS.put(key.name,JSON.stringify(job),{expirationTtl:7776000});
   try{const commit=await publishCollection(env,job.kind,job.items,"scheduled-publisher");job.status="published";job.publishedAt=new Date().toISOString();job.commit=commit;delete job.processingAt;await env.DRAFTS.put(key.name,JSON.stringify(job),{expirationTtl:7776000})}
   catch(error){job.status="failed";delete job.processingAt;job.error=String(error?.message||error).slice(0,300);await env.DRAFTS.put(key.name,JSON.stringify(job),{expirationTtl:7776000});console.error(JSON.stringify({message:"scheduled publication failed",id:job.id,error:job.error}))}
  }
 }
};
