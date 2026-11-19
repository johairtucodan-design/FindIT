"use server";
import {requireRole} from "@/lib/auth";
import {revalidatePath} from "next/cache";
import {isUuid} from "@/lib/reports";
export async function assignUserAccess(target:string,form:FormData){
 const {client}=await requireRole(["admin"]);const text=(key:string)=>String(form.get(key)??"").trim();
 if(!isUuid(target))return {error:"Invalid user reference."};
 const role=text("role");if(!["citizen","officer","admin"].includes(role))return {error:"Choose Citizen, Staff, or Admin."};
 const station=role==="officer"?text("station_id"):"";
 if(role==="officer"&&!isUuid(station))return {error:"Choose an approved public-reference station for this staff account."};
 const {error}=await client.rpc("assign_profile_role",{target_user:target,target_role:role,target_station:station||null});
 if(error)return {error:error.code==="42501"?"You are not authorized to change this user’s FindIT access.":error.message||"The access change could not be saved."};
 revalidatePath("/manager");revalidatePath("/security","layout");return {success:"FindIT access updated and recorded."};
}

export async function reviewStationLocation(target:string,form:FormData){
 const {client}=await requireRole(["admin"]);
 if(!isUuid(target))return {error:"Invalid location reference."};
 const decision=String(form.get("decision")??"");
 if(!["approved","rejected"].includes(decision))return {error:"Choose Approve or Deny."};
 const {error}=await client.rpc("review_station_location",{p_target:target,p_decision:decision});
 if(error)return {error:error.code==="42501"?"Admin access is required to review this pin.":error.message||"The review could not be saved."};
 revalidatePath("/manager");revalidatePath("/stations");revalidatePath("/security/locations");
 return {success:decision==="approved"?"Approved for display on FindIT’s map.":"Suggestion denied; it remains private."};
}
