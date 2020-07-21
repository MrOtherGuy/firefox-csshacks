#!/usr/bin/env python3

#
# usage:
#   add_style.py <file_name> <tags>
# where <tags> is a space-separated list of tags to apply for that style (1 minimum)
# OR
#   add_style-py --update-only
#
# When called with <file_name> <tags> it will create a new file to chrome/ folder and
# update tags.csv and docs/tagmap.json
#
# With --update-only it will only update docs/tagmap.json based on tags.csv

import sys, os

def filterEmpty(list):
    for i in range(2,len(list)):
        if list[i] == "":
            del list[i]

def createJSON(tagmap,filename,args,onlyupdate):
    charBuffer = "{\n"
    map_last = len(tagmap) - 1
    n_line=0
    for line in tagmap:
        tokens = line.rsplit(",")
        filterEmpty(tokens)
        if len(tokens) < 2:
            continue
        charBuffer += "\"{}\":[".format(tokens[0])
        for t in range(1,len(tokens)):
     #      if len(tokens[t]) > 0:
            charBuffer += "\"{}\"".format(tokens[t])
            if t < len(tokens)-1:
                charBuffer += ","
        if(n_line < map_last):
            charBuffer += "],\n"
            
        else:
            if onlyupdate:
                charBuffer += "]\n}"
                break
            else:
                charBuffer += "],\n"
        n_line += 1
    if not(onlyupdate):
        charBuffer += "\"{}\":[".format(filename)
        for t in range(0,len(args)):
            charBuffer += "\"{}\"".format(args[t])
            if t < len(args) - 1:
                charBuffer += ","
        charBuffer += "]\n}"
    
    with open("html_resources/tagmap.json","w") as json:
      print(charBuffer,file=json)
      print("wrote JSON\n")
       

def searchFile(tagmap,name):
    for line in tagmap:
        if name in line:
            return True
    return False

def createNewFile(name,folder):
    filesuffix = "{}/{}".format(folder,name)
    text = "/* Source file https://github.com/MrOtherGuy/firefox-csshacks/tree/master/{} made available under Mozilla Public License v. 2.0\nSee the above repository for updates as well as full license text. */\n".format(filesuffix)
    
    if os.path.isfile(filesuffix):
        confirm = input("File {} already exists! proceed (will overwrite) ? [y/N] ".format(filesuffix))
        if confirm != "y":
            print("Aborted")
            return False
    
    
    with open(filesuffix,"w") as css:
        print(text,file=css)
        print("Created file: {}".format(filesuffix))
        return True

def isUpdateOnly(argv):
    return (argv[1] == "--update-only") or (argv[1] == "-update-only") or (argv[1] == "-u")
    

if __name__ == "__main__":

    update_only = isUpdateOnly(sys.argv)

    if len(sys.argv) < (2 + (0 if update_only else 1)):
        print("usage: add_file.py <filename> <list_of_tags>")
        exit()

    args = []
    for i in range (2,(len(sys.argv))):
        args.append(sys.argv[i])
    
    name = sys.argv[1]
    
    if not(update_only) and not(name.endswith(".css")):
        name += ".css"
    # For the moment files in content/ are not tagged, but the script can still create the css files
    folder = "content" if ("-content" in sys.argv) else "chrome"
    
    if(folder == "content") and not(update_only):
        createNewFile(name,folder)
        print("Done")
        exit(0)
    
    tagfile = open("tags.csv")

    tagmap = tagfile.read().lstrip().splitlines()
    tagfile.close()
    if not(update_only) and searchFile(tagmap,name):
        print(name + "exist already")
    else:
        if not(update_only):
            exists = createNewFile(name,folder)
            tagfile = open("tags.csv","a")
            tagfile.write(name+","+",".join(args)+"\n")
            tagfile.close()
        else:
            print("Only update json")
        createJSON(tagmap,name,args,update_only)
    print("Done")
    exit(0)
