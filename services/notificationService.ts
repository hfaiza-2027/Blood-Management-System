import type { Notification } from "@/types";
import { mockNotifications } from "@/data/mockNotifications";
import { mock, dataCall, USE_MOCKS } from "./client";
export const notificationService={
 async list():Promise<Notification[]>{if(!USE_MOCKS)return dataCall<Notification[]>("notifications","list");const rows=[...mockNotifications].sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt));return mock(rows,250);},
 async markRead(ids:string[]){return USE_MOCKS?mock({ids},250):dataCall<{ids:string[]}>("notifications","markRead",{ids});},
 async markAllRead(){return USE_MOCKS?mock({ok:true},250):dataCall<{ok:boolean}>("notifications","markAllRead");},
 async unreadCount():Promise<number>{if(USE_MOCKS)return mockNotifications.filter(n=>!n.read).length;const r=await dataCall<{count:number}>("notifications","unreadCount");return r.count;},
 async broadcastHistory():Promise<{id:string;title:string;body:string;audience:string;sent:number;at:string}[]>{return USE_MOCKS?mock([]):dataCall<{id:string;title:string;body:string;audience:string;sent:number;at:string}[]>("notifications","broadcastHistory");},
 async broadcast(input:{title:string;body:string;audience:string}){return USE_MOCKS?mock({sent:input.audience==="all"?12486:1842},900):dataCall<{sent:number}>("notifications","broadcast",{input});},
};
