'use strict';

class CodeBlock extends HTMLElement{
  constructor(){
    super();
    let template = document.getElementById("code-block-template");
    let templateContent = template ? template.content : CodeBlock.Fragment();
    let cloned = templateContent.cloneNode(true);
    const shadowRoot = this.attachShadow({mode: 'open'})
    .appendChild(cloned);
    this.highlighter = {
      ready: false,
      waiting: false,
      fn: null,
      failed: false, 
      type: null,
      empty: true,
      linkGenerator: null,
      linkMatcher: null
    };
  }
  
  determineAndLoadContent(){
    CodeBlock.getSource(this.src)
    .then(
      (data) => this.consumeData(data,CodeBlock.InsertMode.Replace),
      (e) => {
        if(this.textContent.length){
          this.consumeData({content:this.textContent},CodeBlock.InsertMode.Replace);
        }
      }
    );
  }
  
  get name(){
    return this.dataset.name;
  }
  set name(some){
    this.dataset.name = some;
    this.shadowRoot.querySelector("caption").textContent = some;
  }
  
  connectedCallback(){
    if(!this.isConnected || this.initialized){
      return
    }
    if(this.dataset.matchlinks){
      let parts = this.dataset.matchlinks.split(" -> ");
      // this is kinda sketchy
      if(parts.length === 2){
        const from = parts[0];
        const to = parts[1];
        try{
          this.highlighter.linkMatcher = new RegExp(from,"g");
          this.highlighter.linkGenerator = (a) => (to.replace("%s",a));
        }catch(e){
          console.warn(e);
          this.highlighter.linkMatcher = null;
          this.highlighter.linkGenerator = null;
        }
      }
    }
    if(this.dataset.name){
      this.name = this.dataset.name
    }
    this.initialized = true;
    
    if(this.copyable){
      CodeBlock.addClipboardListenerTo(this);
    }
    
    if(this.highlighter.empty && this.dataset.highlight){
      CodeBlock.addHighlighterTo(this);
      return
    }

    this.determineAndLoadContent();
  }
  
  get copyable(){
    return this.classList.contains("copy-able")
  }
  
  static addHighlighterTo(elem){
    if(elem instanceof CodeBlock){
      elem.highlighter.empty = false;
      switch(elem.dataset.highlight){
        case "css":
        case "simple":
          elem.highlighter.type = elem.dataset.highlight;
          elem.highlighter.waiting = true;
          break;
        default:
          console.warn("invalid highlighter");
          elem.determineAndLoadContent();
          return
      }
      import("./code-block-highlighter.js")
      .then(it => {
        switch(elem.highlighter.type){
          case "css":
            elem.highlighter.fn = new it.CSSHighlighter();
            break;
          case "simple":
            elem.highlighter.fn = new it.SimpleHighlighter();
        }
        elem.highlighter.ready = true;
        elem.highlighter.waiting = false;
        elem.determineAndLoadContent()
      })
      .catch(e => {
        console.error(e);
        elem.highlighter.failed = true;
        ele.highlighter.waiting = false;
        elem.determineAndLoadContent()
      })
    }
  }
  
  clearContent(){
    let innerbox = this.codeBox;
    while(innerbox.children.length){
      innerbox.children[0].remove();
    }
  }
  
  static addClipboardListenerTo(aBlock){
    let copyButton = aBlock.copyButton;
    if(copyButton){
      return
    }
    copyButton = aBlock.shadowRoot.querySelector(".copy-button");
    aBlock.copyButton = copyButton;
   
    copyButton.addEventListener("click",(e) => {
      e.preventDefault();
      try{
        let writing = navigator.clipboard.writeText(aBlock.value);
        writing.then(()=>{
          copyButton.classList.add("copy-success");
          setTimeout(()=>copyButton.classList.remove("copy-success"),2000);
        });
        
      }catch(e){
        console.error("couldn't copy content to clipboard");
      }
      
    });
    aBlock.copyButton.removeAttribute("hidden");
  }
  static getSource(some){
    return new Promise((res, rej) => {
      if(some && typeof some === "string"){
        CodeBlock.TryLoadFile(some)
        .then(res)
        .catch((e)=>{
          console.error(e);
          rej(e)
        })
      }else{
        setTimeout(()=>rej("argument must be a string"));
      }
    })
  }
  
