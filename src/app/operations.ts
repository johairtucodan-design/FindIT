"use server";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
export async function operate(operation: string, target: string, form: FormData) {
  const staff=["moderate_report","receive_item","store_item"].includes(operation);
  const {client}=staff?await requireRole(["officer","admin"]):await requireUser();
  const text=(key:string)=>String(form.get(key)??"").trim();
  let args: Record<string,unknown>={target};
  switch(operation) {
    case "moderate_report": args={target,decision:text("decision"),safe_title:text("safe_title"),safe_description:text("safe_description"),safe_area:text("safe_area")}; break;
    case "receive_item": args={target,station:text("station"),storage:text("storage"),confirmed:form.get("confirmed")==="on"}; break;
    case "store_item": args={target,storage:text("storage")}; break;
    case "submit_claim": args={target,evidence:text("evidence")}; break;
    case "withdraw_report": break;
    default: return {error:"Unknown action."};
  }
  const {data,error}=await client.rpc(operation,args);
  if(error) return {error:error.code==="23505"?"You already submitted a claim for this item.":error.message};
  for(const path of ["/items","/my","/security",`/items/${target}`]) revalidatePath(path);
  return {success:`Saved${typeof data==="string"?`. Reference: ${data}`:"."}`};
}
