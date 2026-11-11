export const seed="2001:db8:85a3:0:0:8a2e:370:7334";
export const cases=[1,100].map(count=>({name:`parse:${count}documents`,kb:seed.length*count/1024,input:Array(count).fill(seed).join('\0'),run:(api:any,input:string)=>input.split('\0').map(s=>api.parse(s))}));
