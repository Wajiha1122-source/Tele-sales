"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquareText, Send, Users } from "lucide-react";
import Shell from "../../components/Shell";
import { Button, Card, Notice } from "../../components/ui";
import Reveal from "../../components/Reveal";
import { api } from "../../lib/api";
import { useSession } from "../../hooks/useSession";

export default function MessagesPage() {
  const user = useSession();
  const [recipients, setRecipients] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const people = useMemo(() => {
    const byId = new Map(recipients.map((person) => [person.id, person]));
    threads.forEach((thread) => byId.set(thread.id, { ...byId.get(thread.id), ...thread }));
    return Array.from(byId.values());
  }, [recipients, threads]);

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedId),
    [people, selectedId]
  );

  const loadThreads = useCallback(() => api("/messages/threads").then(setThreads), []);

  const loadConversation = useCallback(async (recipientId) => {
    if (!recipientId) return;
    const data = await api(`/messages/${recipientId}`);
    setConversation(data);
    await loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api("/messages/recipients"), loadThreads()])
      .then(([recipientRows]) => setRecipients(recipientRows))
      .catch((error) => setMessage(error.message));
  }, [user, loadThreads]);

  useEffect(() => {
    if (!selectedId && people.length) setSelectedId(people[0].id);
  }, [people, selectedId]);

  useEffect(() => {
    if (selectedId) loadConversation(selectedId).catch((error) => setMessage(error.message));
  }, [selectedId, loadConversation]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedId || !body.trim()) return;
    setBusy(true);
    try {
      await api("/messages", {
        method: "POST",
        body: JSON.stringify({ recipientId: selectedId, body })
      });
      setBody("");
      setMessage("Message sent.");
      await loadConversation(selectedId);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  return <Shell user={user}>
    <Reveal variant="clip"><header className="page-hero mb-7">
      <p className="text-sm font-bold uppercase tracking-[.22em] text-violet-600">Direct messaging module</p>
      <h1 className="mt-2 text-3xl font-black text-violet-950 md:text-4xl">Direct messages</h1>
      <p className="mt-2 text-slate-500">Private communication between executives and leadership, stored in the sales command system.</p>
    </header></Reveal>
    <Notice message={message} error={message && !message.includes("sent")} />

    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Reveal><Card title="People" action={<Users size={18} className="text-violet-500" />}>
        <div className="space-y-2">
          {people.map((person) => (
            <button
              type="button"
              key={person.id}
              onClick={() => setSelectedId(person.id)}
              className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${selectedId === person.id ? "border-violet-300 bg-violet-50" : "border-slate-100 bg-white hover:border-violet-200 hover:bg-violet-50/50"}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-violet-950">{person.name}</span>
                <span className="block truncate text-xs text-slate-400">{person.role} - {person.email}</span>
              </span>
              {!!person.unread_count && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-rose-100 px-2 text-xs font-black text-rose-700">{person.unread_count}</span>}
            </button>
          ))}
          {!people.length && <div className="rounded-xl bg-violet-50 p-4 text-sm text-slate-500">No message recipients are available for your role yet.</div>}
        </div>
      </Card></Reveal>

      <Reveal delay={100}><Card title={selectedPerson ? selectedPerson.name : "Conversation"} action={<MessageSquareText size={18} className="text-violet-500" />}>
        {selectedPerson ? <>
          <div className="mb-4 max-h-[32rem] min-h-[20rem] space-y-3 overflow-y-auto rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
            {(conversation?.messages || []).map((item) => {
              const mine = item.sender_id === user.id;
              return <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${mine ? "bg-violet-700 text-white" : "bg-white text-slate-700"}`}>
                  <div className="whitespace-pre-wrap">{item.body}</div>
                  <div className={`mt-2 text-[11px] ${mine ? "text-violet-100/70" : "text-slate-400"}`}>{new Date(item.created_at).toLocaleString()}</div>
                </div>
              </div>;
            })}
            {conversation && !conversation.messages.length && <div className="grid min-h-[18rem] place-items-center text-sm text-slate-500">Start the conversation with a direct message.</div>}
          </div>
          <form onSubmit={sendMessage} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <textarea rows="3" required value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message..." />
            <Button loading={busy} className="btn-primary md:self-end"><Send size={16} />Send</Button>
          </form>
        </> : <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">Select a person to open a direct message thread.</div>}
      </Card></Reveal>
    </div>
  </Shell>;
}
