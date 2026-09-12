// Narrow interpreter substitute for the AE 26.0 observation: ungrouped return chains
// containing || followed by && evaluate left to right. Explicit groups remain intact.
// Not a full ExtendScript interpreter. No TBB names/formulas/guards are copied here.
function tokens(source) {
    const pattern=/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_$][\w$]*|&&|\|\||[^\s]/g;
    return Array.from(source.matchAll(pattern),m=>({text:m[0],start:m.index,end:m.index+m[0].length})).filter(t=>!t.text.startsWith('//')&&!t.text.startsWith('/*'));
}
function logicalReturns(source) {
    const list=tokens(source),edits=[];
    for(let i=0;i<list.length;i++){
        if(list[i].text!=='return')continue;
        const start=list[i].end;let depth=0,end=null;const operators=[];
        for(let j=i+1;j<list.length;j++){
            const t=list[j];
            if(['(','[','{'].includes(t.text))depth++;
            if([')',']','}'].includes(t.text))depth--;
            if(depth<0)break;
            if(depth===0&&t.text===';'){end=t.start;break;}
            if(depth===0&&(t.text==='&&'||t.text==='||'))operators.push(t);
        }
        if(end===null||!operators.some((o,n)=>o.text==='||'&&operators.slice(n+1).some(x=>x.text==='&&')))continue;
        let value=source.slice(start,operators[0].start).trim();
        for(let n=0;n<operators.length;n++){
            const op=operators[n],right=source.slice(op.end,n+1<operators.length?operators[n+1].start:end).trim();
            value='('+value+' '+op.text+' '+right+')';
        }
        edits.push({start,end,replacement:' '+value});
    }
    for(const e of edits.reverse())source=source.slice(0,e.start)+e.replacement+source.slice(e.end);
    return source;
}
module.exports={logicalReturns};
