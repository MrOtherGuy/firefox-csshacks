'use strict';

class BaseHighlighter{
  constructor(){
    this.state = BaseHighlighter.createState();
  }
  reset(){
    this.state.reset();
  }
  parse(){
    if(!this.state.initialState){
      throw "This highlighter is not initialized";
    }
  }
  static createState(){
    return new (function(){
      this.token = "";
      let current = null;
      let previous = null;
      let initialState = null;
      this.set = (a) => {
        previous = current;
        current = a;
        return
      }
      this.now = () => current;
      this.previous = ()=> previous;
      this.initializeTo = (some) => { initialState = some }
      this.reset = () => {
        this.token = "";
        previous = initialState;
        current = initialState;
      }
    })();
  }
  static BaseState = Symbol("base");
}

class SimpleHighlighter extends BaseHighlighter{
  constructor(){
    super();
    this.state.initializeTo(BaseHighlighter.BaseState);
  }
  static State = {
    SingleQuote : Symbol("quote"),
    DoubleQuote : Symbol("quote")
  }
  
  parse(info,targetNode){
    if(info.content.length > 0){
      SimpleHighlighter.parseSimple(info,this.state,targetNode);
    }
    if(this.state.token){
      throw "simple token is not 0"
    }
    this.state.token = "";
  }
  
  static parseSimple(info,state,target){
    let pointer = 0;
    let currentState = state.now();
    const length = info.content.length;
    while(pointer < length){
      let character = info.content[pointer++];
      if(character === "\r"){
        continue
      }
      currentState = state.now();
      switch(currentState){
        case BaseHighlighter.BaseState:
          switch(character){
            case "\"":
              target.append(state.token);
              state.token = "\"";
              state.set(SimpleHighlighter.State.DoubleQuote);
              break;
            case "'":
              targetNode.append(state.token);
              state.token = "'";
              state.set(SimpleHighlighter.State.SingleQuote);
              break;
            default:
              state.token += character;
          }
          break;
        case SimpleHighlighter.State.SingleQuote:
          switch(character){
            case "'":
              target.appendChild(SimpleHighlighter.createQuote()).textContent = state.token + "'";
              state.token = "";
              state.set(BaseHighlighter.BaseState);
              break;
            default:
              state.token += character;
          }
          break;
        case SimpleHighlighter.State.DoubleQuote:
          switch(character){
            case "\"":
              target.appendChild(SimpleHighlighter.createQuote()).textContent = state.token + "\"";
              state.token = "";
              state.set(BaseHighlighter.BaseState);
              break;
            default:
              state.token += character;
          }
          break
      }
    }
    if(state.token.length > 0){
      if(currentState === BaseHighlighter.BaseState){
        target.append(state.token);
        state.token = "";
      }else{
        target.appendChild(SimpleHighlighter.createQuote()).textContent = state.token;
      }
    }
  }
  
  static createQuote(){
    let n = document.createElement("span");
    n.className = "quote";
    return n
  }
}

class CSSHighlighter extends BaseHighlighter{
  constructor(){
    super();
    this.state.initializeTo(CSSHighlighter.State.Selector);
    this.state.curly = false;
    this.state.fnLevel = 0;
    this.state.generateLinks = false;
  }
  
  reset(){
    this.state.reset();
    this.state.curly = false;
    this.state.fnLevel = 0;
  }
  
  parse(info,targetNode){
    if(info.content.length > 0){
      CSSHighlighter.parseCSS(info,this.state,targetNode);
    }
    if(this.state.token){
      throw "CSS token is not 0"
    }
    this.state.token = "";
  }
  
