export const seed="550e8400-e29b-41d4-a716-446655440000";
export const cases=[1,100].map(count=>({name:`parse:${count}documents`,kb:seed.length*count/1024,input:Array(count).fill(seed).join('\0'),run:(api:any,input:string)=>input.split('\0').map(s=>api.parse(s))}));
