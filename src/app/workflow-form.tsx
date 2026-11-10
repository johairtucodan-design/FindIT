"use client";
import { useState, type FormEvent } from "react";
export default function WorkflowForm({ action, children, label }: { action: (form: FormData) => Promise<{error?: string; success?: string}>; children: React.ReactNode; label: string }) {
  const [result,setResult]=useState<{error?: string; success?: string}>({});
  const [pending,setPending]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const attachment=form.get("attachment");
    if(attachment instanceof File&&attachment.size>4*1024*1024) {
      setResult({error:"Choose an evidence image no larger than 4 MiB."});
      return;
    }
    setPending(true);
    try { setResult(await action(form)); }
    catch { setResult({error:"Unable to complete this action. Try again."}); }
    finally { setPending(false); }
  }
  return <form className="form-grid my-5" onSubmit={submit}>{children}{result.error&&<p className="error" role="alert">{result.error}</p>}{result.success&&<p className="notice" role="status">{result.success}</p>}<button className="button" disabled={pending}>{pending?"Saving…":label}</button></form>;
}
