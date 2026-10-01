import type { BloodInventory, StockLevel } from "@/types";
import { mockInventory } from "@/data/mockInventory";
import { mock, dataCall, USE_MOCKS } from "./client";
export function stockLevel(i:BloodInventory):StockLevel{const ratio=i.available/Math.max(1,i.required);if(ratio<0.5)return"critical";if(ratio<1)return"low";return"normal";}
export const inventoryService={async list(){return USE_MOCKS?mock(mockInventory):dataCall<BloodInventory[]>("inventory","list");},async adjust(group:string,delta:number,reason:string){return USE_MOCKS?mock({group,delta,reason},500):dataCall<{group:string;delta:number;reason:string;available?:number}>("inventory","adjust",{group,delta,reason});}};
