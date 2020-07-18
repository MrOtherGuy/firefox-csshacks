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
  
  Object.defineProperty(DB,"getTagsForFile",{value:function(name){return this[name]}});
  
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

let currentCategory = new (function(){
  const currentPrimaryNode = null;
  const currentSecondaryNode = null;
  // TODO make filenames store ONLY the top level fileNames
  // 
  
  let currentTopLevelFileNames = null;
  
  this.set = function(t,secondary){
    let targetNode;
    if(secondary){
      targetNode = currentSecondaryNode;
    }else{
      targetNode = currentPrimaryNode;
    }
    targetNode && targetNode.classList.remove("currentCategory");
    targetNode = t;
    targetNode.classList.add("currentCategory");
    if(!secondary){
      currentTopLevelFileNames = DB.query(t.textContent);
    }

    //this.fileNames = DB.query(t.textContent,secondary?this.fileNames:null);
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
  return `${node.childNodes[0].textContent}.css`
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

async function onCategoryClicked(categoryNode,isSecondary = false){
  
  currentCategory.set(categoryNode,isSecondary);
  // Using textContent is bad but meh
  //let names = DB.query(categoryNode.textContent);
  
  let secondaryCategoriesNode = document.querySelector("#secondaryCategories");
  let fileNames = currentCategory.getFileNames(categoryNode,isSecondary);
  if(!isSecondary){
    
    if(fileNames.length > 9){
      let matchingSecondaries = getSecondaryCategories(fileNames);
      for(let child of Array.from(secondaryCategories.children)){
        matchingSecondaries.includes(child.textContent) ? child.classList.remove("hidden") : child.classList.add("hidden")
      }
      
      secondaryCategoriesNode.classList.remove("hidden");
    }else{
      secondaryCategoriesNode.classList.add("hidden");
    }
  }
  
  for(let c of Array.from(document.querySelectorAll(".target"))){
    fileNames.includes(getText(c)) ? c.classList.remove("hidden") : c.classList.add("hidden");
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
    case "secondaryCategories":
      onCategoryClicked(e.target,true/* isSecondary */);
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
  const CAT_SECOND = document.getElementById("secondaryCategories");
  CAT_PARENT.addEventListener("click",onSomeClicked);
  CAT_SECOND.addEventListener("click",onSomeClicked);
  
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
      name.value > 0 && node.setAttribute("data-value",name.value);
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
    let map = ret.map((a,i)=>({name:a,value:ns[i]+1}))
    return map
    //return map.sort((a,b)=>(a.value > b.value?-1:a.value < b.value ? 1:0))
  })();
  
  for(let cat of CAT_NAMES){
  //  CAT_PARENT.appendChild(createCategory(cat.name))
    CAT_PARENT.appendChild(createNode(cat,"category"));
    CAT_SECOND.appendChild(createNode(cat,"category"));
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