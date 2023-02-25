'use strict';

const DB = new (function(){
  this.content = null;
  this.query = (q,list) => {
    let nlist = [];
    for(let key of list || this.keys){
      if(this.content[key].includes(q)){
        nlist.push(key)
      }
    }
    return nlist
  };
  this.init = (obj) => {
    this.content = obj
  }
  this._keys = null;
  Object.defineProperty(this,"keys",{ get:() => {
    if(this.content && !this._keys){
      this._keys = Object.keys(this.content).sort();
    }
    return this._keys
  }});
  this.getTagsForFile = (name) => {
    return this.content[name];
  }    
})();

function initDB(obj){
  window.DB = DB;
  DB.init(obj.content);
}

function fetchWithType(url){
  return new Promise((resolve,reject)=>{
    const ext = url.substring(url.lastIndexOf(".")+1);
    let expected = (ext === "json") ? "application/json" : (ext === "css") ? "text/css" : null;
    if(!expected){
      reject("unsupported file extension");
    }
    fetch(url)
    .then(response =>{
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes(expected)) {
        reject(`Oops, we got ${contentType} but expected ${expected}`);
      }
      if(ext === "json"){
        response.json()
        .then((obj) => resolve({file:url,content:obj}));
      }else{
        response.text()
        .then((text) => resolve({file:url,content:text,name:url}))
        
      }
    },except => reject(except))
  });
}

let currentCategory = new (function(){
  let currentPrimaryNode = null;
  let currentSecondaryNode = null;
  // TODO make filenames store ONLY the top level fileNames
  // 
  
  let currentTopLevelFileNames = null;
  
  this.set = function(t,secondary){
    if(secondary){
      currentSecondaryNode && currentSecondaryNode.classList.remove("currentCategory");
      currentSecondaryNode = t;
      currentSecondaryNode.classList.add("currentCategory");
    }else{
      currentPrimaryNode && currentPrimaryNode.classList.remove("currentCategory");
      currentPrimaryNode = t;
      currentPrimaryNode.classList.add("currentCategory");
      
      currentSecondaryNode && currentSecondaryNode.classList.remove("currentCategory");
      currentSecondaryNode = null;
    }
    if(!secondary){
      currentTopLevelFileNames = DB.query(t.textContent);
    }

  };
  
  this.getFileNames = function(node,secondary){
    if(secondary){
      return DB.query(node.textContent,currentTopLevelFileNames)
    }
    return currentTopLevelFileNames
  }
  return this
})()

function getText(node){
  return `${node.textContent}.css`
}

function getSecondaryCategories(list){
  let a = [];
  for (let file of list){
    a.push(DB.getTagsForFile(file));
  }
  a = a.flat();
  a.sort();
  let ret = [];
  let i = 0;
  ret[0] = a[0];
  for(let f of a){
    if(ret[i] != f){
      ret[++i] = f
    }
  }
  return ret
}

function showMatchingTargets(fileNames,setSelected = false){
  {
    let ui = document.getElementById("ui");
    if(ui.classList.contains("no-content")){
      ui.classList.remove("no-content")
    }
  }
  let bonus = 0;
  for(let c of Array.from(document.querySelectorAll(".target"))){
    if(fileNames.includes(c.dataset.filename)){
      c.classList.remove("hidden");
      setSelected && selectedTarget.add(c)
    }else{
      if(c.classList.contains("selected")){
        bonus++
      }else{
        c.classList.add("hidden");
      }
      
    }
  }
  const container = document.getElementById("targets");
  const width = container.getBoundingClientRect().width;
  const horizontal_items = Math.max(1,Math.min(Math.floor(width / 180),4));
  const real_items = fileNames.length + bonus;
  const full_rows = Math.ceil(real_items/horizontal_items);
  document.getElementById("targets").setAttribute("style",`--grid-rows:${full_rows};--grid-columns:${Math.ceil(real_items/full_rows)}`);
}

