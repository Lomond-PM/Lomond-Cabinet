import {DATA} from './production-data.js';
export const locale={value:'en'};
const keys=new Map(Object.entries(DATA.dictionaries.en).filter(([key])=>key.startsWith(['reference','ui',''].join('.'))).map(([key,value])=>[value,key]));
// Source copy is a lookup value, never a user asset name or a schema identifier.
export function copy(source,values={}){const key=keys.get(source),text=key?(DATA.dictionaries[locale.value]?.[key]||source):source;return text.replace(/\{(\w+)\}/g,(_,name)=>values[name]??'{'+name+'}');}