  async setSource(some){
    this.clearContent();
    let res = await CodeBlock.getSource(some);
    if(res.ok){
      this.consumeData(res,CodeBlock.InsertMode.Replace);
    }
    return { ok: res.ok }
  }
  
  get src(){
    return this.getAttribute("src")
  }
  set src(some){
    this.setSource(some);
  }
  
  lines(){
    const lines = this.codeBox.querySelectorAll("tr");
    const lineCount = lines.length;
    let currentLine = 0;
    return {
      next: function() {
          return currentLine < lineCount ? {
            value: lines[currentLine++],
            done: false
          } : { done: true }
      },
      [Symbol.iterator]: function() { return this; }
    }
  }
  
  getNamedSection(name){
    let i = 0;
    let sections = this.codeBox.children;
    while(i < sections.length){
      if(sections[i].dataset.name === name){
        return sections[i]
      }
      i++
    }
    return null
  }
  
  async consumeData(some,insertMode){
    const re = /.*\r?\n/g;
    if(typeof some.content !== "string"){
      some.content = some.content.toString();
    }
    this.textContent = "";
    
    let innerbox = this.codeBox;
    
    if(innerbox.children.length === 1 && innerbox.firstChild.textContent === ""){
      insertMode = CodeBlock.InsertMode.Replace;
    }
    const INSERT_MODE = insertMode || some.insertMode || CodeBlock.InsertMode.Append;
    
    const aDiv = document.createElement("div");
    if(some.name){
      aDiv.setAttribute("data-name",some.name);
    }
    
    const hasHighlighter = this.highlighter.ready;
    const LIMIT = 10000; // Arbitrary limit of 10k lines
    
    if(hasHighlighter){
      this.highlighter.fn.reset();
      const payload = {
        "match" : re.exec(some.content),
        "linkMatcher": this.highlighter.linkMatcher,
        "linkGenerator": this.highlighter.linkGenerator,
        "linkChanged": true,
      };
      Object.defineProperty(payload,"content",{get:()=>payload.match[0]});
      let counter = 0;
      let lastIdx = 0;
      
      while(payload.match && (counter++ < LIMIT)){
        aDiv.appendChild(CodeBlock.RowFragment.cloneNode(true));
        this.highlighter.fn.parse(
          payload,
          aDiv.lastElementChild.lastChild
        );
        payload.linkChanged = false;
        lastIdx = (payload.match.index + payload.match[0].length);
        payload.match = re.exec(some.content);
      }
      // Handle case where the content does not end with newline
      aDiv.appendChild(CodeBlock.RowFragment.cloneNode(true));
      if(lastIdx < some.content.length){
        payload.match = [some.content.slice(lastIdx)];
        this.highlighter.fn.parse(
          payload,
          aDiv.lastElementChild.lastChild
        );
      }
    }else{
      let match = re.exec(some.content);
      let counter = 0;
      let lastIdx = 0;
      
      while(match && (counter++ < LIMIT)){
        aDiv.appendChild(CodeBlock.RowFragment.cloneNode(true));
        aDiv.lastElementChild.lastChild.textContent = match[0];
        lastIdx = (match.index + match[0].length);
        match = re.exec(some.content);
      }
      // Handle case where the content does not end with newline
      aDiv.appendChild(CodeBlock.RowFragment.cloneNode(true));
      if(lastIdx < some.content.length){
        aDiv.lastElementChild.lastChild.textContent = some.content.slice(lastIdx);
      }
    }
    
    switch(INSERT_MODE){
      case CodeBlock.InsertMode.Prepend:
        aDiv.lastElementChild.lastElementChild.append("\n")
        innerbox.insertBefore(aDiv,innerbox.firstChild);
        break;
      case CodeBlock.InsertMode.Replace:
        this.clearContent();
      case CodeBlock.InsertMode.Append:
        // Push the first "line" of new section to the last line of old content, if old content exists
        if(innerbox.lastElementChild){
          let first = aDiv.firstChild.lastElementChild;
          let lastRowContent = this.lastContentLine;
          for(let one of Array.from(first.childNodes)){
            lastRowContent.appendChild(one)
          }
          aDiv.firstChild.remove();
        }
        if(aDiv.children.length){
          innerbox.appendChild(aDiv);
        }
        break;
      case CodeBlock.InsertMode.AppendLines:
        if(aDiv.children.length){
          let lastRowContent = this.lastContentLine;
          if(lastRowContent){
            lastRowContent.append("\n");
          }
          innerbox.appendChild(aDiv);
        }
        break;
      default:
        console.warn("unimplemented insertMode")
    }
    
  }
  
