import type { AppointmentInput, Donation } from "@/types";
import { allDonations, myDonations } from "@/data/mockDonations";
import { mockHospitals } from "@/data/mockHospitals";
import { mock, dataCall, USE_MOCKS } from "./client";
export const donationService={
 async listMine(){return USE_MOCKS?mock(myDonations):dataCall<Donation[]>("donations","listMine");},
 async listAll(){return USE_MOCKS?mock(allDonations):dataCall<Donation[]>("donations","listAll");},
 async bookAppointment(input:AppointmentInput){if(!USE_MOCKS)return dataCall<Donation>("donations","bookAppointment",{input});const c=mockHospitals.find(h=>h.id===input.centerId);return mock<Donation>({id:`dn-${Date.now()}`,donorId:"d-self",donorName:"Ahmed Hassan",bloodGroup:"O+",centerId:input.centerId,centerName:c?.name??"Donation centre",city:c?.city??"Lahore",date:`${input.date}T${input.time}`,units:1,status:"scheduled"},900);},
 async updateStatus(id:string,status:Donation["status"]){return USE_MOCKS?mock({id,status},400):dataCall<{id:string;status:Donation["status"];certificateId?:string}>("donations","updateStatus",{id,status});},
};
