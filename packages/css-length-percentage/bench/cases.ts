export const seed="12px";
export const cases=[1,100].map(count=>({name:`parse:${count}documents`,kb:seed.length*count/1024,input:Array(count).fill(seed).join('\0'),run:(api:any,input:string)=>input.split('\0').map(s=>api.parse(s))}));