  get lastContentLine(){
    return this.codeBox.lastElementChild?.lastChild.lastChild;
  }
  
  get codeBox(){
    if(!this._codeBox){
      this._codeBox = this.shadowRoot.querySelector("tbody");
    }
    return this._codeBox;
  }
  get value(){
    return this.codeBox.textContent
  }
  
  get InsertModes(){
    return CodeBlock.InsertMode
  }
  
  set value(thing){
    if(typeof thing === "string"){
      this.consumeData({content:thing,insertMode:CodeBlock.InsertMode.Replace});
    }else if("content" in thing){
      this.consumeData(thing,CodeBlock.InsertMode.Replace);
    }else{
      this.consumeData({content: thing.toString(), insertMode: CodeBlock.InsertMode.Replace});
    }
  }
  
  insertContent(thing){
    if(typeof thing === "string"){
      this.consumeData({content:thing});
    }else if("content" in thing){
      this.consumeData(thing);
    }else{
      this.consumeData({content: thing.toString()});
    }
  }
  
  static InsertMode = {
    Replace : Symbol("replace"),
    Append : Symbol("append"),
    AppendLines : Symbol("appendlines"),
    Prepend : Symbol("prepend")
  }
  
  static async TryLoadFile(name){
    let response = await fetch(name);
    if(response.ok){
      let content = await response.text();
      return { content: content, ok: true }
    }else{
      throw {error: "no response", ok: false }
    }
  }
  
  static RowFragment = (() => {
    let frag = new DocumentFragment();
    let tr = frag.appendChild(document.createElement("tr"));
    tr.appendChild(document.createElement("td"));
    tr.firstChild.setAttribute("class","line-number");
    tr.appendChild(document.createElement("td"));
    return frag
  })();
  
  static Fragment(){
    let frag = new DocumentFragment();
    let link = document.createElement("link");
    link.setAttribute("as","style");
    link.setAttribute("type","text/css");
    link.setAttribute("rel","preload prefetch stylesheet");
    // Change the relative stylesheet address here if required
    link.setAttribute("href","html_resources/code-block/code-block.css");
    frag.appendChild(link);
    let outerBox = frag.appendChild(document.createElement("div"));
    outerBox.setAttribute("part","outerBox");
    outerBox.className = "outerBox";
    let copyButton = outerBox.appendChild(document.createElement("div"));
    copyButton.setAttribute("part","copyButton");
    copyButton.className = "copy-button";
    copyButton.setAttribute("hidden",true);
    copyButton.setAttribute("role","button");
    let table = document.createElement("table");
    let caption = table.appendChild(document.createElement("caption"));
    caption.setAttribute("part","title");
    let content = table.appendChild(document.createElement("tbody"));
    content.setAttribute("part","content");
    outerBox.appendChild(table)

    return frag
  }
}

customElements.define("code-block",CodeBlock);