function onCategoryClicked(categoryNode,isSecondary = false){
  
  currentCategory.set(categoryNode,isSecondary);
  
  let secondaryCategoriesNode = document.querySelector("#secondaryCategories");
  let fileNames = currentCategory.getFileNames(categoryNode,isSecondary);
  if(!isSecondary){
    
    if(fileNames.length > 9 && categoryNode.textContent != "legacy"){
      let matchingSecondaries = getSecondaryCategories(fileNames);
      for(let child of Array.from(secondaryCategoriesNode.children)){
        matchingSecondaries.includes(child.textContent) ? child.classList.remove("hidden") : child.classList.add("hidden")
      }
      document.getElementById("categories").classList.add("blurred");
    }else{
      document.getElementById("categories").classList.remove("blurred");
      
    }
  }
  showMatchingTargets(fileNames);
  return
}


async function onTargetClicked(target,append = false){
  const text = typeof target === "string"
              ? target
              : target.dataset.filename;
  
  fetchWithType(`chrome/${text}`)
  .then(obj => {
    let box = document.getElementById("previewBox");
    if(append){
      if(obj.file.endsWith("window_control_placeholder_support.css")){
        obj.insertMode = box.InsertModes.Prepend;
        box.insertContent(obj);
      }else{
        obj.insertMode = box.InsertModes.AppendLines;
        box.insertContent(obj);
      }
    }else{
      box.value = obj
    }
  })
  .catch(e => console.log(e))
}

function onFilenameClicked(box,ctrlKey){
  if(typeof box === "string"){
    box = document.querySelector(`.target[title="${box}"]`);
  }
  if(!box){ return }
  if(!box.classList.contains("selected")){
    if(ctrlKey && selectedTarget.getIt()){
      selectedTarget.add(box);
    }else{
      selectedTarget.set(box);
    }
    onTargetClicked(box,ctrlKey);
    selectedTarget.setUrlSearchParams()
  }else{
    if(ctrlKey){
      selectedTarget.deselect(box);
      let previewbox = document.getElementById("previewBox");
      let preview = previewbox.getNamedSection(`chrome/${box.dataset.filename}`);
      if(preview){
        preview.remove();
      }
      selectedTarget.setUrlSearchParams()
    }
  }
}

function onSomeClicked(e){
  let cl = e.target.parentNode.id;
  switch(cl){
    case "categories":
      onCategoryClicked(e.target);
      break;
    case "secondaryCategories":
      onCategoryClicked(e.target,true/* isSecondary */);
      break;
    case "targets":
      onFilenameClicked(e.target,e.ctrlKey);
      
      break;
    default:
    
      break;
  }
}

const selectedTarget = new(function(){
  const selected = new Set();
  const state_object = {};
  this.set = (el) => {
    this.clear();
    el.classList.add("selected");
    el.classList.remove("hidden");
    selected.add(el);
  }
  this.getIt = () =>{ return selected.values().next().value };
  this.add = (el) => {
    selected.add(el);
    el.classList.add("selected");
    el.classList.remove("hidden");
  };
  this.deselect = (el) => {
    el.classList.remove("selected");
    return selected.delete(el)
  };
  this.clear = () => {
    selected.forEach(el=>el.classList.remove("selected"));
    selected.clear();
    return true
  }
  this.setUrlSearchParams = () => {
    let t = [];
    for(let value of selected.values()){
      t.push(value.getAttribute("title")+".css")
    }
    history.replaceState(state_object,"",`?file=${t.map(encodeURIComponent).join(",")}`);
  }
})();

