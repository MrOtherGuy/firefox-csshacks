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
      for(let child of Array.from(secondaryCategoriesNode.children)){
        matchingSecondaries.includes(child.textContent) ? child.classList.remove("hidden") : child.classList.add("hidden")
      }
      
      //secondaryCategoriesNode.classList.remove("hidden");
      document.getElementById("categories").classList.add("blurred");
    }else{
      //secondaryCategoriesNode.classList.add("hidden");
      document.getElementById("categories").classList.remove("blurred");
      
    }
  }
  
  for(let c of Array.from(document.querySelectorAll(".target"))){
    fileNames.includes(getText(c)) ? c.classList.remove("hidden") : c.classList.add("hidden");
  }
  document.getElementById("targets").setAttribute("style",`--grid-rows:${Math.ceil(fileNames.length/3)}`)
}

async function onTargetClicked(targetNode){
  const codeBlock = document.querySelector("pre");
  fetchWithType(`chrome/${getText(targetNode)}`)
  //.then(text => (codeBlock.textContent = text))
  .then(text => Highlighter.parse(codeBlock,text))
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

const Highlighter = new(function(){

  let state = 0;
  let pointer = 0;
  let token = "";

  function createToken(type){
    let n = document.createElement("span");
    n.textContent = token;
    n.className = (`token ${type}`);
    token = "";
    return n
  }

  this.parse = function(node,text){
    for(let e of Array.from(node.childNodes)){
      node.removeChild(e)
    }
    let c;
    while(pointer < text.length){
      c = text[pointer];
      token+=c;
      switch(state){
      
        case 0:
          switch(c){
            case "/":
              if(text[pointer+1] === "*"){
                state = 2;
              }
              break;
            case "{":
              state = 3;
              node.appendChild(createToken("selector"));
              break;
            case "@":
              state = 5;
              break
            default:
              false
          }
          
          break;
      
        case 2:
          switch(c){
            case "*":
              if(text[pointer+1] === "/"){
                token += "/";
                pointer++;
                state = 0;
                node.appendChild(createToken("comment"));
              }
              break;
            default:
              false
          }
          break;

        case 3:
          switch(c){
            case ":":
              node.appendChild(createToken("property"));
              state = 4;
              break;
            case "}":
              node.appendChild(createToken("text"));
              state = 0;
              break;
            default:
              false
          }
          break;
        case 4:
          switch(c){
            case ";":
              node.appendChild(createToken("value"));
              state = 3;
              break;
            case "}":
              node.appendChild(createToken("value"));
              state = 0;
              break;
            default:
              false
          }
          break;
        case 5:
          switch(c){
            case " ":
              node.appendChild(createToken("atrule"));
              state = 6;
            default:
             false
          }
          break;
        case 6:
          switch(c){
            case ";":
            case "{":
              node.appendChild(createToken("atvalue"));
              state = 0;
              break;
            default:
             false
          }
          break
        default:
          false
      }
      
      

      pointer++
    }
    node.appendChild(createToken("text"));
    token = "";
    state = 0;
    pointer = 0;
    
    return
  }
  return this
})();

document.onreadystatechange = (function () {
  if (document.readyState === "complete") {
    fetchWithType("html_resources/tagmap.json")
    .then(response=>(initDB(response)))
    .then(()=>createCategories())
    .catch(e=>{console.log(e);document.getElementById("ui").textContent = "FAILURE, Database could not be loaded"});
  }
});