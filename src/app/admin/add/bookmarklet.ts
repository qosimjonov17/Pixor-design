/**
 * Brauzer tugmachasi (bookmarklet) kodi. Admin brauzerida ishlaydi.
 * Dizaynerning profil sahifasida bosilsa — ism, avatar va bio olinadi (kind: "designer").
 * Ish sahifasida:
 *  - loyiha manzilini qayta yuklab (Behance profil ustida oynacha ochganda ham to'g'ri bo'lsin) meta ma'lumotni oladi;
 *  - loyiha egasining ismi, profil havolasi va avatarini qidiradi;
 *  - hammasini Pixora'ning /admin/add sahifasiga (#... ichida) ochib yuboradi.
 * String.raw — ichidagi "\" belgilari o'zgarmasin.
 */
const SOURCE = String.raw`(function(){
var S=__SITE__;var w=window.open("about:blank","_blank");
function go(d){var u=S+"/admin/add#"+encodeURIComponent(JSON.stringify(d));if(w)w.location.href=u;else location.href=u}
var href=location.href.split("#")[0];var h=location.hostname;
function meta(doc,n){var e=doc.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]');return e&&e.content||""}
function abs(u,base){try{return new URL(u,base).href}catch(e){return""}}
function merge(a,b){var r={};for(var k in a)r[k]=a[k];for(var k2 in b)if(b[k2])r[k2]=b[k2];return r}
function behanceJson(html){
  var m=html.search(/\\?"owners\\?"|&quot;owners&quot;/);if(m<0)return{};
  var c=html.slice(m,m+8000).replace(/&quot;/g,'"').replace(/\\"/g,'"').replace(/\\\//g,"/");
  var n=c.match(/"(?:display_name|displayName)"\s*:\s*"((?:[^"\\]|\\.){1,120})"/);
  var u=c.match(/"url"\s*:\s*"(https:\/\/www\.behance\.net\/[A-Za-z0-9._-]+)"/);
  var best="",size=0,re=/"url"\s*:\s*"(https:\/\/[^"]+)"\s*,\s*"width"\s*:\s*(\d+)/g,x;
  var imgs=c.indexOf('"images"');var ic=imgs>=0?c.slice(imgs,imgs+3000):"";
  while((x=re.exec(ic))){if(+x[2]>size&&+x[2]<=400){size=+x[2];best=x[1]}}
  if(!best){var re2=/"(https:\/\/mir-s3-cdn-cf\.behance\.net\/user\/(\d+)\/[^"]+)"/g;while((x=re2.exec(c))){if(+x[2]>size){size=+x[2];best=x[1]}}}
  var name="";if(n){try{name=JSON.parse('"'+n[1]+'"')}catch(e){name=n[1]}}
  return{designer:name,designerUrl:u?u[1]:"",designerAvatar:best};
}
function behanceCover(html){
  var id=(location.pathname.match(/gallery\/(\d+)/)||[])[1];if(!id)return"";
  var t=html.replace(/&quot;/g,'"').replace(/\"/g,'"').replace(/\\\//g,"/");
  var re=new RegExp('"id"\\s*:\\s*'+id+'\\b',"g"),m,best="",rank=99,order=["original","max_808","808","404","230","202"];
  while((m=re.exec(t))){
    var c=t.slice(m.index,m.index+30000),r=/https:\/\/mir-s3-cdn-cf\.behance\.net\/projects\/(original|max_808|808|404|230|202)\/[^"'\s\\)]+/g,x;
    while((x=r.exec(c))){var k=order.indexOf(x[1]);if(k<rank){rank=k;best=x[0]}}
    if(best)break;
  }
  return best;
}
function dribbbleOwner(doc){
  var t=(meta(doc,"og:title")+"\n"+(doc.title||"")).match(/ by (.+?)(?: for .+?)? on Dribbble\s*$/im);var name=t?t[1].trim():"";
  if(!name){var d=(meta(doc,"og:description")+" "+meta(doc,"description")+" "+meta(doc,"twitter:description")).match(/designed by (.+?)(?: for |\.|,|$)/i);name=d?d[1].trim():""}
  if(!name)return{};
  var links=doc.querySelectorAll("a[href]"),url="",avatar="";
  for(var i=0;i<links.length;i++){var a=links[i];
    var img=a.querySelector("img"),txt=(a.textContent||"").trim(),alt=img?(img.getAttribute("alt")||"").trim():"";
    var path=(a.getAttribute("href")||"").replace(/^https?:\/\/dribbble\.com(:\d+)?/,"");
    if((txt===name||alt===name)&&/^\/[A-Za-z0-9_-]+\/?$/.test(path)){url=abs(path,href);break}}
  if(url){for(var j=0;j<links.length;j++){var b=links[j],im=b.querySelector("img");if(im&&abs(b.getAttribute("href"),href)===url){avatar=abs(im.getAttribute("src"),href);break}}}
  var ps=doc.querySelectorAll(".formatted-text p, .shot-description p"),desc=[];
  for(var k=0;k<ps.length&&desc.join(" ").length<500;k++){var pt=(ps[k].textContent||"").replace(/\s+/g," ").trim();if(pt.length>20&&!/^(partner with|hire |contact |follow )/i.test(pt))desc.push(pt)}
  return{designer:name,designerUrl:url,designerAvatar:avatar,description:desc.join(" ").slice(0,900)};
}
function dprofileOwner(doc){
  var imgs=doc.querySelectorAll('img[alt^="Аватар пользователя"]');
  for(var i=0;i<imgs.length;i++){var im=imgs[i];if(im.closest("header,nav"))continue;
    var name=(im.getAttribute("alt")||"").replace(/^Аватар пользователя\s+/,"").trim();var a=im.closest("a[href]");
    return{designer:name,designerUrl:a?abs(a.getAttribute("href"),href):"",designerAvatar:abs(im.getAttribute("src")||"",href)}}
  return{};
}
function behanceDom(doc){
  var ls=doc.querySelectorAll('a.qa-user-link[href],a[class*="UserInfo-userName"][href]'),a=null;
  for(var i=0;i<ls.length;i++){if(!ls[i].closest("header,nav")&&(ls[i].textContent||"").trim()){a=ls[i];break}}
  if(!a)return{};
  var url=abs(a.getAttribute("href"),href).split("?")[0],av="",ims=doc.querySelectorAll("a[href] img");
  for(var j=0;j<ims.length;j++){var l=ims[j].closest("a");if(l&&abs(l.getAttribute("href"),href).split("?")[0]===url){av=ims[j].getAttribute("src")||"";break}}
  if(/pps\.services\.adobe\.com/.test(av))av=av.replace(/\/\d+(\?.*)?$/,"/276");
  return{designer:(a.textContent||"").trim(),designerUrl:url,designerAvatar:av?abs(av,href):""};
}
function avatarLink(doc,base,re){
  var links=doc.querySelectorAll("a[href]");
  for(var i=0;i<links.length;i++){var a=links[i];if(a.closest("header,nav"))continue;var img=a.querySelector("img");
    if(img&&re.test(img.getAttribute("src")||"")){return{designerUrl:abs(a.getAttribute("href"),base),designerAvatar:abs(img.getAttribute("src"),base),designer:(img.getAttribute("alt")||a.textContent||"").trim().slice(0,120)}}}
  return{};
}
var seg=location.pathname.split("/").filter(Boolean);
var isX=h==="x.com"||h.indexOf("twitter")>=0,isBe=h.indexOf("behance")>=0,isDr=h.indexOf("dribbble")>=0,isDp=h.indexOf("dprofile")>=0;
function isProfile(){
  if(seg.length<1||seg.length>2)return false;var f=seg[0].toLowerCase(),s2=(seg[1]||"").toLowerCase();
  if(isBe)return !/^(gallery|galleries|search|joblist|assets|live|hire|for_you|featured|following|onboarding|moodboard|collection|v2)$/.test(f)&&(!s2||/^(projects|moodboards|appreciated|about|services|info)$/.test(s2));
  if(isDr)return !/^(shots|search|tags|designers|jobs|stories|following|signup|session|uploads|account|pro|hiring|learn|resources)$/.test(f)&&(!s2||/^(shots|about|projects|collections|likes|members)$/.test(s2));
  if(isX)return !/^(home|explore|notifications|messages|search|i|settings|compose|hashtag)$/.test(f)&&(!s2||/^(media|likes|with_replies|highlights|articles)$/.test(s2));
  if(isDp)return seg.length===1&&!/^(case|cases|search|vacancies|tenders|blog|projects|designers|login|signup)$/.test(f);
  return false;
}
if(isProfile()){
  var d={kind:"designer",url:href,designerUrl:location.origin+"/"+seg[0],designer:"",designerAvatar:"",bio:""};
  if(isBe){
    var jn=document.documentElement.innerHTML.match(/"displayName"\s*:\s*"((?:[^"\\]|\\.){1,120})"/);
    try{d.designer=jn?JSON.parse('"'+jn[1]+'"'):""}catch(e){d.designer=jn?jn[1]:""}
    var bi=document.querySelector('[class*="UserInfo-bio"]:not([class*="ReadMore"])');d.bio=bi?bi.innerText.trim():"";if(!d.bio||/(…|\.\.\.)\s*Read More$/i.test(d.bio))d.bio=meta(document,"description")||d.bio.replace(/\s*Read More$/i,"");
    var ai=document.querySelector('img[src*="pps.services.adobe.com"],img[src*="behance.net/user/"]');
    if(ai){d.designerAvatar=ai.src.replace(/\/\d+(\?.*)?$/,"/276");if(!d.designer)d.designer=(ai.alt||"").replace(/'s profile$/,"")}
  }else if(isDr){
    d.designer=meta(document,"og:title")||(document.title||"").replace(/\s*\|\s*Dribbble$/,"");
    var ds=meta(document,"description")||meta(document,"og:description");
    if(ds.indexOf(d.designer+" | ")===0)ds=ds.slice(d.designer.length+3);
    d.bio=ds.replace(/\s*\|?\s*Connect with them on Dribbble[\s\S]*$/,"").trim();
    var da=document.querySelector("img.profile-avatar")||document.querySelector('img[src*="/avatars/"]');if(da)d.designerAvatar=da.src;
  }else if(isX){
    d.designer=(document.title||"").replace(/\s*\(@[^)]*\)[\s\S]*$/,"").trim();
    var xd=document.querySelector('[data-testid="UserDescription"]');d.bio=xd?xd.innerText.trim():meta(document,"og:description");
    var xa=document.querySelector('a[href$="/photo"] img[src*="profile_images"]')||document.querySelector('img[src*="profile_images"]');
    if(xa)d.designerAvatar=xa.src.replace(/_(normal|bigger|200x200)\./,"_400x400.");
  }else if(isDp){
    var dn=document.querySelector('[class*="intro__item_content_name"]');d.designer=dn?dn.textContent.trim():(document.title||"").split(" — ")[0];
    var dpa=document.querySelectorAll('img[alt^="Аватар пользователя"]');for(var di=0;di<dpa.length;di++){if(!dpa[di].closest("header,nav")){d.designerAvatar=dpa[di].src;break}}
  }
  go(d);return;
}
if(isX){
  var q=function(s){return document.querySelector(s)};
  var t=q('article [data-testid="tweetText"]'),un=q('article [data-testid="User-Name"] span'),im=q('article img[src*="pbs.twimg.com/media"]'),av=q('article img[src*="profile_images"]');
  var hd=location.pathname.split("/")[1]||"";
  go({url:href,title:"",description:t?t.textContent.trim().slice(0,1000):meta(document,"og:description"),image:im?im.src.replace(/name=[a-z0-9]+/,"name=large"):meta(document,"og:image"),designer:un?un.textContent.trim():"",designerUrl:hd?"https://x.com/"+hd:"",designerAvatar:av?av.src.replace("_normal.","_400x400."):""});
  return;
}
function owner(doc,html){
  if(h.indexOf("behance")>=0)return merge(merge(merge(avatarLink(doc,href,/behance\.net(:\d+)?\/user\//),behanceDom(doc)),behanceJson(html)),{image:behanceCover(html)});
  if(h.indexOf("dribbble")>=0)return dribbbleOwner(doc);
  if(h.indexOf("dprofile")>=0)return dprofileOwner(doc);
  return{designer:meta(doc,"author")};
}
function vid(doc){
  var m=meta(doc,"og:video:secure_url")||meta(doc,"og:video:url")||meta(doc,"og:video");if(/\.mp4(\?|$)/i.test(m))return abs(m,href);
  var els=doc.querySelectorAll("video,video source");
  for(var i=0;i<els.length;i++){var e=els[i];if(e.closest("header,nav,footer"))continue;var u=e.getAttribute("src")||e.getAttribute("data-src")||"";if(/\.mp4(\?|$)/i.test(u))return abs(u,href)}
  return"";
}
function base(doc){return{url:href,title:meta(doc,"og:title")||doc.title||"",description:meta(doc,"og:description")||meta(doc,"description"),image:meta(doc,"og:image")||meta(doc,"twitter:image"),video:vid(doc)}}
fetch(href,{credentials:"include"}).then(function(r){return r.text()}).then(function(html){
  var doc=new DOMParser().parseFromString(html,"text/html");
  var live=owner(document,document.documentElement.innerHTML);
  go(merge(merge(base(doc),live),owner(doc,html)));
}).catch(function(){go(merge(base(document),owner(document,document.documentElement.innerHTML)))});
})()`;

export function bookmarkletHref(site: string) {
  const js = SOURCE.replace("__SITE__", JSON.stringify(site)).replace(/\n\s*/g, "");
  return `javascript:${encodeURIComponent(js)}`;
}
