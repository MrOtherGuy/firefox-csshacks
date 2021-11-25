'use strict';

let DB = null;

function initDB(obj){
  DB = obj.content;
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
        .then((obj) => resolve({file:url,content:obj}));
      }else{
        response.text()
        .then((text) => resolve({file:url,content:text}))
        
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

function clearCodeBlock(){
  const pre = document.getElementById("previewBox");
  for(let el of Array.from(pre.childNodes)){
    pre.removeChild(el)
  }
  return
}

function showMatchingTargets(fileNames,setSelected = false){
  let bonus = 0;
  for(let c of Array.from(document.querySelectorAll(".target"))){
    if(fileNames.includes(getText(c))){
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
  document.getElementById("targets").setAttribute("style",`--grid-rows:${Math.ceil(fileNames.length/3)}`)
}

function onCategoryClicked(categoryNode,isSecondary = false){
  
  currentCategory.set(categoryNode,isSecondary);
  
  let secondaryCategoriesNode = document.querySelector("#secondaryCategories");
  let fileNames = currentCategory.getFileNames(categoryNode,isSecondary);
  if(!isSecondary){
    
    if(fileNames.length > 9){
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
              : getText(target);
  
  fetchWithType(`chrome/${text}`)
  .then(obj => Highlighter.parse(obj,append))
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
      let preview = document.querySelector(`[data-filename="chrome/${box.getAttribute("title")}.css"]`);
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
    history.replaceState(state_object,"",`?file=${t.join(",")}`);
  }
})();

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
      
      let link = node.appendChild(document.createElement("a"));
      node.classList.add("hidden");
      link.href = `https://github.com/MrOtherGuy/firefox-csshacks/tree/master/chrome/${name}`;
      link.title = "See on Github";
      link.target = "_blank";
      const content = name.substring(0,name.lastIndexOf("."));
      node.append(content);
      node.setAttribute("title",content);
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

  this.parse = function(info,appendMode){
    
    const targetNode = document.getElementById("previewBox");
    
    !appendMode && clearCodeBlock();
    
    let node = document.createElement("div");
    node.setAttribute("data-filename",info.file);
    
    function createNewRuleset(){
      let ruleset = document.createElement("span");
      ruleset.className = "ruleset";
      node.appendChild(ruleset);
      return ruleset
    }
    
    let rulesetUnderConstruction = createNewRuleset();

    function createElementFromToken(type,c){
      if(token.length === 0 && !c){
        return
      }
      let n = document.createElement("span");
      
      switch(type){
        case "selector":
        // This isn't exactly correct, but it works because parser treats \r\n sequences that follow a closed comment as "selector"
          rulesetUnderConstruction = createNewRuleset();
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
          break
        case "comment":
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
            n.textContent = c || token;
          }
          break;
        case "value":
          let startImportant = token.indexOf("!");
          if(startImportant === -1){
            n.textContent = c || token;
          }else{
            n.textContent = token.substr(0,startImportant);
            let importantTag = document.createElement("span");
            importantTag.className = "important-tag";
            importantTag.textContent = "!important";
            n.appendChild(importantTag);
            if(token.length > (9 + startImportant)){
              n.append(";")
            }
          }
          break;
        case "function":
          n.textContent = c || token.slice(0,-1);
          break
        default:
          n.textContent = c || token;
      }
      
      n.className = (`token ${type}`);
      token = "";
      rulesetUnderConstruction.appendChild(n);
      return
    }
    
    let c;
    let functionValueLevel = 0;
    let curly = false;
    
    while(pointer < info.content.length){
      c = info.content[pointer];
      
      const currentState = state.now();
      curly = currentState != 2 && (c === "{" || c === "}");
      if(!curly){
        token+=c;
      }
      switch(currentState){
      
        case 0:
          switch(c){
            case "/":
              if(info.content[pointer+1] === "*"){
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
              if(info.content[pointer+1] === "/"){
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
              if(info.content[pointer+1] === "*"){
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
              break;
            case "(":
              createElementFromToken("value");
              functionValueLevel++;
              state.set(7);
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
        case 7:
          switch(c){
            case ")":
              functionValueLevel--;
              if(functionValueLevel === 0){
                createElementFromToken("function");
                token = ")";
                state.set(4);
              }
              break;
            case "}":
              functionValueLevel = 0;
              state.set(0)
          }
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
    
    if(info.file.endsWith("support.css")){
      targetNode.prepend(node);
    }else{
      targetNode.appendChild(node);
    }
    return
  }
  return this
})();

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
    
    if(files.length === 0 ){
      return
    }
 
    const promises = files.map(file=>fetchWithType(`chrome/${file}`).catch(e=>""));
    
    Promise.all(promises)
    .then(responses => {
      showMatchingTargets(files,true);
      responses.forEach(Highlighter.parse)
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
      if(ev.target instanceof HTMLAnchorElement){
        let ref = ev.target.href;
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