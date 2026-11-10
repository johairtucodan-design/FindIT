"use server";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { preparePhoto, MAX_PHOTO_BYTES } from "@/lib/photo";
import { isUuid } from "@/lib/reports";
export async function operate(operation: string, target: string, form: FormData) {
  const admin=["set_retention","archive_report","seed_demo_cases"].includes(operation);
  const staff=["moderate_report","receive_item","store_item","review_claim","release_item"].includes(operation);
  const {client,user}=admin?await requireRole(["admin"]):staff?await requireRole(["officer","admin"]):await requireUser();
  const text=(key:string)=>String(form.get(key)??"").trim();
  const confirmed=form.get("confirmed")==="on";
  if(!["set_retention","seed_demo_cases"].includes(operation)&&!isUuid(target)) return {error:"Invalid reference."};
  let args: Record<string,unknown>={target};
  let attachment: string | null=null;
  switch(operation) {
    case "moderate_report": args={target,decision:text("decision"),safe_title:text("safe_title"),safe_description:text("safe_description"),safe_area:text("safe_area")}; break;
    case "receive_item": args={target,station:text("station"),storage:text("storage"),confirmed:form.get("confirmed")==="on"}; break;
    case "store_item": args={target,storage:text("storage")}; break;
    case "submit_claim": {
      const evidence=text("evidence");
      if(evidence.length<10||evidence.length>3000) return {error:"Enter between 10 and 3,000 characters of private evidence."};
      const file=form.get("attachment");
      if(file instanceof File&&(file.size||file.name)) {
        let bytes:Buffer;
        try { bytes=await preparePhoto(file); }
        catch(error) { return {error:error instanceof Error?error.message:"The image could not be read."}; }
        if(bytes.byteLength>MAX_PHOTO_BYTES) return {error:"Choose a smaller evidence image."};
        attachment=`${user.id}/${crypto.randomUUID()}.webp`;
        const {error}=await client.storage.from("claim-evidence").upload(attachment,bytes,{contentType:"image/webp"});
        if(error) return {error:"The evidence image could not be uploaded. Try again."};
      }
      args={target,evidence,attachment};
      break;
    }
    case "review_claim": args={target,decision:text("decision")}; break;
    case "release_item":
    case "archive_report": args={target,confirmed}; break;
    case "set_retention": {
      const days=Number(text("days"));
      if(!Number.isInteger(days)||days<1||days>3650) return {error:"Enter a whole number from 1 to 3650."};
      args={days};
      break;
    }
    case "seed_demo_cases": args={}; break;
    case "withdraw_report": break;
    default: return {error:"Unknown action."};
  }
  const {data,error}=await client.rpc(operation,args);
  if(error) {
    if(attachment) await client.storage.from("claim-evidence").remove([attachment]);
    return {error:error.code==="23505"&&operation==="submit_claim"?"You already submitted a claim for this item.":error.code==="P0001"?error.message:error.code==="42501"?"You don’t have access to this operation.":"The change could not be saved. Please try again."};
  }
  for(const path of ["/items","/my","/claims","/security","/manager"]) revalidatePath(path,"layout");
  return {success:`Saved${typeof data==="string"?`. Reference: ${data}`:"."}`};
}