  static parseCSS(info,state,targetNode){
    
    state.generateLinks = (info.linkMatcher instanceof RegExp) && (typeof info.linkGenerator === "function");
    
    if(state.generateLinks && info.linkChanged){
      if (info.linkGenerator != state.linkGenerator){
        state.linkGenerator = info.linkGenerator;
      }
      if (info.linkMatcher != state.linkMatcher){
        state.linkMatcher = info.linkMatcher;
      }
    }
    
    let currentState;
    const chars = Array.from(info.content);
    if(info.content.endsWith("\r\n")){
      chars[chars.length - 2] = "\n";
      chars.pop();
    }
    const length = chars.length;
    let tokenStart = 0;
    let pointer = 0;
    while(pointer < length){
      let character = chars[pointer];
      currentState = state.now();
      switch(currentState){
      
        case CSSHighlighter.State.Selector:
          switch(character){
            case "/":
              if(chars[pointer+1] === "*"){
                state.set(CSSHighlighter.State.Comment);
                if(pointer - tokenStart > 0){
                  state.token = chars.slice(tokenStart,pointer).join("");
                  CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.Selector,targetNode);
                }
                tokenStart = pointer;
                pointer++;
              }
              break;
            case "{":
              state.set(CSSHighlighter.State.Property);
              state.token = chars.slice(tokenStart,pointer).join("");
              CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.Selector,targetNode);
              tokenStart = pointer + 1;
              targetNode.appendChild(CSSHighlighter.addBracket("{"));
              break;
            case "}":
              state.token = chars.slice(tokenStart,pointer).join("");
              CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.Text,targetNode);
              tokenStart = pointer + 1;
              
              targetNode.appendChild(CSSHighlighter.addBracket("}"));
              
              break;
            case "@":
              state.set(CSSHighlighter.State.AtRule);
          }
          break;
      