function createCategories(){
  
  const CAT_PARENT = document.getElementById("categories");
  const CAT_SECOND = document.getElementById("secondaryCategories");
  CAT_PARENT.addEventListener("click",onSomeClicked,{passive:true});
  CAT_SECOND.addEventListener("click",onSomeClicked,{passive:true});
  
  const TAR_PARENT = document.getElementById("targets");
  TAR_PARENT.addEventListener("click",onSomeClicked,{passive:true});
  
  const createNode = function(name,type,isDeprecated){
    let node = document.createElement("div");
    node.classList.add(type);
    if(type === "target"){
      
      let link = node.appendChild(document.createElement("a"));
      node.classList.add("hidden");
      link.href = `https://github.com/MrOtherGuy/firefox-csshacks/tree/master/chrome/${isDeprecated?"deprecated/":""}${name}`;
      link.title = "See on Github";
      link.target = "_blank";
      const content = name.substring(0,name.lastIndexOf("."));
      node.appendChild(document.createElement("span")).textContent = content;
      node.dataset.filename = `${content}.css`;
      node.setAttribute("title",content);
    }else{
      node.textContent = name.name;
      name.value > 0 && node.setAttribute("data-value",name.value);
    }
    
    return node;
  }

  const CAT_NAMES = (function(){
    let list = [];
    
    for(let key of DB.keys){
      let things = DB.content[key];
      TAR_PARENT.appendChild(createNode(key,"target",things.includes("legacy")));
      for(let t of things){
        list.push(t)
      }
    }
    list.sort();
    let ret = [];
    let ns = [0];
    ret[0] = list[0];
    let i = 0;
    for(let item of list){
      if(ret[i]!=item){
        ret[++i]=item;
        ns[i]=0;
      }else{
        ns[i] += (item === "legacy" ? -1 : 1);
      }
    }
    let map = ret.map((a,i)=>({name:a,value:ns[i]+1}))
    return map
    //return map.sort((a,b)=>(a.value > b.value?-1:a.value < b.value ? 1:0))
  })();
  
  for(let cat of CAT_NAMES){
    CAT_PARENT.appendChild(createNode(cat,"category"));
    CAT_SECOND.appendChild(createNode(cat,"category"));
  }
  
}

async function handleSearchQuery(){
  let params = (new URL(document.location)).searchParams;
  let param = params.get("tag");
  if(param){
    let cats = document.querySelectorAll("#categories > .category");
    for(let cat of cats){
      if(cat.textContent === param){
        onCategoryClicked(cat);
        return
      }
    }
    return
  }
  param = params.get("file");
  if(param){
    let files = param.split(",").filter(a => DB.keys.includes(a));
    let box = document.getElementById("previewBox");
    if(files.length === 0 ){
      return
    }
 
    const promises = files.map(file=>fetchWithType(`chrome/${file}`).catch(e=>""));
    
    Promise.all(promises)
    .then(responses => {
      showMatchingTargets(files,true);
      responses.forEach((res)=>{
        res.insertMode = res.file.endsWith("window_control_placeholder_support.css") ? box.InsertModes.Prepend : box.InsertModes.AppendLines;
        box.insertContent(res)
      })
    });
    
  }
}

function showUI(){
  document.getElementById("placeholder").remove();
  document.getElementById("ui").classList.remove("hidden");
}

function waitForDelay(t){
  t = Number(t) || 10;
  return new Promise(res =>{
    setTimeout(res,t)
  })
}

document.onreadystatechange = (function () {
  
  if (document.readyState === "complete") {
    function linkClicked(ev){
      if(ev.originalTarget instanceof HTMLAnchorElement){
        let ref = ev.originalTarget.href;
        if(!ref){
          return
        }
        let fileName = ref.slice(ref.lastIndexOf("/"));
        if(fileName.endsWith(".css")){
          onFilenameClicked(fileName.slice(1,-4),ev.ctrlKey);
          ev.preventDefault();
        }
      }
    }
    document.getElementById("previewBox").addEventListener("click",linkClicked);
    
    fetchWithType("html_resources/tagmap.json")
    .then(initDB)
    .then(createCategories)
    .then(handleSearchQuery)
    .then(()=>waitForDelay(300))
    .then(showUI)
    .catch(e => console.log(e))
  }
});