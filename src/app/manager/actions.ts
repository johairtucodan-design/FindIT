"use server";
import {requireRole} from "@/lib/auth";
import {revalidatePath} from "next/cache";
import {isUuid} from "@/lib/reports";
export async function saveStation(id:string,form:FormData){
 const {client}=await requireRole(["admin"]);const text=(k:string)=>String(form.get(k)??"").trim();
 const lat=text("latitude"),lon=text("longitude");
 if((lat||lon)&&(!lat||!lon||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))||Math.abs(Number(lat))>90||Math.abs(Number(lon))>180))return {error:"Enter a valid latitude and longitude, or leave both blank."};
 const data={name:text("name"),type:"demo_police_station",address:text("address"),phone:text("phone"),service_area:text("service_area"),receiving_hours:text("receiving_hours"),is_demo:true,is_approved:form.get("is_approved")==="on",...(lat&&lon?{location:`SRID=4326;POINT(${Number(lon)} ${Number(lat)})`}:{})};
 if(!data.name||!data.address||!data.service_area||!data.receiving_hours)return {error:"Name, address, service area and receiving hours are required."};
 const {error}=id?await client.from("stations").update(data).eq("id",id):await client.from("stations").insert(data);
 if(error)return {error:error.message};revalidatePath("/manager");revalidatePath("/stations");return {success:"Demo station saved."};
}

export async function assignUserAccess(target:string,form:FormData){
 const {client}=await requireRole(["admin"]);const text=(key:string)=>String(form.get(key)??"").trim();
 if(!isUuid(target))return {error:"Invalid user reference."};
 const role=text("role");if(!["citizen","officer","admin"].includes(role))return {error:"Choose Citizen, Staff, or Admin."};
 const station=role==="officer"?text("station_id"):"";
 if(role==="officer"&&!isUuid(station))return {error:"Choose an approved demo station for this staff account."};
 const {error}=await client.rpc("assign_profile_role",{target_user:target,target_role:role,target_station:station||null});
 if(error)return {error:error.code==="42501"?"You are not authorized to change this user’s FindIT access.":error.message||"The access change could not be saved."};
 revalidatePath("/manager");revalidatePath("/security","layout");return {success:"FindIT access updated and recorded."};
}
