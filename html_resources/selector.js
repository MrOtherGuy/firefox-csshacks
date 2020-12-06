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

function clearCodeBlock(){
  const pre = document.getElementById("previewBox");
  for(let el of Array.from(pre.childNodes)){
    pre.removeChild(el)
  }
  return
}

function onCategoryClicked(categoryNode,isSecondary = false){
  
  clearCodeBlock();
  
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
  CAT_PARENT.addEventListener("click",onSomeClicked,{passive:true});
  CAT_SECOND.addEventListener("click",onSomeClicked,{passive:true});
  
  const TAR_PARENT = document.getElementById("targets");
  TAR_PARENT.addEventListener("click",onSomeClicked,{passive:true});
  
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

  const state = new (function(){
    let current = 0;
    let previous = 0;
    this.now = ()=>current;
    this.previous = ()=>previous;
    this.set = function(a){ previous = current; current = a; return} 
  })();
  
  let pointer = 0;
  let token = "";
  
  const selectorToClassMap = new Map([
  [":","pseudo"],
  ["#","id"],
  [".","class"],
  ["[","attribute"]]);

  this.parse = function(targetNode,text){
    
    clearCodeBlock();
    let node = document.createElement("div");
       
    function createElementFromToken(type,c){
      if(token.length === 0 && !c){
        return
      }
      let n = document.createElement("span");
      
      
      if(type==="selector"){
        
        let parts = token.split(/([\.#:\[]\w[\w-_"'=\]]*|\s\w[\w-_"'=\]]*)/);
        
        for(let part of parts){
          if(part.length === 0){
            continue
          }
          let c = part[0];
          switch (c){
            case ":":
            case "#":
            case "[":
            case ".":
              let p = n.appendChild(document.createElement("span"));
							p.className = selectorToClassMap.get(c);
              p.textContent = part;
              break;
            default:
              n.append(part);
          }
        }
        
        
      } else if(type === "comment"){
        let linksToFile = token.match(/[\w-\.]+\.css/g);
        if(linksToFile && linksToFile.length){
          let linkIdx = 0;
          let fromIdx = 0;
          while(linkIdx < linksToFile.length){
            let part = linksToFile[linkIdx++];
            let idx = token.indexOf(part);
            n.append(token.substring(fromIdx,idx));
            let link = document.createElement("a");
            link.textContent = part;
            link.href = `https://github.com/MrOtherGuy/firefox-csshacks/tree/master/chrome/${part}`;
            link.target = "_blank";
            n.appendChild(link);
            fromIdx = idx + part.length;
          }
          n.append(token.substring(fromIdx));
        }else{
          n.textContent = c || token
        }
      }
      else{
        n.textContent = c || token;
      }
      
      n.className = (`token ${type}`);
      token = "";
      node.appendChild(n);
      return
    }
    
    let c;
    let curly = false;
    while(pointer < text.length){
      c = text[pointer];
      const currentState = state.now();
      curly = currentState != 2 && (c === "{" || c === "}");
      if(!curly){
        token+=c;
      }
      switch(currentState){
      
        case 0:
          switch(c){
            case "/":
              if(text[pointer+1] === "*"){
                state.set(2);
                if(token.length > 1){
                  token = token.slice(0,-1);
                  createElementFromToken("selector");
                  token += "/"
                }
              }
              break;
            case "{":
              state.set(3);
              createElementFromToken("selector");
              break;
            case "}":
              createElementFromToken("text");
              break;
            case "@":
              state.set(5);
          }
          
          break;
      
        case 2:
          switch(c){
            case "*":
              if(text[pointer+1] === "/"){
                token += "/";
                pointer++;
                state.set(state.previous());
                createElementFromToken("comment");
              }
          }
          break;

        case 3:
          switch(c){
            case "/":
              if(text[pointer+1] === "*"){
                state.set(2);
              }
              break;
            case ":":
              createElementFromToken("property");
              state.set(4);
              break;
            case "}":
              createElementFromToken("text");
              state.set(0);
          }
          break;
        case 4:
          switch(c){
            case ";":
              createElementFromToken("value");
              state.set(3);
              break;
            case "}":
              createElementFromToken("value");
              state.set(0);
          }
          break;
        case 5:
          switch(c){
            case " ":
              createElementFromToken("atrule");
              state.set(6);
          }
          break;
        case 6:
          switch(c){
            case ";":
            case "{":
              createElementFromToken("atvalue");
              state.set(0);
          }
          break
        default:
          false
      }
      
      curly && createElementFromToken("curly",c);
      

      pointer++
    }
    createElementFromToken("text");
    token = "";
    state.set(0);
    pointer = 0;
    
    targetNode.appendChild(node);
    
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