        case CSSHighlighter.State.Comment:
          if(character === "*"){
            if(chars[pointer+1] === "/"){
              pointer++;
              state.token = chars.slice(tokenStart,pointer+1).join("");
              state.set(state.previous());
              CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.Comment,targetNode);
              
              tokenStart = pointer + 1;
              break
            }
          }
          break;

        case CSSHighlighter.State.Property:
          switch(character){
            case "/":
              if(chars[pointer+1] === "*"){
                state.set(CSSHighlighter.State.Comment);
              }
              break;
            case ":":
              state.token = chars.slice(tokenStart,pointer+1).join("");
              CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.Property,targetNode);
              state.set(CSSHighlighter.State.Value);
              tokenStart = pointer + 1;
              break;
            case "}":
              state.token = chars.slice(tokenStart,pointer).join("");
              CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.Text,targetNode);
              state.set(CSSHighlighter.State.Selector);
              tokenStart = pointer + 1;
              targetNode.appendChild(CSSHighlighter.addBracket("}"));
          }
          break;
        case CSSHighlighter.State.Value:
          let createToken = true;
          let indexOffset = 1;
          switch(character){
            case ";":
              state.set(CSSHighlighter.State.Property);
              break;
            case "}":
              indexOffset = 0;
              state.set(CSSHighlighter.State.Selector);
              break;
            case "(":
              state.fnLevel++;
              state.set(CSSHighlighter.State.Function);
              break;
            default:
              createToken = false;
          }
          if(createToken){
            state.token = chars.slice(tokenStart,pointer+indexOffset).join("");
            CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.Value,targetNode);
            tokenStart = pointer + 1;
            if(indexOffset === 0){
              targetNode.appendChild(CSSHighlighter.addBracket("}"))
            }
          }
          break;
        case CSSHighlighter.State.AtRule:
          switch(character){
            case " ":
              state.token = chars.slice(tokenStart,pointer+1).join("");
              CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.AtRule,targetNode);
              state.set(CSSHighlighter.State.AtValue);
              tokenStart = pointer + 1;
          }
          break;
        case CSSHighlighter.State.AtValue:
          let idxOffset = 0;
          switch(character){
            case ";":
              idxOffset = 1;
            case "{":
              state.token = chars.slice(tokenStart,pointer + idxOffset).join("");
              CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.AtValue,targetNode);
              state.set(CSSHighlighter.State.Selector);
              tokenStart = pointer + 1;
              if(!idxOffset){
                targetNode.appendChild(CSSHighlighter.addBracket("{"));
              }
            default:
          }
          break
        case CSSHighlighter.State.Function:
          switch(character){
            case ")":
              state.fnLevel--;
              if(state.fnLevel === 0){
                state.token = chars.slice(tokenStart,pointer).join("");
                CSSHighlighter.createElementFromToken(state,CSSHighlighter.State.Function,targetNode);
                tokenStart = pointer;
                state.set(CSSHighlighter.State.Value);
              }
              break;
            case "}":
              state.fnLevel = 0;
              state.set(CSSHighlighter.State.Selector);
          }
      }
      pointer++
    }
    if(pointer > tokenStart){
      state.token = chars.slice(tokenStart,pointer).join("");
      CSSHighlighter.createElementFromToken(state,currentState,targetNode);
    }
    state.token = "";
  }
  
  static State = {
    Selector: Symbol("selector"),
    Text:     Symbol("text"),
    Comment:  Symbol("comment"),
    Property: Symbol("property"),
    Value:    Symbol("value"),
    AtRule:   Symbol("atrule"),
    AtValue:  Symbol("atvalue"),
    Function: Symbol("function"),
    Curly:    Symbol("curly")
  }
  
  static selectorToClassMap = new Map([
    [":","pseudo"],
    ["#","id"],
    [".","class"],
    ["[","attribute"]
  ]);
  
  static addBracket(n){
    let span = document.createElement("span");
    span.className = "curly";
    span.textContent = n;
    return span
  }
  
  static createElementFromToken(state,type,targetNode){
    if(state.token.length === 0){
      return
    }
    let n = document.createElement("span");
    switch(type){
      case CSSHighlighter.State.Selector:
      // This isn't exactly correct, but it works because parser treats \r\n sequences that follow a closed comment as "selector"
        //rulesetUnderConstruction = createNewRuleset();
        let parts = state.token.split(/([\.#:\[]\w[\w-_"'=\]]*|\s\w[\w-_"'=\]]*)/);
      
        for(let part of parts){
          if(part.length === 0){
            continue
          }
          let character = part[0];
          switch (character){
            case ":":
            case "#":
            case "[":
            case ".":
              let p = n.appendChild(document.createElement("span"));
              p.className = CSSHighlighter.selectorToClassMap.get(character);
              p.textContent = part;
              break;
            default:
              n.append(part);
          }
        }
        break
      case CSSHighlighter.State.Comment:
        if(state.generateLinks){
          let linksToFile = state.token.match(state.linkMatcher);
          if(linksToFile && linksToFile.length){
            const transformed = linksToFile.map(state.linkGenerator);
            n.append(CSSHighlighter.createLinksFromMatchingToken(linksToFile,transformed,state));
            break;
          }
        }
        n.textContent = state.token;
        break;
      case CSSHighlighter.State.Value:
        let startImportant = state.token.indexOf("!important");
        if(startImportant === -1){
          n.textContent = state.token;
        }else{
          n.textContent = state.token.substr(0,startImportant);
          let importantTag = document.createElement("span");
          importantTag.className = "important-tag";
          importantTag.textContent = "!important";
          n.appendChild(importantTag);
          if(state.token.length > (9 + startImportant)){
            n.append(state.token.substr(startImportant + 10))
          }
        }
        break;
      case CSSHighlighter.State.Function:
        n.textContent = state.token;
        break
      default:
        n.textContent = state.token;
    }
    
    n.className = (`token ${type.description}`);
    
    targetNode.appendChild(n);
    return
  }
  static createLinksFromMatchingToken(parts,transformed,state){
    let frag = new DocumentFragment();
    let linkIdx = 0;
    let fromIdx = 0;
    while(linkIdx < parts.length){
      let part = parts[linkIdx];
      let idx = state.token.indexOf(part);
      frag.append(state.token.substring(fromIdx,idx));
      let link = document.createElement("a");
      link.textContent = part;
      link.href = transformed[linkIdx++];
      link.target = "_blank";
      frag.appendChild(link);
      fromIdx = idx + part.length;
    }
    frag.append(state.token.substring(fromIdx));
    return frag
  }
}

export { CSSHighlighter,SimpleHighlighter }