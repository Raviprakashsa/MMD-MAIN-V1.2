const fs = require('fs');
const path = require('path');
const file = path.resolve(process.argv[2]);
const src = fs.readFileSync(file,'utf8');
// find import lines
const importRegex = /import\s+\{([\s\S]*?)\}\s+from\s+['\"]([\w\-@\/]+)['\"]/g;
let m;
const imports = [];
while((m = importRegex.exec(src))!==null){
  const names = m[1].split(',').map(s=>s.trim()).filter(Boolean);
  const from = m[2];
  imports.push({names,from,raw:m[0],index:m.index});
}
const results = [];
for(const imp of imports){
  for(const name of imp.names){
    // skip default like React,
    if(name.includes(' as ')) continue;
    const regex = new RegExp('\\b'+name+'\\b','g');
    // count occurrences
    const matches = src.match(regex) || [];
    // subtract one if appears in the import statement
    const count = matches.length - 1;
    results.push({name,from:imp.from,count});
  }
}
console.log(JSON.stringify(results,null,2));
