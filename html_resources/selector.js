'use strict';

let DB = null;

function initDB(obj){
  DB = obj;
  Object.defineProperty(DB,"query",{value:function (q,list){
    let nlist = [];
    for(let key of list || Object.keys(this)){
      if(this[key].includes(q)){
        nlist.push(key)
      }
    }
    return nlist
  }});
  return true
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
  return node.childNodes[0].textContent
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
  let file = await fetch(`chrome/${getText(targetNode)}`);
  let t = await file.text();
  codeBlock.textContent = t;
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
    node.textContent = name;
    if(type === "target"){
      let link = node.appendChild(document.createElement("a"));
      node.classList.add("hidden");
      link.href = `https://github.com/MrOtherGuy/firefox-csshacks/tree/master/chrome/${name}`;
      link.textContent = "Github";
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
        ns[i]++
      }
    }
    let map = ret.map((a,i)=>({name:a,value:ns[i]}))
    
    return map.sort((a,b)=>(a.value > b.value?-1:a.value < b.value ? 1:0))
  })();
  
  for(let cat of CAT_NAMES){
    CAT_PARENT.appendChild(createCategory(cat.name))
  }
  
}

document.onreadystatechange = (function () {
  if (document.readyState === "complete") {
    fetch("html_resources/tagmap.json")
    .then(response => {
     const contentType = response.headers.get('content-type');
     if (!contentType || !contentType.includes('application/json')) {
       throw new TypeError("Oops, we haven't got JSON!");
     }
     return response.json();
  })
  .then(json=>(initDB(json)))
  .then(()=>createCategories())
  .catch(e=>{console.log(e);document.getElementById("ui").textContent = "FAILURE, Database could not be loaded"});
  }
});