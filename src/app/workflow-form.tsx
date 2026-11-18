"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type ActionButton = { name: string; value: string; label: string; className?: string };
export default function WorkflowForm({ action, children, label, actions }: { action: (form: FormData) => Promise<{error?: string; success?: string}>; children: React.ReactNode; label: string; actions?: ActionButton[] }) {
  const [result,setResult]=useState<{error?: string; success?: string}>({});
  const [pending,setPending]=useState(false);
  const router=useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const submitter=(event.nativeEvent as SubmitEvent).submitter;
    if(submitter instanceof HTMLButtonElement&&submitter.name) form.set(submitter.name,submitter.value);
    const attachment=form.get("attachment");
    if(attachment instanceof File&&attachment.size>4*1024*1024) {
      setResult({error:"Choose an evidence image no larger than 4 MiB."});
      return;
    }
    setPending(true);
    try { const next=await action(form); setResult(next); if(next.success) router.refresh(); }
    catch { setResult({error:"Unable to complete this action. Try again."}); }
    finally { setPending(false); }
  }
  return <form className="form-grid my-5" onSubmit={submit}>{children}{result.error&&<p className="error" role="alert">{result.error}</p>}{result.success&&<p className="notice" role="status">{result.success}</p>}{actions?<div className="workflow-actions">{actions.map(button=><button className={button.className??"button"} disabled={pending} key={button.value} type="submit" name={button.name} value={button.value}>{pending?"Updating…":button.label}</button>)}</div>:<button className="button" disabled={pending}>{pending?"Saving…":label}</button>}</form>;
}
