import type { CityLocation, FacilityType, GeoPoint, Hospital } from "@/types";
import { mockHospitals } from "@/data/mockHospitals";
import { mockLocations, AREA_POINTS } from "@/data/locations";
import { distanceKm } from "@/lib/geo";
import { mock, dataCall, USE_MOCKS } from "./client";
export const hospitalService={
 async list(type?:FacilityType,origin?:GeoPoint){if(!USE_MOCKS){const rows=await dataCall<Hospital[]>("hospitals","list",{type,origin});return type?rows.filter(h=>h.type===type):rows;}const rows=mockHospitals.filter(h=>!type||h.type===type).map(h=>{const p=AREA_POINTS[h.city]?.[h.area];return origin&&p?{...h,distanceKm:distanceKm(origin,p)}:h});return mock(rows);},
 async donationSites(origin?:GeoPoint){if(!USE_MOCKS)return dataCall<Hospital[]>("hospitals","donationSites",{origin});const rows=mockHospitals.map(h=>{const p=AREA_POINTS[h.city]?.[h.area];return origin&&p?{...h,distanceKm:distanceKm(origin,p)}:h});rows.sort((a,b)=>(a.distanceKm??0)-(b.distanceKm??0));return mock(rows);},
 async save(h:Hospital){return USE_MOCKS?mock(h,600):dataCall<Hospital>("hospitals","save",{h});},
 async locations():Promise<CityLocation[]>{return USE_MOCKS?mock(mockLocations):dataCall<CityLocation[]>("hospitals","locations");},
 async saveLocation(location:{id?:string;city:string;areas:string[]}){return USE_MOCKS?mock(location,500):dataCall<{id:string;city:string;areas:string[]}>("hospitals","saveLocation",{location});},
};
