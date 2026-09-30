/**
 * Brauzer tugmachasi (bookmarklet) kodi. Admin brauzerida, ish sahifasida ishlaydi:
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
  var n=c.match(/"display_name"\s*:\s*"((?:[^"\\]|\\.){1,120})"/);
  var u=c.match(/"url"\s*:\s*"(https:\/\/www\.behance\.net\/[A-Za-z0-9._-]+)"/);
  var best="",size=0,re=/"(https:\/\/mir-s3-cdn-cf\.behance\.net\/user\/(\d+)\/[^"]+)"/g,x;
  while((x=re.exec(c))){if(+x[2]>size){size=+x[2];best=x[1]}}
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
function avatarLink(doc,base,re){
  var links=doc.querySelectorAll("a[href]");
  for(var i=0;i<links.length;i++){var a=links[i];if(a.closest("header,nav"))continue;var img=a.querySelector("img");
    if(img&&re.test(img.getAttribute("src")||"")){return{designerUrl:abs(a.getAttribute("href"),base),designerAvatar:abs(img.getAttribute("src"),base),designer:(img.getAttribute("alt")||a.textContent||"").trim().slice(0,120)}}}
  return{};
}
if(h==="x.com"||h.indexOf("twitter")>=0){
  var q=function(s){return document.querySelector(s)};
  var t=q('article [data-testid="tweetText"]'),un=q('article [data-testid="User-Name"] span'),im=q('article img[src*="pbs.twimg.com/media"]'),av=q('article img[src*="profile_images"]');
  var hd=location.pathname.split("/")[1]||"";
  go({url:href,title:"",description:t?t.textContent.trim().slice(0,1000):meta(document,"og:description"),image:im?im.src.replace(/name=[a-z0-9]+/,"name=large"):meta(document,"og:image"),designer:un?un.textContent.trim():"",designerUrl:hd?"https://x.com/"+hd:"",designerAvatar:av?av.src.replace("_normal.","_400x400."):""});
  return;
}
function owner(doc,html){
  if(h.indexOf("behance")>=0)return merge(merge(avatarLink(doc,href,/behance\.net(:\d+)?\/user\//),behanceJson(html)),{image:behanceCover(html)});
  if(h.indexOf("dribbble")>=0)return avatarLink(doc,href,/\/avatars\//);
  return{designer:meta(doc,"author")};
}
function base(doc){return{url:href,title:meta(doc,"og:title")||doc.title||"",description:meta(doc,"og:description")||meta(doc,"description"),image:meta(doc,"og:image")||meta(doc,"twitter:image")}}
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
