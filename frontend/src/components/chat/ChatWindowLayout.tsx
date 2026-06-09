const ChatWindowLayout = () => {
  return (
    <section className="grid min-h-0 w-full grid-cols-1 overflow-hidden rounded-lg border bg-card text-card-foreground md:grid-cols-[18rem_1fr]">
      <aside className="hidden border-r bg-muted/30 md:flex md:flex-col">
        <div className="border-b p-3">
          <h2 className="text-sm font-medium">Messages</h2>
          <p className="text-xs text-muted-foreground">Recent chats</p>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {["Moji Team", "Design Room", "Friends"].map((name) => (
            <button
              key={name}
              className="rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
      </aside>
      <div className="flex min-h-0 flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <div>
            <h1 className="text-sm font-medium">Moji Team</h1>
            <p className="text-xs text-muted-foreground">Online now</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
          <div className="max-w-[75%] rounded-lg bg-muted px-3 py-2 text-sm">
            Welcome back to Moji.
          </div>
          <div className="ml-auto max-w-[75%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
            The shadcn layout is rendering now.
          </div>
        </div>
        <div className="border-t p-3">
          <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
            Type a message...
          </div>
        </div>
      </div>
    </section>
  )
}

export default ChatWindowLayout;
