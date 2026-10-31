import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { ArrowUpIcon, CheckIcon, CircleCheckIcon, CopyIcon, LoaderCircleIcon, MessageCircleDashedIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { Message, MessageContent, MessageFooter } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { api, unreachable, type Fields, type Profile, type Settings } from "./api.ts";
import { useTurnStream, type Turn } from "./use-turn-stream.ts";

function go(path: string) {
  history.pushState(null, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
}

// In-app navigation for plain links. Modified clicks keep the browser's behavior.
function follow(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  go(event.currentTarget.pathname);
}

export function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const update = () => setPath(location.pathname);
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);

  // The sidebar's list. Forms bump `version` after a change; a failed load retries.
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  useEffect(() => {
    let stopped = false;
    const load = () =>
      api<Profile[]>("/profiles").then(
        (list) => {
          if (stopped) return;
          setProfiles(list);
          setOffline(false);
        },
        () => {
          if (stopped) return;
          setOffline(true);
          setTimeout(load, 3000);
        },
      );
    load();
    return () => {
      stopped = true;
    };
  }, [version]);

  const [, top, id, sub] = path.split("/");
  let screen: ReactNode;
  if (path === "/") screen = <Home profiles={profiles} offline={offline} />;
  else if (path === "/settings") screen = <SettingsForm />;
  else if (top === "profiles" && id === "new" && sub === undefined) screen = <ProfileForm key="new" onSaved={refresh} />;
  else if (top === "profiles" && id && sub === "edit") screen = <ProfileForm key={id} id={id} onSaved={refresh} />;
  else if (top === "profiles" && id && sub === undefined) screen = <Chat key={id} id={id} onReply={refresh} />;
  else screen = <Header title="Not found" />;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <BotSidebar profiles={profiles} offline={offline} active={id} />
        <SidebarInset className="h-dvh overflow-hidden">{screen}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function BotSidebar({ profiles, offline, active }: { profiles: Profile[] | null; offline: boolean; active?: string }) {
  const { setOpenMobile } = useSidebar();
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    follow(event);
    setOpenMobile(false);
  };
  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center justify-between">
        <a href="/" onClick={open} className="px-2 text-lg font-semibold">
          fxbot
        </a>
        <Tooltip>
          <TooltipTrigger asChild>
            <a href="/profiles/new" onClick={open} aria-label="New bot" className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <PlusIcon />
            </a>
          </TooltipTrigger>
          <TooltipContent>New bot</TooltipContent>
        </Tooltip>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {offline && <p className="px-2 text-sm text-destructive">{unreachable}</p>}
          <SidebarMenu>
            {profiles?.map((profile) => (
              <SidebarMenuItem key={profile.id}>
                <SidebarMenuButton asChild size="lg" isActive={profile.id === active} className="h-auto gap-3 py-2">
                  <a href={`/profiles/${profile.id}`} onClick={open}>
                    <BotAvatar profile={profile} />
                    <span className="grid min-w-0 gap-0.5 leading-tight">
                      <span className="truncate text-base">{profile.name}</span>
                      <span className="truncate text-muted-foreground">{profile.preview ?? "No messages yet"}</span>
                    </span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === "/settings"}>
              <a href="/settings" onClick={open}>
                <SettingsIcon />
                Settings
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// A colored initial, picked from the id so a bot keeps its color.
const avatarColors = ["bg-orange-500", "bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-teal-500", "bg-rose-500"];
const BotAvatar = ({ profile }: { profile: Profile }) => (
  <Avatar className="size-10">
    <AvatarFallback className={`${avatarColors[parseInt(profile.id.slice(0, 2), 16) % avatarColors.length]} font-semibold text-white`}>
      {profile.name.slice(0, 1).toUpperCase()}
    </AvatarFallback>
  </Avatar>
);

function Header({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-3">
      <SidebarTrigger />
      <h1 className="min-w-0 flex-1 truncate font-medium">{title}</h1>
      {children}
    </header>
  );
}

const label = "grid gap-1.5 text-sm font-medium";

const Problem = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="mx-auto w-full max-w-3xl rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
    {children}
  </p>
);

function Home({ profiles, offline }: { profiles: Profile[] | null; offline: boolean }) {
  const some = Boolean(profiles?.length);
  return (
    <>
      <Header title="fxbot" />
      {offline && (
        <div className="px-4">
          <Problem>{unreachable} Retrying…</Problem>
        </div>
      )}
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageCircleDashedIcon />
          </EmptyMedia>
          <EmptyTitle>{profiles === null ? "fxbot" : some ? "Pick a bot" : "No bots yet"}</EmptyTitle>
          <EmptyDescription>{some ? "Choose one from the list, or make another." : "Make a bot to start a conversation."}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <a href="/profiles/new" onClick={follow} className={buttonVariants()}>
            New bot
          </a>
        </EmptyContent>
      </Empty>
    </>
  );
}

function ProfileForm({ id, onSaved }: { id?: string; onSaved: () => void }) {
  const [fields, setFields] = useState<Fields>({ name: "", instructions: "", model: "" });
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  useEffect(() => {
    if (!id) return;
    api<Settings>("/settings").then((settings) => setDefaultModel(settings.defaultModel), () => {});
    api<Profile>(`/profiles/${id}`).then(
      ({ name, instructions, model }) => {
        setFields({ name, instructions, model });
        setLoaded(true);
      },
      (e: Error) => setError(e.message),
    );
  }, [id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await api<Profile>(id ? `/profiles/${id}` : "/profiles", id ? "PATCH" : "POST", id ? fields : { name: fields.name });
      onSaved();
      go(`/profiles/${saved.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${fields.name}? Its conversation files stay on the server.`)) return;
    try {
      await api(`/profiles/${id}`, "DELETE");
      onSaved();
      go("/");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const set = (key: keyof Fields) => (event: { target: { value: string } }) => setFields({ ...fields, [key]: event.target.value });
  return (
    <>
      <Header title={id ? `Edit ${fields.name || "bot"}` : "New bot"} />
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <form onSubmit={save} className="mx-auto grid max-w-xl gap-5">
          <label className={label}>
            Name
            <Input required maxLength={200} value={fields.name} onChange={set("name")} disabled={!loaded} />
          </label>
          {/* A new bot is just a name. Its model and instructions are set here later, if at all. */}
          {id && (
            <>
              <label className={label}>
                Model
                <Input maxLength={200} value={fields.model} onChange={set("model")} disabled={!loaded} placeholder={`Default: ${defaultModel || "none set in Settings"}`} />
              </label>
              <label className={label}>
                Instructions
                <Textarea rows={8} className="max-h-[50dvh]" value={fields.instructions} onChange={set("instructions")} disabled={!loaded} />
              </label>
            </>
          )}
          {error && <Problem>{error}</Problem>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !loaded}>
              Save
            </Button>
            {id && (
              <Button type="button" variant="destructive" onClick={remove} disabled={!loaded}>
                Delete
              </Button>
            )}
          </div>
        </form>
      </main>
    </>
  );
}

function SettingsForm() {
  const [defaultModel, setDefaultModel] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    api<Settings>("/settings").then(
      (settings) => {
        setDefaultModel(settings.defaultModel);
        setLoaded(true);
      },
      (e: Error) => setStatus(e.message),
    );
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    try {
      await api("/settings", "PATCH", { defaultModel });
      setStatus("Saved.");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  return (
    <>
      <Header title="Settings" />
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <form onSubmit={save} className="mx-auto grid max-w-xl gap-5">
          <label className={label}>
            Default model
            <Input maxLength={200} value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} disabled={!loaded} placeholder="A model id your endpoint serves" />
            <span className="font-normal text-muted-foreground">Bots without a model of their own use this one.</span>
          </label>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
          <div>
            <Button type="submit" disabled={!loaded}>
              Save
            </Button>
          </div>
        </form>
      </main>
    </>
  );
}

const newMessageId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function Chat({ id, onReply }: { id: string; onReply: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const { turns, setTurns, connected } = useTurnStream(id, Boolean(profile?.sessionId));

  // Keeps trying, so the chat comes back on its own when the server does.
  useEffect(() => {
    let stopped = false;
    const load = () =>
      api<Profile>(`/profiles/${id}`).then(
        (loaded) => {
          if (stopped) return;
          setProfile(loaded);
          setError("");
        },
        (e: Error) => {
          if (stopped) return;
          setError(e.message);
          setTimeout(load, 3000);
        },
      );
    load();
    return () => {
      stopped = true;
    };
  }, [id]);

  // The server saves each reply's preview for the sidebar, so reload the list as replies finish.
  const finished = turns.filter((turn) => turn.done).length;
  useEffect(() => {
    if (finished) onReply();
  }, [finished]); // Only the count matters; onReply is a new function on every render.

  async function send(text: string, messageId: string) {
    const pending = { messageId, text, reply: "", done: false };
    setTurns((all) => (all.some((t) => t.messageId === messageId) ? all.map((t) => (t.messageId === messageId ? pending : t)) : [...all, pending]));
    try {
      const { sessionId } = await api<{ sessionId: string }>(`/profiles/${id}/messages`, "POST", { text, messageId });
      setProfile((current) => current && { ...current, sessionId });
    } catch (e) {
      const note = `Not sent: ${(e as Error).message}`;
      setTurns((all) => all.map((t) => (t.messageId === messageId && !t.done ? { ...t, done: true, note, unsent: true } : t)));
    }
  }

  function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!draft.trim() || !profile) return;
    send(draft, newMessageId());
    setDraft("");
  }

  const offline = error || (!connected && unreachable);
  const empty = turns.length === 0;
  return (
    <>
      <Header title={profile?.name ?? "Chat"}>
        <a href={`/profiles/${id}/edit`} onClick={follow} className={buttonVariants({ variant: "ghost" })}>
          Edit
        </a>
      </Header>
      {offline && (
        <div className="px-4">
          <Problem>{offline} Retrying…</Problem>
        </div>
      )}
      <MessageScrollerProvider autoScroll>
        {/* The composer keeps its place in the tree, so it keeps focus when the first turn arrives. */}
        <div className={`flex min-h-0 flex-1 flex-col ${empty ? "justify-center gap-6 pb-[15dvh]" : ""}`}>
          {empty ? (
            <h2 className="text-center text-2xl font-semibold">{profile ? `Talk to ${profile.name}` : "Loading…"}</h2>
          ) : (
            <MessageScroller className="flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-4">
                  {turns.map((turn) => (
                    <TurnView key={turn.messageId} turn={turn} retry={() => send(turn.text, turn.messageId)} />
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          )}
          <form onSubmit={submit} className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <InputGroup className="rounded-3xl bg-background">
              <InputGroupTextarea
                aria-label="Message"
                className="max-h-48 min-h-12 px-4"
                placeholder={profile ? `Message ${profile.name}` : "Loading…"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && submit(e)}
                disabled={!profile}
              />
              <InputGroupAddon align="block-end">
                <InputGroupButton type="submit" variant="default" size="icon-sm" className="ml-auto rounded-full" disabled={!profile || !draft.trim()} aria-label="Send">
                  <ArrowUpIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>
      </MessageScrollerProvider>
    </>
  );
}

// One turn: the person's message as the scroll anchor, then the reply as markdown with its actions.
function TurnView({ turn, retry }: { turn: Turn; retry: () => void }) {
  return (
    <>
      {turn.text && (
        <MessageScrollerItem messageId={`${turn.messageId}-user`} scrollAnchor>
          <Message align="end">
            <MessageContent>
              <Bubble align="end" variant="muted">
                <BubbleContent className="whitespace-pre-wrap">{turn.text}</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        </MessageScrollerItem>
      )}
      <MessageScrollerItem messageId={`${turn.messageId}-reply`}>
        <Message>
          <MessageContent>
            {turn.reasoning && <Reasoning text={turn.reasoning} running={!turn.done && !turn.reply} />}
            {turn.reply ? <Streamdown>{turn.reply}</Streamdown> : !turn.done && !turn.reasoning && <p className="animate-pulse text-muted-foreground">Thinking…</p>}
            {turn.note && (
              <p className="text-sm text-destructive">
                {turn.note}{" "}
                {turn.unsent && (
                  <Button size="xs" variant="outline" onClick={retry}>
                    Retry
                  </Button>
                )}
              </p>
            )}
            {turn.done && turn.reply && (
              <MessageFooter>
                <CopyButton text={turn.reply} />
              </MessageFooter>
            )}
          </MessageContent>
        </Message>
      </MessageScrollerItem>
    </>
  );
}

// shadcn's Reasoning pattern: open while the model thinks, folded once the reply starts.
function Reasoning({ text, running }: { text: string; running: boolean }) {
  const [open, setOpen] = useState<boolean>();
  return (
    <Trace>
      <TraceCollapsible open={open ?? running} onOpenChange={setOpen}>
        <TraceCollapsibleTrigger>
          <TraceLine status={running ? "running" : undefined}>
            <TraceIcon>{running ? <LoaderCircleIcon className="animate-spin" /> : <CircleCheckIcon />}</TraceIcon>
            <TraceTitle>{running ? "Thinking" : "Thought"}</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="whitespace-pre-wrap">{text}</TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Copy" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy</TooltipContent>
    </Tooltip>
  );
}
