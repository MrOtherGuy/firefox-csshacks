'use strict';

let DB = null;

function initDB(obj){
  DB = obj;
  Object.defineProperty(DB,"query",{value:function (q,list){
    let nlist = [];
    for(let key of list || this.keys){
      if(this[key].includes(q)){
        nlist.push(key)
      }
    }
    return nlist
  }});
  Object.defineProperty(DB,"keys",{value:(Object.keys(DB).sort())});
  return true
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
        .then(r=>resolve(r))
      }else{
        response.text()
        .then(r=>resolve(r))
        
      }
    },except => reject(except))
  });
}

let previousCategory = new (function(){
  let current = null;
  this.set = function(t){
    current&&current.classList.remove("currentCategory");
    current = t;
    current.classList.add("currentCategory");
  };
  return this
})()

function getText(node){
  return `${node.childNodes[0].textContent}.css`
}

async function onCategoryClicked(categoryNode){
  
  previousCategory.set(categoryNode);
  
  let names = DB.query(categoryNode.textContent);
  for(let c of Array.from(document.querySelectorAll(".target"))){
    names.includes(getText(c)) ? c.classList.remove("hidden") : c.classList.add("hidden");
  }
}

async function onTargetClicked(targetNode){
  const codeBlock = document.querySelector("pre");
  fetchWithType(`chrome/${getText(targetNode)}`)
  .then(text => (codeBlock.textContent = text))
  .catch(e => console.log(e))
}

function onSomeClicked(e){
  let cl = e.target.parentNode.id;
  switch(cl){
    case "categories":
      onCategoryClicked(e.target);
      break;
    case "targets":
      onTargetClicked(e.target);
      break;
    default:
      break;
  }
}


function createCategories(){
  
  const CAT_PARENT = document.getElementById("categories");
  CAT_PARENT.addEventListener("click",onSomeClicked)
  
  const TAR_PARENT = document.getElementById("targets");
  TAR_PARENT.addEventListener("click",onSomeClicked);
  
  const createNode = function(name,type){
    let node = document.createElement("div");
    node.classList.add(type);
    if(type === "target"){
      node.textContent = name.substring(0,name.lastIndexOf("."));
      let link = node.appendChild(document.createElement("a"));
      node.classList.add("hidden");
      link.href = `https://github.com/MrOtherGuy/firefox-csshacks/tree/master/chrome/${name}`;
      link.title = "See on Github";
      link.target = "_blank";
    }else{
      node.textContent = name.name;
      node.setAttribute("data-value",name.value);
    }
    
    return node;
  }
  
  const createCategory = name => createNode(name,"category");
  
  const createTarget = name => createNode(name,"target");

  const CAT_NAMES = (function(){
    let list = [];
    
    for(let key of Object.keys(DB)){
      TAR_PARENT.appendChild(createNode(key,"target"));
      let things = DB[key];
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
    let map = ret.map((a,i)=>({name:a,value:ns[i]}))
    return map
    //return map.sort((a,b)=>(a.value > b.value?-1:a.value < b.value ? 1:0))
  })();
  
  for(let cat of CAT_NAMES){
  //  CAT_PARENT.appendChild(createCategory(cat.name))
    CAT_PARENT.appendChild(createNode(cat,"category"))
  }
  
}

document.onreadystatechange = (function () {
  if (document.readyState === "complete") {
    fetchWithType("html_resources/tagmap.json")
    .then(response=>(initDB(response)))
    .then(()=>createCategories())
    .catch(e=>{console.log(e);document.getElementById("ui").textContent = "FAILURE, Database could not be loaded"});
  }
});