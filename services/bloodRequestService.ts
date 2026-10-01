import type { BloodRequest, BloodRequestInput, GeoPoint, RequestStatus } from "@/types";
import { mockRequests } from "@/data/mockRequests";
import { mockHospitals } from "@/data/mockHospitals";
import { distanceKm } from "@/lib/geo";
import { loc } from "@/data/locations";
import { mock, dataCall, USE_MOCKS } from "./client";
import { now } from "@/lib/utils";
export type RequestWithDistance = BloodRequest & { distanceKm:number };
const OPEN:RequestStatus[]=["pending","approved","matching","donor_found","partially_fulfilled"];
export const isOpen=(r:BloodRequest)=>OPEN.includes(r.status);
export const bloodRequestService={
 async list(origin?:GeoPoint):Promise<RequestWithDistance[]>{ if(!USE_MOCKS)return dataCall<RequestWithDistance[]>("bloodRequests","list",{origin}); const rows=mockRequests.map(r=>({...r,distanceKm:origin?distanceKm(origin,r.location.point):0})); return mock(rows); },
 async listMine(userId:string){return USE_MOCKS?mock(mockRequests.filter(r=>r.requesterId===userId)):dataCall<BloodRequest[]>("bloodRequests","listMine",{userId});},
 async getById(id:string){return USE_MOCKS?mock(mockRequests.find(r=>r.id===id||r.code===id)):dataCall<BloodRequest|undefined>("bloodRequests","getById",{id});},
 async nearbyEmergencies(origin:GeoPoint,radiusKm=25){if(!USE_MOCKS){const rows=await dataCall<RequestWithDistance[]>("bloodRequests","nearbyPublic",{origin,radiusKm});return rows.filter(r=>isOpen(r)&&r.urgency!=="normal"&&r.distanceKm<=radiusKm).sort((a,b)=>a.distanceKm-b.distanceKm);} const rows=mockRequests.filter(r=>isOpen(r)&&r.urgency!=="normal").map(r=>({...r,distanceKm:distanceKm(origin,r.location.point)})).filter(r=>r.distanceKm<=radiusKm).sort((a,b)=>a.distanceKm-b.distanceKm);return mock(rows);},
 async create(input:BloodRequestInput,requester:{id:string;name:string}){if(!USE_MOCKS)return dataCall<BloodRequest>("bloodRequests","create",{input,requester});const h=mockHospitals.find(x=>x.id===input.hospitalId);const created=now().toISOString();const req:BloodRequest={id:`r-${Date.now()}`,code:`REQ-${24200+Math.floor(Math.random()*700)}`,requesterId:requester.id,requesterName:requester.name,patientName:input.patientName,patientAge:input.patientAge,bloodGroup:input.bloodGroup,unitsRequired:input.unitsRequired,unitsFulfilled:0,hospitalId:input.hospitalId,hospitalName:h?.name??"Hospital",location:loc(h?.city??input.city,h?.area??""),requiredBy:input.requiredBy,urgency:input.urgency,reason:input.reason,contactNumber:input.contactNumber,notes:input.notes,status:"pending",donorsContacted:0,createdAt:created,timeline:[{status:"pending",at:created,note:"Request submitted"}]};return mock(req,1000);},
 async respond(requestId:string){return USE_MOCKS?mock({requestId,accepted:true},700):dataCall<{requestId:string;accepted:boolean}>("bloodRequests","respond",{requestId});},
 async updateStatus(requestId:string,status:RequestStatus){return USE_MOCKS?mock({requestId,status},500):dataCall<{requestId:string;status:RequestStatus}>("bloodRequests","updateStatus",{requestId,status});},
 async cancel(requestId:string){return USE_MOCKS?mock({requestId,status:"cancelled" as const},600):dataCall<{requestId:string;status:"cancelled"}>("bloodRequests","cancel",{requestId});},
 async openEmergencyCount():Promise<number>{if(USE_MOCKS)return mockRequests.filter(r=>isOpen(r)&&r.urgency==="emergency").length;return (await dataCall<{count:number}>("bloodRequests","openEmergencyCount")).count;},
 async assignDonors(requestId:string,donorIds:string[]){return USE_MOCKS?mock({requestId,assigned:donorIds.length},600):dataCall<{requestId:string;assigned:number}>("bloodRequests","assignDonors",{requestId,donorIds});},
};
