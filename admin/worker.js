const ORIGIN="https://theredsparrow.online";
const API="/admin-api";
const FILES={home:"index.html",about:"about.html",services:"services.html",contact:"contact.html",privacy:"privacy.html",terms:"terms.html"};
const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":ORIGIN,"access-control-allow-credentials":"true","vary":"Origin",...headers}});
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const readJson=async req=>{try{return await req.json()}catch{throw new HttpError(400,"Invalid JSON body.")}};
const EMAIL=/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function enc(s){const b=new TextEncoder().encode(s);let x="";for(let i=0;i<b.length;i+=8192)x+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(x)}
function dec(s){return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)))}
async function hmacHex(secret,value){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value));return [...new Uint8Array(signature)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function meta(html,attr,key,value){const tags=html.match(/<meta\b[^>]*>/gi)||[];const old=tags.find(t=>t.includes(attr+'="'+key+'"'));const tag='<meta '+attr+'="'+key+'" content="'+esc(value)+'">';return old?html.replace(old,()=>tag):html.replace(/<\/head>/i,()=>"  "+tag+"\n</head>")}
function link(html,rel,value){const tags=html.match(/<link\b[^>]*>/gi)||[];const old=tags.find(t=>/rel="canonical"/i.test(t));const tag='<link rel="'+rel+'" href="'+esc(value)+'">';return old?html.replace(old,()=>tag):html.replace(/<\/head>/i,()=>"  "+tag+"\n</head>")}
function seoPatch(html,v){for(const [x,max,label] of [[v.title,70,"title"],[v.description,180,"description"],[v.ogTitle||v.title,70,"social title"],[v.ogDescription||v.description,200,"social description"],[v.ogImageAlt||"",200,"social image description"]])if((!x&&label!=="social image description")||String(x).length>max)throw Error("Invalid "+label+".");for(const x of [v.canonical,v.ogImage]){let u;try{u=new URL(x)}catch{throw new HttpError(400,"Enter valid website URLs.")}if(u.protocol!=="https:"||u.hostname!=="theredsparrow.online"||u.username||u.password)throw new HttpError(400,"URLs must use HTTPS on theredsparrow.online.")}html=html.replace(/<title>[\s\S]*?<\/title>/i,()=>"<title>"+esc(v.title)+"</title>");html=meta(html,"name","description",v.description);html=link(html,"canonical",v.canonical);for(const [a,k,val] of [["property","og:title",v.ogTitle||v.title],["property","og:description",v.ogDescription||v.description],["property","og:url",v.canonical],["property","og:image",v.ogImage],["name","twitter:title",v.ogTitle||v.title],["name","twitter:description",v.ogDescription||v.description],["name","twitter:image",v.ogImage],["property","og:image:alt",v.ogImageAlt||v.ogTitle||v.title],["name","twitter:image:alt",v.ogImageAlt||v.ogTitle||v.title]])html=meta(html,a,k,val);return html}
function headingMarkup(value){return String(value).split(/\r?\n/).map(line=>esc(line).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>")).join("<br>")}
function pagePatch(html,v){
for(const [x,max,optional] of [[v.title,70,false],[v.description,180,false],[v.heading,100,false],[v.intro,500,false],[v.imageAlt||"",160,true]])if((!optional&&!x)||String(x).length>max)throw Error("Complete all fields within their character limits.");
html=html.replace(/<title>[\s\S]*?<\/title>/i,()=>"<title>"+esc(v.title)+"</title>");
html=meta(html,"name","description",v.description);
html=html.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i,(_,open,close)=>open+headingMarkup(v.heading)+close);
html=html.replace(/(<p\s+class="hero-copy"[^>]*>)[\s\S]*?(<\/p>)/i,(_,open,close)=>open+esc(v.intro)+close);
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
function cleanCollectionItems(raw){if(!Array.isArray(raw)||raw.length>30)throw new HttpError(400,"Invalid content collection.");const items=[];for(const item of raw){const title=String(item?.title||"").trim(),description=String(item?.description||"").trim(),image=normalizeMediaPath(item?.image),url=String(item?.url||"").trim();if(!title||title.length>80||!description||description.length>300||!image)throw new HttpError(400,"Each item needs a valid image, title (80 characters max) and description (300 characters max).");let safeUrl="";if(url){let target;try{target=new URL(url)}catch{throw new HttpError(400,"Links must be valid HTTPS URLs.")}if(target.protocol!=="https:")throw new HttpError(400,"Links must use HTTPS.");safeUrl=target.href}const id=String(item?.id||"");items.push({id:/^[a-f0-9-]{36}$/i.test(id)?id:crypto.randomUUID(),title,description,image,url:safeUrl})}return items}
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
function base64Bytes(bytes){let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
function stripGifComments(bytes){let i=13,out=[...bytes.subarray(0,13)];if(bytes[10]&0x80){const size=3*(1<<((bytes[10]&7)+1));if(i+size>bytes.length)throw Error("Invalid GIF color table");out.push(...bytes.subarray(i,i+size));i+=size}while(i<bytes.length){const marker=bytes[i++];if(marker===0x3b){out.push(marker);return new Uint8Array(out)}if(marker===0x21){if(i>=bytes.length)throw Error("Invalid GIF extension");const label=bytes[i++],start=i;while(i<bytes.length){const n=bytes[i++];if(!n)break;if(i+n>bytes.length)throw Error("Invalid GIF extension data");i+=n}if(i>bytes.length||bytes[i-1]!==0)throw Error("Invalid GIF extension terminator");if(label!==0xfe)out.push(0x21,label,...bytes.subarray(start,i));continue}if(marker===0x2c){const start=i;if(i+9>bytes.length)throw Error("Invalid GIF image descriptor");const packed=bytes[i+8];i+=9;if(packed&0x80){const size=3*(1<<((packed&7)+1));if(i+size>bytes.length)throw Error("Invalid GIF local color table");i+=size}if(i>=bytes.length)throw Error("Invalid GIF image data");i++;while(i<bytes.length){const n=bytes[i++];if(!n)break;if(i+n>bytes.length)throw Error("Invalid GIF image data");i+=n}if(i>bytes.length||bytes[i-1]!==0)throw Error("Invalid GIF image terminator");out.push(0x2c,...bytes.subarray(start,i));continue}throw Error("Invalid GIF block")}throw Error("GIF trailer missing")}
function stripImageMetadata(bytes,type){
 if(type==="image/jpeg"){if(bytes[0]!==255||bytes[1]!==216)throw Error("Invalid JPEG");const out=[255,216];let i=2;while(i<bytes.length){const start=i;if(bytes[i++]!==255)throw Error("Invalid JPEG marker");while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===0xda){if(i+2>bytes.length)throw Error("Invalid JPEG scan");const len=(bytes[i]<<8)|bytes[i+1];if(len<2||i+len>bytes.length)throw Error("Invalid JPEG scan header");out.push(...bytes.subarray(start,i+len),...bytes.subarray(i+len));return new Uint8Array(out)}if(marker===0xd9||marker===0x01||(marker>=0xd0&&marker<=0xd7)){out.push(...bytes.subarray(start,i));if(marker===0xd9)return new Uint8Array(out);continue}if(i+2>bytes.length)throw Error("Invalid JPEG segment");const len=(bytes[i]<<8)|bytes[i+1];if(len<2||i+len>bytes.length)throw Error("Invalid JPEG segment length");if(marker!==0xe1&&marker!==0xed&&marker!==0xfe)out.push(...bytes.subarray(start,i+len));i+=len}return new Uint8Array(out)}
 if(type==="image/png"){const signature=[137,80,78,71,13,10,26,10];if(!signature.every((v,i)=>bytes[i]===v))throw Error("Invalid PNG");const out=[...bytes.subarray(0,8)];let i=8,ended=false;while(i+12<=bytes.length){const start=i,len=(bytes[i]*0x1000000)+(bytes[i+1]<<16)+(bytes[i+2]<<8)+bytes[i+3],typeName=String.fromCharCode(...bytes.subarray(i+4,i+8)),end=i+12+len;if(end>bytes.length)throw Error("Invalid PNG chunk");if(!["eXIf","tEXt","zTXt","iTXt"].includes(typeName))out.push(...bytes.subarray(start,end));i=end;if(typeName==="IEND"){ended=true;break}}if(!ended)throw Error("PNG end chunk missing");return new Uint8Array(out)}
 if(type==="image/webp"){if(String.fromCharCode(...bytes.subarray(0,4))!=="RIFF"||String.fromCharCode(...bytes.subarray(8,12))!=="WEBP")throw Error("Invalid WebP");const out=[...bytes.subarray(0,12)];let i=12,hasExif=false,hasXmp=false;while(i+8<=bytes.length){const start=i,name=String.fromCharCode(...bytes.subarray(i,i+4)),len=bytes[i+4]|(bytes[i+5]<<8)|(bytes[i+6]<<16)|(bytes[i+7]<<24),end=i+8+len+(len&1);if(end>bytes.length)throw Error("Invalid WebP chunk");if(name==="EXIF"||name==="XMP "){i=end;continue}if(name==="VP8X"&&len>=1){const chunk=bytes.slice(start,end);chunk[8]&=~0x0c;out.push(...chunk)}else out.push(...bytes.subarray(start,end));i=end}if(i!==bytes.length)throw Error("Invalid WebP chunk padding");const result=new Uint8Array(out);const size=result.length-8;result[4]=size&255;result[5]=(size>>>8)&255;result[6]=(size>>>16)&255;result[7]=(size>>>24)&255;return result}
 if(type==="image/gif")return stripGifComments(bytes);
 throw Error("Unsupported image type")
}

async function publishCollection(env,kind,items,actor="system",options={}){
 if(!collectionKinds[kind]||!Array.isArray(items))throw Error("Invalid scheduled collection.");
 items=cleanCollectionItems(items);
 for(const item of items){const mediaPath=item.image;try{await gh(env,filePath(env,mediaPath))}catch{throw new HttpError(400,"Image is missing for "+String(item.title||"a collection item")+": "+mediaPath)}}
 const previousItems=await env.DRAFTS.get("collection:"+kind,"json")||[];
 const path="index.html",old=await readFile(env,path),start="<!-- ADMIN:"+kind+":START -->",end="<!-- ADMIN:"+kind+":END -->",begin=old.content.indexOf(start),finish=old.content.indexOf(end,begin);
 if(begin<0||finish<0)throw Error("Homepage content markers are missing.");
 const next=old.content.slice(0,begin)+collectionMarkup(kind,items)+old.content.slice(finish+end.length);
 const out=await writeFile(env,path,next,old.sha,"Publish "+kind+" collection from "+actor);
 if(Array.isArray(previousItems)&&previousItems.length&&JSON.stringify(previousItems)!==JSON.stringify(items)){const id=crypto.randomUUID(),snapshot={id,kind,items:previousItems,count:previousItems.length,deletedAt:new Date().toISOString()};await env.DRAFTS.put("trash:content:"+id,JSON.stringify(snapshot),{expirationTtl:604800})}
 await env.DRAFTS.put("collection:"+kind,JSON.stringify(items));
 await env.DRAFTS.put("collection-published-at:"+kind,new Date().toISOString());
 if(options.clearDraft!==false)await env.DRAFTS.delete("collection-draft:"+kind);
 await audit(env,actor,"publish-collection",kind+":"+items.length);
 return out.commit?.sha||null;
}
const defaultSiteSettings={contactEmail:"admin@theredsparrow.online",directEmail:"hammad@theredsparrow.online",tagline:"Independent Unity game development.",announcementEnabled:false,announcement:""};
async function siteSettings(env){return {...defaultSiteSettings,...(await env.DRAFTS.get("site-settings:live","json")||{})}}
async function writeFilesAtomic(env,files,message){
 const owner=env.GITHUB_OWNER,repo=env.GITHUB_REPO,branch=env.GITHUB_BRANCH||"main",base="/repos/"+owner+"/"+repo+"/git/";
 const refPath=base+"ref/heads/"+encodeURIComponent(branch),ref=await gh(env,refPath),parentSha=ref?.object?.sha;if(!parentSha)throw Error("Could not resolve the publishing branch.");
 const parent=await gh(env,base+"commits/"+parentSha),baseTree=parent?.tree?.sha;if(!baseTree)throw Error("Could not read the current repository tree.");
 const blobs=await Promise.all(files.map(async file=>{const blob=await gh(env,base+"blobs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({content:file.content,encoding:"utf-8"})});return {path:file.path,mode:"100644",type:"blob",sha:blob.sha}}));
 const tree=await gh(env,base+"trees",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({base_tree:baseTree,tree:blobs})});
 const commit=await gh(env,base+"commits",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message,tree:tree.sha,parents:[parentSha]})});
 const latest=await gh(env,refPath);if(latest?.object?.sha!==parentSha)throw Error("The repository changed during publishing. Nothing was overwritten; please retry.");
 await gh(env,base+"refs/heads/"+encodeURIComponent(branch),{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({sha:commit.sha,force:false})});return commit.sha;
}
async function publishSiteSettings(env,v,actor){
 const previous=await siteSettings(env);
 const values={contactEmail:String(v.contactEmail||"").trim(),directEmail:String(v.directEmail||"").trim(),tagline:String(v.tagline||"").trim(),announcementEnabled:!!v.announcementEnabled,announcement:String(v.announcement||"").trim()};
 for(const email of [values.contactEmail,values.directEmail])if(email.length>254||!EMAIL.test(email))throw Error("Enter valid contact email addresses.");
 if(!values.tagline||values.tagline.length>120||values.announcement.length>180)throw Error("Tagline or announcement is outside its character limit.");
 const files=[];
 for(const path of [...Object.values(FILES),"llms.txt"]){
  const old=await readFile(env,path);let html=old.content;
  if(path==="llms.txt"){
   html=html.replaceAll(previous.contactEmail,values.contactEmail).replaceAll(previous.directEmail,values.directEmail).replaceAll(previous.tagline,values.tagline);
   if(html!==old.content)files.push({path,content:html});
   continue;
  }
  html=html.replaceAll("mailto:"+previous.contactEmail,"mailto:"+esc(values.contactEmail)).replaceAll(previous.contactEmail,esc(values.contactEmail));
  html=html.replaceAll("mailto:"+previous.directEmail,"mailto:"+esc(values.directEmail)).replaceAll(previous.directEmail,esc(values.directEmail));
  html=html.replaceAll(previous.tagline,esc(values.tagline));
  const marker=/<!-- TRS-ANNOUNCEMENT:START -->[\s\S]*?<!-- TRS-ANNOUNCEMENT:END -->/g;html=html.replace(marker,"");
  if(values.announcementEnabled&&values.announcement){const bar='<!-- TRS-ANNOUNCEMENT:START --><aside class="trs-site-announcement" role="status">'+esc(values.announcement)+'</aside><!-- TRS-ANNOUNCEMENT:END -->';const skip=/(<a\b[^>]*class="skip-link"[^>]*>[\s\S]*?<\/a>)/i;if(skip.test(html))html=html.replace(skip,(_,anchor)=>anchor+bar);else html=html.replace(/(<body\b[^>]*>)/i,(_,body)=>body+bar)}
  if(html!==old.content)files.push({path,content:html});
 }
 const commit=files.length?await writeFilesAtomic(env,files,"Publish shared website settings from admin"):null;
 await env.DRAFTS.put("site-settings:live",JSON.stringify(values));await audit(env,actor,"publish-site-settings","Updated shared website settings");return {published:true,files:files.length,commit};
}
async function mediaUsage(env,p){
 const usedBy=[];
 for(const kind of Object.keys(collectionKinds))for(const key of ["collection:"+kind,"collection-draft:"+kind]){
  const items=await env.DRAFTS.get(key,"json")||[];if(items.some(item=>normalizeMediaPath(item.image)===p))usedBy.push(kind+" collection");
 }
 for(const slug of ["home","about","services","contact"]){const draft=await env.DRAFTS.get("draft:page:"+slug,"json");if(draft&&normalizeMediaPath(draft.image)===p)usedBy.push(slug+" page draft")}
 for(const slug of ["home","about","services","contact","privacy","terms"]){const draft=await env.DRAFTS.get("draft:seo:"+slug,"json");if(draft&&normalizeMediaPath(draft.ogImage)===p)usedBy.push(slug+" SEO draft")}
 const schedules=await env.DRAFTS.list({prefix:"scheduled:",limit:1000});for(const key of schedules.keys){const job=await env.DRAFTS.get(key.name,"json");if(job?.items?.some(item=>normalizeMediaPath(item.image)===p))usedBy.push("scheduled "+job.kind+" collection")}
 for(const path of [...Object.values(FILES),"styles.css","og-image.svg","llms.txt"]){try{const file=await readFile(env,path);if(file.content.includes("/"+p)||file.content.includes(encodeURI("/"+p)))usedBy.push(path+" published page")}catch{}}
 return [...new Set(usedBy)];
}

const cookie=(v,max=28800)=>"trs_admin_session="+v+"; Path=/admin-api; Max-Age="+max+"; HttpOnly; Secure; SameSite=Lax";
const oauthCookie=(v,max=600)=>"trs_oauth_browser="+v+"; Path=/admin-api; Max-Age="+max+"; HttpOnly; Secure; SameSite=Lax";
function getNamedCookie(req,name){const prefix=name+"=";return (req.headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(prefix))?.slice(prefix.length)||""}
function getCookie(req){return getNamedCookie(req,"trs_admin_session")}
async function session(req,env){const token=getCookie(req);if(!token||!/^[a-f0-9-]{36}$/.test(token))return null;const s=await env.DRAFTS.get("session:"+token,"json");const allowed=String(env.ALLOWED_GITHUB_LOGIN||"hamadcheema").trim().toLowerCase();if(!s||String(s.login||"").toLowerCase()!==allowed)return null;return s}
async function run(req,env){const u=new URL(req.url),r=u.pathname.replace(/^\/admin-api\/?/,"");
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":ORIGIN,"access-control-allow-credentials":"true","access-control-allow-methods":"GET,POST,DELETE,OPTIONS","access-control-allow-headers":"content-type","vary":"Origin"}});
if(!["GET","HEAD"].includes(req.method)&&req.headers.get("origin")!==ORIGIN)return response({error:"Request origin not allowed."},403);
if(req.method==="GET"&&r==="auth/login"){if(!env.GITHUB_OAUTH_CLIENT_ID)return response({error:"GitHub OAuth app is not configured."},503);const state=crypto.randomUUID(),browser=crypto.randomUUID();await env.DRAFTS.put("oauth-state:"+state,JSON.stringify({browser}),{expirationTtl:600});const q=new URLSearchParams({client_id:env.GITHUB_OAUTH_CLIENT_ID,redirect_uri:ORIGIN+API+"/auth/callback",scope:"read:user",state});const headers=new Headers({location:"https://github.com/login/oauth/authorize?"+q.toString(),"cache-control":"no-store"});headers.append("set-cookie",oauthCookie(browser));return new Response(null,{status:302,headers})}
if(req.method==="GET"&&r==="auth/callback"){const state=u.searchParams.get("state")||"",code=u.searchParams.get("code")||"",record=state?await env.DRAFTS.get("oauth-state:"+state,"json"):null,browser=getNamedCookie(req,"trs_oauth_browser");if(!state||!code||!record?.browser||!browser||record.browser!==browser){if(state)await env.DRAFTS.delete("oauth-state:"+state);return new Response("Invalid or expired login state. Please restart sign-in.",{status:400,headers:{"set-cookie":oauthCookie("",0),"cache-control":"no-store"}})}await env.DRAFTS.delete("oauth-state:"+state);const tokenRes=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"accept":"application/json","content-type":"application/json"},body:JSON.stringify({client_id:env.GITHUB_OAUTH_CLIENT_ID,client_secret:env.GITHUB_OAUTH_CLIENT_SECRET,code})});const tokenData=await tokenRes.json();if(!tokenRes.ok||!tokenData.access_token)return new Response("GitHub login failed.",{status:401,headers:{"set-cookie":oauthCookie("",0),"cache-control":"no-store"}});const userRes=await fetch("https://api.github.com/user",{headers:{authorization:"Bearer "+tokenData.access_token,accept:"application/vnd.github+json","user-agent":"The-Red-Sparrow-Admin"}});const user=await userRes.json();const allowed=String(env.ALLOWED_GITHUB_LOGIN||"hamadcheema").trim().toLowerCase();if(!userRes.ok||String(user.login).toLowerCase()!==allowed)return new Response("This GitHub account is not authorized.",{status:403,headers:{"set-cookie":oauthCookie("",0),"cache-control":"no-store"}});const sid=crypto.randomUUID();await env.DRAFTS.put("session:"+sid,JSON.stringify({login:String(user.login).toLowerCase(),id:user.id,created:Date.now()}),{expirationTtl:28800});const headers=new Headers({location:ORIGIN+"/admin/","cache-control":"no-store"});headers.append("set-cookie",cookie(sid));headers.append("set-cookie",oauthCookie("",0));return new Response(null,{status:302,headers})}
if(req.method==="POST"&&r==="auth/logout"){const sid=getCookie(req);if(sid)await env.DRAFTS.delete("session:"+sid);return response({ok:true},200,{"set-cookie":cookie("",0)})}

if(req.method==="POST"&&r==="inquiries"){
 const b=await readJson(req),name=String(b.name||"").trim(),email=String(b.email||"").trim(),subject=String(b.subject||"").trim(),message=String(b.message||"").trim();
 if(!b.consent||!name||name.length>80||!EMAIL.test(email)||email.length>254||subject.length>120||message.length<10||message.length>2000)return response({error:"Please complete the form with a valid email and a message of 10–2,000 characters."},400);
 if(!env.IP_RATE_LIMIT_SECRET)throw new Error("IP rate-limit secret is not configured.");const ip=req.headers.get("cf-connecting-ip")||"unknown",ipKey=await hmacHex(env.IP_RATE_LIMIT_SECRET,ip),rateKey="inquiry-rate:"+ipKey+":"+new Date().toISOString().slice(0,10),count=Number(await env.DRAFTS.get(rateKey)||"0");
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
 const limit=Math.min(100,Math.max(1,Math.floor(Number(u.searchParams.get("limit"))||100))),offset=Math.max(0,Math.floor(Number(u.searchParams.get("offset"))||0)),items=all.slice(offset,offset+limit);
 return response({items,total:all.length,offset,limit,hasMore:offset+items.length<all.length,unread:all.filter(x=>x.status==="new").length,archived:all.filter(x=>x.status==="archived").length});
}
if(req.method==="GET"&&r==="inquiries/deleted"){
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"inquiry:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 const all=(await Promise.all(keys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(x=>x&&x.status==="deleted").sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));
 const limit=Math.min(100,Math.max(1,Math.floor(Number(u.searchParams.get("limit"))||100))),offset=Math.max(0,Math.floor(Number(u.searchParams.get("offset"))||0)),items=all.slice(offset,offset+limit);
 return response({items,total:all.length,offset,limit,hasMore:offset+items.length<all.length});
}
if(req.method==="POST"&&r==="inquiries/update"){
 const b=await readJson(req),id=String(b.id||""),state=String(b.state||"");if(!/^[a-f0-9-]{36}$/i.test(id)||!["read","archived"].includes(state))return response({error:"Invalid enquiry update."},400);
 const key="inquiry:"+id,item=await env.DRAFTS.get(key,"json");if(!item||item.status==="deleted")return response({error:"Enquiry not found."},404);item.status=state;item.updatedAt=new Date().toISOString();await env.DRAFTS.put(key,JSON.stringify(item),{expirationTtl:7776000});await audit(env,who.login,state==="archived"?"archive-inquiry":"mark-inquiry-read",id);return response({updated:true});
}
if(req.method==="POST"&&r==="inquiries/restore"){
 const b=await readJson(req),id=String(b.id||"");if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid enquiry ID."},400);
 const key="inquiry:"+id,item=await env.DRAFTS.get(key,"json");if(!item||item.status!=="deleted")return response({error:"Deleted enquiry not found."},404);
 item.status=item.previousStatus&&["new","read","archived"].includes(item.previousStatus)?item.previousStatus:"read";delete item.previousStatus;delete item.deletedAt;item.updatedAt=new Date().toISOString();
 await env.DRAFTS.put(key,JSON.stringify(item),{expirationTtl:7776000});await audit(env,who.login,"restore-inquiry",id);return response({restored:true});
}
if(req.method==="POST"&&r==="inquiries/bulk"){
 const b=await readJson(req),ids=Array.isArray(b.ids)?[...new Set(b.ids.map(String))]:[],action=String(b.action||"");
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
 const b=await readJson(req),ids=Array.isArray(b.ids)?[...new Set(b.ids.map(String))]:[];
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
 const [projects,social,brands,auditPage]=await Promise.all(["projects","social","brands"].map(async k=>(await env.DRAFTS.get("collection:"+k,"json"))||[]).concat([env.DRAFTS.list({prefix:"audit:",limit:100})]));
 const recentKeys=auditPage.keys.sort((a,b)=>b.name.localeCompare(a.name)).slice(0,12);
 const recent=(await Promise.all(recentKeys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(Boolean).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 return response({inquiries:{total:active.length,unread:active.filter(x=>x.status==="new").length,archived:active.filter(x=>x.status==="archived").length,deleted:deleted.length},published:{projects:projects.length,social:social.length,brands:brands.length,total:projects.length+social.length+brands.length},recentActivity:recent});
}
if(req.method==="GET"&&r==="notifications"){
 const listAll=async prefix=>{let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix,limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);return keys};
 const [inquiryKeys,scheduledKeys,auditKeys]=await Promise.all(["inquiry:","scheduled:","audit:"].map(listAll));
 const all=await Promise.all(inquiryKeys.map(k=>env.DRAFTS.get(k.name,"json"))),events=await Promise.all(auditKeys.map(k=>env.DRAFTS.get(k.name,"json"))),jobs=await Promise.all(scheduledKeys.map(k=>env.DRAFTS.get(k.name,"json")));
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
 const b=await readJson(req),slug=String(b.slug||"");if(!["home","about","services","contact"].includes(slug))return response({error:"Page cannot be previewed here."},400);
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
 const b=await readJson(req),v={contactEmail:String(b.contactEmail||"").trim(),directEmail:String(b.directEmail||"").trim(),tagline:String(b.tagline||"").trim(),announcementEnabled:!!b.announcementEnabled,announcement:String(b.announcement||"").trim()};
 for(const email of [v.contactEmail,v.directEmail])if(email.length>254||!EMAIL.test(email))return response({error:"Enter valid contact email addresses."},400);
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
 const b=await readJson(req),kind=String(b.kind||""),scheduledAt=Date.parse(String(b.scheduledAt||""));if(!collectionKinds[kind]||!Number.isFinite(scheduledAt)||scheduledAt<Date.now()+120000||scheduledAt>Date.now()+7776000000)return response({error:"Choose a valid collection and a time at least 2 minutes and no more than 90 days away."},400);
 const items=await env.DRAFTS.get("collection-draft:"+kind,"json")||await env.DRAFTS.get("collection:"+kind,"json")||[];if(!Array.isArray(items)||!items.length)return response({error:"Save at least one item in this collection before scheduling it."},400);
 const id=crypto.randomUUID(),job={id,kind,items,scheduledAt:new Date(scheduledAt).toISOString(),createdAt:new Date().toISOString(),createdBy:who.login,status:"scheduled"};
 await env.DRAFTS.put("scheduled:"+scheduledAt+":"+id,JSON.stringify(job),{expirationTtl:91*86400});await audit(env,who.login,"schedule-publication",kind+":"+job.scheduledAt);return response({scheduled:true,id,scheduledAt:job.scheduledAt});
}
if(req.method==="DELETE"&&r==="schedule"){
 const id=u.searchParams.get("id")||"";if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid schedule ID."},400);
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"scheduled:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);for(const key of keys){const job=await env.DRAFTS.get(key.name,"json");if(job?.id===id){if(job.status!=="scheduled")return response({error:"Only pending publications can be cancelled."},409);await env.DRAFTS.delete(key.name);await audit(env,who.login,"cancel-scheduled-publication",job.kind);return response({cancelled:true})}}
 return response({error:"Scheduled publication not found."},404);
}
if(req.method==="POST"&&r==="schedule/retry"){
 const b=await readJson(req),id=String(b.id||"");if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid schedule ID."},400);
 let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"scheduled:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);
 for(const key of keys){const job=await env.DRAFTS.get(key.name,"json");if(job?.id!==id)continue;if(job.status!=="failed")return response({error:"Only failed publications can be retried."},409);job.status="scheduled";job.scheduledAt=new Date(Date.now()+120000).toISOString();job.retriedAt=new Date().toISOString();delete job.error;delete job.processingAt;await env.DRAFTS.put(key.name,JSON.stringify(job),{expirationTtl:91*86400});await audit(env,who.login,"retry-scheduled-publication",job.kind);return response({scheduled:true,scheduledAt:job.scheduledAt})}
 return response({error:"Scheduled publication not found."},404);
}

if(req.method==="GET"&&r==="status"){let connected=false,msg="GitHub token not configured";if(env.GITHUB_TOKEN)try{await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO);connected=true;msg="Repository access verified"}catch(e){msg="Repository access could not be verified"}return response({ok:true,authorized:true,admin:who.login,githubConnected:connected,githubMessage:msg})}
if(req.method==="GET"&&r==="settings"){let connected=false,message="GitHub token not configured";if(env.GITHUB_TOKEN)try{await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO);connected=true;message="Repository access verified"}catch(e){message=e.message}return response({admin:who.login,repository:env.GITHUB_OWNER+"/"+env.GITHUB_REPO,branch:env.GITHUB_BRANCH||"main",sessionCreated:who.created||null,sessionExpires:who.created?who.created+28800000:null,githubConnected:connected,githubMessage:message})}
if(req.method==="GET"&&r==="audit"){let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"audit:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);const latest=keys.sort((a,b)=>b.name.localeCompare(a.name)).slice(0,50);const entries=await Promise.all(latest.map(item=>env.DRAFTS.get(item.name,"json")));return response({events:entries.filter(Boolean).sort((a,b)=>String(b.at).localeCompare(String(a.at)))})}
if(req.method==="GET"&&r==="media/trash"){let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"trash:media:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);const items=(await Promise.all(keys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(Boolean).sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));return response({items})}
if(req.method==="POST"&&r==="media/restore"){const b=await readJson(req),id=String(b.id||"");if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid media trash ID."},400);const key="trash:media:"+id,item=await env.DRAFTS.get(key,"json");if(!item)return response({error:"Deleted image not found or expired."},404);const trash=await gh(env,filePath(env,item.trashPath));let trashBase64=trash.content;if(!trashBase64){const blob=await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO+"/git/blobs/"+trash.sha);if(blob.encoding!=="base64"||!blob.content)throw Error("Could not read the deleted image data for restoration.");trashBase64=blob.content}let existing=null;try{existing=await gh(env,filePath(env,item.path))}catch(error){if(!String(error.message).includes("GitHub API 404"))throw error}if(existing)return response({error:"A file already exists at the original path. Rename or move it before restoring."},409);const restored=await gh(env,filePath(env,item.path),{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Restore media asset from admin trash",content:trashBase64,branch:env.GITHUB_BRANCH||"main"})});try{await gh(env,filePath(env,item.trashPath),{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Remove restored media from trash",sha:trash.sha,branch:env.GITHUB_BRANCH||"main"})})}catch(error){console.error("Could not remove restored trash copy:",error?.message||error)}await env.DRAFTS.delete(key);await audit(env,who.login,"restore-media",item.path);return response({restored:true,path:item.path,commit:restored.commit?.sha||null})}
if(req.method==="GET"&&r==="media/list"){let items=[];try{const data=await gh(env,filePath(env,"assets/uploads"));items=data.filter(x=>x.type==="file"&&/\.(png|jpe?g|webp|gif)$/i.test(x.name)).map(x=>({name:x.name,path:x.path,size:x.size,url:x.download_url||("https://raw.githubusercontent.com/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO+"/"+(env.GITHUB_BRANCH||"main")+"/"+x.path),siteUrl:ORIGIN+"/"+x.path,previewUrl:ORIGIN+"/"+x.path+"?v="+x.sha,githubUrl:x.html_url})).sort((a,b)=>b.name.localeCompare(a.name))}catch(e){if(!String(e.message).includes("GitHub API 404"))throw e}return response({items})}
if((req.method==="GET"||req.method==="DELETE")&&r==="draft"){const k=u.searchParams.get("key")||"";if(!/^(page|seo):(home|about|services|contact|privacy|terms)$/.test(k))return response({error:"Invalid draft key."},400);if(req.method==="DELETE"){await env.DRAFTS.delete("draft:"+k);await audit(env,who.login,"reset-draft",k);return response({deleted:true,key:k})}return response({draft:await env.DRAFTS.get("draft:"+k,"json")})}
if(req.method==="POST"&&r==="draft"){const b=await readJson(req),k=String(b.key||"");if(!/^(page|seo):(home|about|services|contact|privacy|terms)$/.test(k)||!b.value||typeof b.value!=="object")return response({error:"Invalid draft."},400);await env.DRAFTS.put("draft:"+k,JSON.stringify(b.value),{expirationTtl:7776000});await audit(env,who.login,"save-draft",k);return response({saved:true})}
if(req.method==="POST"&&r==="publish/page"){const b=await readJson(req),slug=b.slug;if(!["home","about","services","contact"].includes(slug))return response({error:"Page cannot be edited here."},400);const p=FILES[slug],old=await readFile(env,p),next=pagePatch(old.content,b),out=await writeFile(env,p,next,old.sha,"Update "+slug+" content from admin");await audit(env,who.login,"publish-page",slug);return response({published:true,path:p,commit:out.commit?.sha||null})}
if(req.method==="POST"&&r==="publish/seo"){const b=await readJson(req),slug=b.slug;if(!FILES[slug])return response({error:"Invalid page."},400);const p=FILES[slug],expected=ORIGIN+(slug==="home"?"/":"/"+p);if(String(b.canonical||"")!==expected)return response({error:"The canonical URL must match the selected page."},400);const old=await readFile(env,p),next=seoPatch(old.content,b),out=await writeFile(env,p,next,old.sha,"Update "+slug+" SEO metadata from admin");await audit(env,who.login,"publish-seo",slug);return response({published:true,path:p,commit:out.commit?.sha||null})}
if(req.method==="POST"&&r==="media/upload"){const b=await readJson(req),name=String(b.name||"").normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(0,80),type=String(b.type||""),raw=String(b.base64||"").replace(/^data:[^,]+;base64,/,"");if(!name||!["image/png","image/jpeg","image/webp","image/gif"].includes(type)||!raw||raw.length>7000000)return response({error:"Unsupported image or file exceeds 5 MB."},400);let bytes;try{bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0))}catch{return response({error:"Image data is not valid base64."},400)}if(bytes.length>5242880)return response({error:"Image exceeds 5 MB."},400);const sig={"image/png":[137,80,78,71,13,10,26,10],"image/jpeg":[255,216,255],"image/gif":[71,73,70,56],"image/webp":[82,73,70,70]}[type];if(!sig.every((v,i)=>bytes[i]===v)||(type==="image/webp"&&String.fromCharCode(...bytes.slice(8,12))!=="WEBP"))return response({error:"Image signature does not match its file type."},400);try{bytes=stripImageMetadata(bytes,type)}catch{return response({error:"Image metadata could not be safely removed. Export the image without metadata and try again."},400)}const sanitizedBase64=base64Bytes(bytes);const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif"}[type],cleanName=name.replace(/\.[^.]+$/,"")+"."+ext,folder=await gh(env,filePath(env,"assets/uploads"));const existing=Array.isArray(folder)?folder.filter(x=>x.type==="file"):[];if(existing.some(x=>x.name.toLowerCase()===cleanName.toLowerCase()||x.name.toLowerCase().endsWith("-"+cleanName.toLowerCase())))return response({error:"A file with this name already exists in Uploaded images. Rename the new file or delete the existing image first.",code:"FILENAME_EXISTS"},409);const prefix=new TextEncoder().encode("blob "+bytes.length+"\0"),blob=new Uint8Array(prefix.length+bytes.length);blob.set(prefix);blob.set(bytes,prefix.length);const digest=await crypto.subtle.digest("SHA-1",blob),gitSha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");if(existing.some(x=>x.sha===gitSha))return response({error:"This exact image is already uploaded under another filename. It was not uploaded again.",code:"DUPLICATE_IMAGE"},409);const p="assets/uploads/"+Date.now()+"-"+cleanName,out=await gh(env,filePath(env,p),{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Add media asset from admin",content:sanitizedBase64,branch:env.GITHUB_BRANCH||"main"})});await audit(env,who.login,"upload-media",p);return response({uploaded:true,path:p,url:ORIGIN+"/"+p,commit:out.commit?.sha||null})}

if(req.method==="POST"&&r==="media/delete"){const b=await readJson(req),p=normalizeMediaPath(b.path);if(!p)return response({error:"Invalid media path."},400);const usedBy=await mediaUsage(env,p);if(usedBy.length)return response({error:"This image is still referenced by: "+usedBy.join(", ")+". Remove or replace those references before moving it to trash."},409);const current=await gh(env,filePath(env,p));if(!current?.sha)return response({error:"Media file not found."},404);let base64=current.content;if(!base64){const blob=await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO+"/git/blobs/"+current.sha);if(blob.encoding!=="base64"||!blob.content)throw Error("Could not read the image data for safe deletion.");base64=blob.content}const id=crypto.randomUUID(),name=p.split("/").pop(),trashPath="assets/trash/"+id+"-"+name;const moved=await gh(env,filePath(env,trashPath),{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Move unused media asset to trash",content:base64,branch:env.GITHUB_BRANCH||"main"})});const meta={id,name,path:p,trashPath,size:current.size||0,deletedAt:new Date().toISOString()};await env.DRAFTS.put("trash:media:"+id,JSON.stringify(meta));try{await gh(env,filePath(env,p),{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Move media asset to trash",sha:current.sha,branch:env.GITHUB_BRANCH||"main"})})}catch(error){await env.DRAFTS.delete("trash:media:"+id);try{const trash=await gh(env,filePath(env,trashPath));await gh(env,filePath(env,trashPath),{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Rollback incomplete media trash move",sha:trash.sha,branch:env.GITHUB_BRANCH||"main"})})}catch{}throw error}await audit(env,who.login,"move-media-to-trash",p);return response({deleted:true,trashed:true,id,path:p,commit:moved.commit?.sha||null})}
if(req.method==="GET"&&r==="content/trash"){let cursor,keys=[];do{const page=await env.DRAFTS.list({prefix:"trash:content:",limit:1000,...(cursor?{cursor}:{})});keys.push(...page.keys);cursor=page.list_complete?null:page.cursor}while(cursor);const items=(await Promise.all(keys.map(k=>env.DRAFTS.get(k.name,"json")))).filter(Boolean).sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));return response({items})}
if(req.method==="POST"&&r==="content/restore"){const b=await readJson(req),id=String(b.id||"");if(!/^[a-f0-9-]{36}$/i.test(id))return response({error:"Invalid collection version ID."},400);const key="trash:content:"+id,snapshot=await env.DRAFTS.get(key,"json");if(!snapshot||!collectionKinds[snapshot.kind]||!Array.isArray(snapshot.items))return response({error:"Collection version not found or expired."},404);const commit=await publishCollection(env,snapshot.kind,snapshot.items,who.login);await env.DRAFTS.delete(key);await audit(env,who.login,"restore-collection",snapshot.kind);return response({restored:true,commit})}
if(req.method==="GET"&&r==="content"){const kind=u.searchParams.get("kind")||"";if(!collectionKinds[kind])return response({error:"Invalid content collection."},400);const publishedItems=await env.DRAFTS.get("collection:"+kind,"json")||[],draft=await env.DRAFTS.get("collection-draft:"+kind,"json"),draftChanged=!!draft&&JSON.stringify(draft)!==JSON.stringify(publishedItems);return response({items:draft||publishedItems,publishedItems,draft:!!draft,draftChanged,publishedAt:await env.DRAFTS.get("collection-published-at:"+kind)})}
if(req.method==="POST"&&r==="content"){const b=await readJson(req),kind=String(b.kind||"");if(!collectionKinds[kind])return response({error:"Invalid content collection."},400);const items=cleanCollectionItems(b.items);await env.DRAFTS.put("collection-draft:"+kind,JSON.stringify(items),{expirationTtl:7776000});await audit(env,who.login,"save-collection",kind+":"+items.length);return response({saved:true,count:items.length})}
if(req.method==="POST"&&r==="publish/content"){const b=await readJson(req),kind=String(b.kind||"");if(!collectionKinds[kind])return response({error:"Invalid content collection."},400);const storedDraft=await env.DRAFTS.get("collection-draft:"+kind,"json"),storedPublished=await env.DRAFTS.get("collection:"+kind,"json")||[],items=cleanCollectionItems(Array.isArray(b.items)?b.items:(storedDraft||storedPublished)),preserveDraft=!!b.preserveDraft,commit=await publishCollection(env,kind,items,who.login,{clearDraft:!preserveDraft});if(preserveDraft){const remaining=cleanCollectionItems(Array.isArray(b.remainingDraft)?b.remainingDraft:[]),snapshot=[...items,...remaining];if(snapshot.length)await env.DRAFTS.put("collection-draft:"+kind,JSON.stringify(snapshot),{expirationTtl:7776000});else await env.DRAFTS.delete("collection-draft:"+kind)}return response({published:true,count:items.length,commit})}
if(req.method==="GET"&&r==="history"){const p=u.searchParams.get("path")||"";if(!Object.values(FILES).includes(p))return response({error:"Path not allowed."},400);const c=await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO+"/commits?path="+encodeURIComponent(p)+"&per_page=12");return response({history:c.map(x=>({sha:x.sha,message:x.commit.message,date:x.commit.author?.date||x.commit.committer?.date}))})}
if(req.method==="POST"&&r==="rollback"){const b=await readJson(req),p=String(b.path||""),sha=String(b.sha||"");if(!Object.values(FILES).includes(p)||!/^[a-f0-9]{40}$/.test(sha))return response({error:"Invalid rollback request."},400);const history=await gh(env,"/repos/"+env.GITHUB_OWNER+"/"+env.GITHUB_REPO+"/commits?path="+encodeURIComponent(p)+"&per_page=100");if(!Array.isArray(history)||!history.some(commit=>commit.sha===sha))return response({error:"The selected commit is not in this file’s verified history."},400);const previous=await readFile(env,p,sha),current=await readFile(env,p),out=await writeFile(env,p,previous.content,current.sha,"Restore "+p+" from "+sha.slice(0,7));await audit(env,who.login,"rollback",p+":"+sha);return response({restored:true,commit:out.commit?.sha||null})}
return response({error:"Not found."},404)}
export default {async fetch(req,env){try{return await run(req,env)}catch(e){console.error(JSON.stringify({message:"admin request failed",error:e?.message||String(e),path:new URL(req.url).pathname}));if(e instanceof HttpError)return response({error:e.message},e.status);return response({error:"Unexpected server error."},500)}},
 async scheduled(controller,env){
  let inquiryCursor,deletedKeys=[];do{const page=await env.DRAFTS.list({prefix:"inquiry:",limit:1000,...(inquiryCursor?{cursor:inquiryCursor}:{})});deletedKeys.push(...page.keys);inquiryCursor=page.list_complete?null:page.cursor}while(inquiryCursor);
  const cutoff=Date.now()-30*24*60*60*1000;
  let trashCursor,mediaTrashKeys=[];do{const page=await env.DRAFTS.list({prefix:"trash:media:",limit:1000,...(trashCursor?{cursor:trashCursor}:{})});mediaTrashKeys.push(...page.keys);trashCursor=page.list_complete?null:page.cursor}while(trashCursor);
  const trashCutoff=Date.now()-7*24*60*60*1000;for(const key of mediaTrashKeys){const item=await env.DRAFTS.get(key.name,"json");if(!item||Date.parse(item.deletedAt||"")>trashCutoff)continue;try{const file=await gh(env,filePath(env,item.trashPath));await gh(env,filePath(env,item.trashPath),{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Permanently expire media trash after seven days",sha:file.sha,branch:env.GITHUB_BRANCH||"main"})});await env.DRAFTS.delete(key.name)}catch(error){if(String(error?.message||"").includes("GitHub API 404"))await env.DRAFTS.delete(key.name);else console.error("Media trash cleanup failed:",key.name,error?.message||error)}}
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
