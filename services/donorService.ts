import type { Donor, DonorSearchFilters, GeoPoint, NearbyDonor } from "@/types";
import { mockDonors } from "@/data/mockDonors";
import { canReceiveFrom } from "@/lib/constants";
import { coarsen, distanceKm } from "@/lib/geo";
import { daysBetween, now } from "@/lib/utils";
import { dataCall, mock, USE_MOCKS } from "./client";
function publicDonor(d: Donor, origin: GeoPoint): NearbyDonor { return { ...d, location: { ...d.location, point: coarsen(d.location.point) }, distanceKm: distanceKm(origin,d.location.point) }; }
function filterDonors(rows:Donor[],origin:GeoPoint,filters:DonorSearchFilters={}):NearbyDonor[]{ const {bloodGroup="any",compatibleOnly=false,city,area,maxDistanceKm,availability="any",lastDonationWithinDays,gender="any",verifiedOnly=false}=filters; const groups=bloodGroup==="any"?null:compatibleOnly?canReceiveFrom(bloodGroup):[bloodGroup]; return rows.filter(d=>d.status==="active"&&d.verification!=="rejected").filter(d=>!groups||groups.includes(d.bloodGroup)).filter(d=>!city||d.location.city===city).filter(d=>!area||d.location.area===area).filter(d=>availability==="any"||d.availability===availability).filter(d=>gender==="any"||d.gender===gender).filter(d=>!verifiedOnly||d.verification==="verified").filter(d=>!lastDonationWithinDays||(d.lastDonationDate!==null&&daysBetween(d.lastDonationDate,now())<=lastDonationWithinDays)).map(d=>publicDonor(d,origin)).filter(d=>!maxDistanceKm||d.distanceKm<=maxDistanceKm).sort((a,b)=>a.distanceKm-b.distanceKm); }
export async function getNearbyDonors(origin:GeoPoint,filters:DonorSearchFilters={}):Promise<NearbyDonor[]>{ if(USE_MOCKS)return mock(filterDonors(mockDonors,origin,filters),450); return dataCall<NearbyDonor[]>("donors","nearby",{origin,filters}); }
export const donorService={
  getNearbyDonors,
  async list():Promise<Donor[]>{return USE_MOCKS?mock(mockDonors):dataCall<Donor[]>("donors","list");},
  async getById(id:string){return USE_MOCKS?mock(mockDonors.find(d=>d.id===id)):dataCall<Donor|undefined>("donors","getById",{id});},
  async setVerification(id:string,verification:Donor["verification"]){return USE_MOCKS?mock({id,verification},400):dataCall<{id:string;verification:Donor["verification"]}>("donors","setVerification",{id,verification});},
  async setStatus(id:string,status:Donor["status"]){return USE_MOCKS?mock({id,status},400):dataCall<{id:string;status:Donor["status"]}>("donors","setStatus",{id,status});},
  async registerDonor(input:Partial<Donor>){return USE_MOCKS?mock({donorId:input.id??"d-new",verification:"pending" as const},900):dataCall<{donorId:string;verification:Donor["verification"]}>("donors","registerDonor",{input});},
  async updateAvailability(availability:Donor["availability"],donorId?:string){return USE_MOCKS?mock({availability},400):dataCall<{availability:Donor["availability"]}>("donors","updateAvailability",{availability,donorId});},
  async contactDonor(donorId:string,requestCode?:string){return USE_MOCKS?mock({sent:true,donorId,requestCode},600):dataCall<{sent:boolean;donorId:string;requestCode?:string}>("donors","contactDonor",{donorId,requestCode});},
};
