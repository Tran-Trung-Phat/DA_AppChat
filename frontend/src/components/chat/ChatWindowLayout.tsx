import * as React from "react";
import {
  CheckIcon,
  CrownIcon,
  ExternalLinkIcon,
  FileIcon,
  LoaderCircleIcon,
  LogOutIcon,
  MapPinIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  PencilIcon,
  SearchIcon,
  SettingsIcon,
  SendIcon,
  SmileIcon,
  StickerIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { socketService } from "@/services/socketService";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getParticipantAvatar,
  getParticipantId,
  getParticipantName,
  useChatStore,
} from "@/stores/useChatStore";
import type {
  Conversation,
  Message,
  MessageAttachment,
  MessageLocation,
} from "@/types/chat";

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😎",
  "🥳",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "💖",
  "💯",
  "🎉",
  "☕",
];

const STICKERS = ["🐱", "🐶", "🐼", "🐰", "🦊", "🐸", "🐵", "🐧", "🦄", "🐯", "🐨", "🐻"];

const initials = (name?: string) =>
  (name || "M")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const getSenderId = (message: Message) =>
  typeof message.senderId === "string" ? message.senderId : message.senderId._id;

const getDirectPeer = (conversation: Conversation, currentUserId?: string) =>
  conversation.participants.find(
    (participant) => getParticipantId(participant) !== currentUserId
  ) ?? conversation.participants[0];

const getGroupOwnerId = (conversation: Conversation) => {
  const owner = conversation.group?.createdBy;
  return typeof owner === "string" ? owner : owner?._id;
};

const getConversationTitle = (
  conversation: Conversation,
  currentUserId?: string
) => {
  if (conversation.type === "group") {
    return conversation.group?.name || "Nhom chat";
  }

  return getParticipantName(getDirectPeer(conversation, currentUserId));
};

const getConversationAvatar = (
  conversation: Conversation,
  currentUserId?: string
) => {
  if (conversation.type === "group") return undefined;
  return getParticipantAvatar(getDirectPeer(conversation, currentUserId));
};

const formatTime = (value?: string) => {
  if (!value) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getMessageSenderName = (
  conversation: Conversation,
  message: Message,
  currentUserId?: string
) => {
  const senderId = getSenderId(message);

  if (senderId === currentUserId) return "Ban";

  const participant = conversation.participants.find(
    (item) => getParticipantId(item) === senderId
  );

  return participant ? getParticipantName(participant) : "Moji user";
};

const isStickerMessage = (content?: string) =>
  Boolean(content && STICKERS.includes(content.trim()));

const getTypingText = (
  conversation: Conversation,
  typingUserIds: string[],
  currentUserId?: string
) => {
  const names = typingUserIds
    .filter((id) => id !== currentUserId)
    .map((id) => {
      const participant = conversation.participants.find(
        (item) => getParticipantId(item) === id
      );
      return participant ? getParticipantName(participant) : "Ai do";
    });

  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} dang nhap...`;
  return `${names.slice(0, 2).join(", ")} dang nhap...`;
};

function AttachmentView({
  attachment,
  isMine,
}: {
  attachment: MessageAttachment;
  isMine: boolean;
}) {
  if (attachment.kind === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer">
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="mt-2 max-h-72 max-w-full rounded-md object-contain"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className={`mt-2 flex max-w-72 items-center gap-2 rounded-md border px-3 py-2 text-xs ${
        isMine ? "border-primary-foreground/30" : "border-border bg-muted/40"
      }`}
    >
      <FileIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{attachment.originalName}</span>
      <span className="shrink-0 opacity-70">{formatBytes(attachment.size)}</span>
    </a>
  );
}

function LocationView({ location }: { location: MessageLocation }) {
  const address =
    location.address?.displayName ||
    [
      location.address?.road,
      location.address?.ward,
      location.address?.district,
      location.address?.city,
      location.address?.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;

  return (
    <a
      href={location.mapUrl}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-64 max-w-80 items-start gap-3 rounded-md border border-current/20 bg-background/90 p-3 text-foreground transition hover:bg-background"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600">
        <MapPinIcon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Vi tri da chia se</span>
        <span className="mt-1 line-clamp-3 block text-xs text-muted-foreground">
          {address}
        </span>
        <span className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
          Mo trong Google Maps
          <ExternalLinkIcon className="size-3" />
        </span>
      </span>
    </a>
  );
}

const ChatWindowLayout = () => {
  const { user } = useAuthStore();
  const {
    conversations,
    selectedConversationId,
    messages,
    friends,
    messageSearchResults,
    messageSearchLoading,
    onlineUserIds,
    typingByConversation,
    messagesLoading,
    sending,
    sendMessage,
    sendLocation,
    editMessage,
    deleteMessage,
    searchMessages,
    updateGroupInfo,
    addGroupMembers,
    removeGroupMember,
    leaveGroup,
  } = useChatStore();
  const [draft, setDraft] = React.useState("");
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pickerTab, setPickerTab] = React.useState<"emoji" | "sticker">(
    "emoji"
  );
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<number | null>(null);

  const selectedConversation = conversations.find(
    (conversation) => conversation._id === selectedConversationId
  );

  React.useEffect(() => {
    if (!selectedConversation || selectedConversation.type !== "group") return;

    setGroupName(selectedConversation.group?.name || "");
    setSelectedMemberIds([]);
  }, [selectedConversation?._id, selectedConversation?.group?.name, selectedConversation?.type]);

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedConversationId]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      searchMessages(searchQuery);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchMessages, searchQuery]);

  React.useEffect(() => {
    setDraft("");
    setSelectedFiles([]);
    setEditingMessageId(null);
    setSearchQuery("");
  }, [selectedConversationId]);

  const sendTypingStart = () => {
    if (!selectedConversationId || editingMessageId) return;

    socketService.startTyping(selectedConversationId);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      socketService.stopTyping(selectedConversationId);
    }, 1200);
  };

  const stopTyping = () => {
    if (!selectedConversationId) return;

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    socketService.stopTyping(selectedConversationId);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      setDraft((value) => `${value}${emoji}`);
      sendTypingStart();
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;

    setDraft(next);
    sendTypingStart();
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const handleSticker = async (sticker: string) => {
    if (sending || editingMessageId) return;

    setPickerOpen(false);
    stopTyping();
    await sendMessage(sticker);
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trinh duyet cua ban khong ho tro dinh vi");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const sent = await sendLocation(coords.latitude, coords.longitude);
        setLocating(false);

        if (sent) {
          toast.success("Da gui vi tri hien tai");
        }
      },
      (error) => {
        setLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Ban da tu choi quyen truy cap vi tri");
          return;
        }

        if (error.code === error.TIMEOUT) {
          toast.error("Qua thoi gian lay vi tri. Vui long thu lai");
          return;
        }

        toast.error("Khong the lay vi tri hien tai");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if ((!draft.trim() && selectedFiles.length === 0) || sending) return;

    const content = draft;
    const files = selectedFiles;
    setDraft("");
    setSelectedFiles([]);
    stopTyping();

    if (editingMessageId) {
      await editMessage(editingMessageId, content);
      setEditingMessageId(null);
      return;
    }

    await sendMessage(content, files);
  };

  const startEdit = (message: Message) => {
    if (message.deletedAt) return;

    setEditingMessageId(message._id);
    setSelectedFiles([]);
    setDraft(message.content || "");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const toggleSelectedMember = (memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  };

  const handleUpdateGroupInfo = async () => {
    if (!selectedConversation) return;

    const ok = await updateGroupInfo(selectedConversation._id, groupName);
    if (ok) setGroupDialogOpen(false);
  };

  const handleAddGroupMembers = async () => {
    if (!selectedConversation || selectedMemberIds.length === 0) return;

    const ok = await addGroupMembers(selectedConversation._id, selectedMemberIds);
    if (ok) setSelectedMemberIds([]);
  };

  const handleRemoveGroupMember = async (memberId?: string) => {
    if (!selectedConversation || !memberId) return;

    await removeGroupMember(selectedConversation._id, memberId);
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversation) return;

    const ok = window.confirm("Ban co chac muon roi nhom nay?");
    if (!ok) return;

    await leaveGroup(selectedConversation._id);
  };

  if (!selectedConversation) {
    return (
      <section className="flex min-h-0 w-full items-center justify-center rounded-lg border bg-card text-card-foreground">
        <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MessageCircleIcon className="size-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Chon mot cuoc tro chuyen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tim ban be, gui loi moi ket ban roi bat dau nhan tin.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const title = getConversationTitle(selectedConversation, user?._id);
  const memberCount = selectedConversation.participants.length;
  const directPeer = getDirectPeer(selectedConversation, user?._id);
  const directPeerId = getParticipantId(directPeer);
  const isOnline =
    selectedConversation.type === "direct" &&
    Boolean(directPeerId && onlineUserIds.includes(directPeerId));
  const typingText = getTypingText(
    selectedConversation,
    typingByConversation[selectedConversation._id] ?? [],
    user?._id
  );
  const seenUserIds = new Set(
    (selectedConversation.seenBy ?? []).map((item) => item._id)
  );
  const lastMineMessageId = [...messages]
    .reverse()
    .find((message) => getSenderId(message) === user?._id)?._id;
  const groupOwnerId = getGroupOwnerId(selectedConversation);
  const isGroupOwner =
    selectedConversation.type === "group" && groupOwnerId === user?._id;
  const participantIds = new Set(
    selectedConversation.participants
      .map((participant) => getParticipantId(participant))
      .filter(Boolean)
  );
  const addableFriends = friends.filter((friend) => !participantIds.has(friend._id));

  return (
    <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <div className="relative">
          <Avatar size="lg">
            <AvatarImage
              src={getConversationAvatar(selectedConversation, user?._id)}
              alt={title}
            />
            <AvatarFallback>{initials(title)}</AvatarFallback>
          </Avatar>
          {selectedConversation.type === "direct" && (
            <span
              className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-background ${
                isOnline ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <UsersIcon className="size-3.5" />
            <span>
              {typingText ||
                (selectedConversation.type === "direct"
                  ? isOnline
                    ? "Dang online"
                    : "Dang offline"
                  : `${memberCount} thanh vien`)}
            </span>
          </div>
        </div>
        <div className="relative w-56 max-w-[40vw]">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 pl-8"
            placeholder="Tim tin nhan"
          />
        </div>
        {selectedConversation.type === "group" && (
          <Button
            type="button"
            size="icon-lg"
            variant="ghost"
            onClick={() => setGroupDialogOpen(true)}
            aria-label="Quan ly nhom"
          >
            <SettingsIcon />
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-5">
        {searchQuery.trim().length >= 2 && (
          <div className="mb-4 rounded-md border bg-background p-2">
            <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">
              {messageSearchLoading
                ? "Dang tim..."
                : `${messageSearchResults.length} ket qua`}
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {messageSearchResults.map((message) => (
                <button
                  key={message._id}
                  type="button"
                  className="flex w-full flex-col rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate font-medium">
                    {getMessageSenderName(selectedConversation, message, user?._id)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {message.content}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messagesLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Dang tai tin nhan...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Chua co tin nhan nao. Gui loi chao dau tien nhe.
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-end gap-3">
            {messages.map((message) => {
              const isMine = getSenderId(message) === user?._id;
              const sticker = isStickerMessage(message.content);
              const attachments = message.attachments ?? [];
              const isDeleted = Boolean(message.deletedAt);
              const canEdit =
                isMine &&
                !isDeleted &&
                message.type !== "location" &&
                attachments.length === 0;
              const canDelete = isMine && !isDeleted;
              const seenByOthers = selectedConversation.participants.some((p) => {
                const participantId = getParticipantId(p);
                return participantId !== user?._id && seenUserIds.has(participantId || "");
              });

              return (
                <div
                  key={message._id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`group flex max-w-[82%] flex-col gap-1 ${
                      isMine ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="px-1 text-xs text-muted-foreground">
                      {getMessageSenderName(
                        selectedConversation,
                        message,
                        user?._id
                      )}{" "}
                      · {formatTime(message.createdAt)}
                      {message.editedAt && !isDeleted ? " · da sua" : ""}
                    </span>
                    <div className="flex items-end gap-1">
                      {isMine && canDelete && (
                        <div className="flex opacity-0 transition group-hover:opacity-100">
                          {canEdit && (
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => startEdit(message)}
                            >
                              <PencilIcon />
                              <span className="sr-only">Sua tin nhan</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => deleteMessage(message._id)}
                          >
                            <Trash2Icon />
                            <span className="sr-only">Thu hoi tin nhan</span>
                          </Button>
                        </div>
                      )}
                      <div
                        className={
                          sticker && !isDeleted
                            ? "rounded-lg bg-transparent px-1 py-0 text-5xl leading-none"
                            : `rounded-lg px-3 py-2 text-sm shadow-sm ${
                                isMine
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-foreground"
                              } ${isDeleted ? "italic opacity-75" : ""}`
                        }
                      >
                        {isDeleted ? (
                          "Tin nhan da duoc thu hoi"
                        ) : message.type === "location" && message.location ? (
                          <LocationView location={message.location} />
                        ) : (
                          <>
                            {message.content}
                            {attachments.map((attachment) => (
                              <AttachmentView
                                key={attachment.url}
                                attachment={attachment}
                                isMine={isMine}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                    {message._id === lastMineMessageId && seenByOthers && (
                      <span className="px-1 text-xs text-muted-foreground">
                        Da xem
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 flex-col gap-2 border-t bg-background p-3"
      >
        {(selectedFiles.length > 0 || editingMessageId) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {editingMessageId && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                Dang sua tin nhan
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessageId(null);
                    setDraft("");
                  }}
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            )}
            {selectedFiles.map((file) => (
              <span
                key={`${file.name}-${file.size}`}
                className="inline-flex max-w-56 items-center gap-1 rounded-md bg-muted px-2 py-1"
              >
                <PaperclipIcon className="size-3" />
                <span className="truncate">{file.name}</span>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-lg"
                variant="ghost"
                disabled={Boolean(editingMessageId) || locating || sending}
                aria-label="Mo tuy chon gui"
              >
                {locating ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <MoreHorizontalIcon />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onSelect={handleSendLocation}>
                <MapPinIcon />
                Gui dinh vi
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon-lg"
                variant="ghost"
                aria-label="Mo emoji va sticker"
              >
                <SmileIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" side="top" className="w-72 gap-2">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={pickerTab === "emoji" ? "secondary" : "ghost"}
                  onClick={() => setPickerTab("emoji")}
                >
                  <SmileIcon />
                  Emoji
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={pickerTab === "sticker" ? "secondary" : "ghost"}
                  onClick={() => setPickerTab("sticker")}
                >
                  <StickerIcon />
                  Sticker
                </Button>
              </div>

              {pickerTab === "emoji" ? (
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="flex aspect-square items-center justify-center rounded-md text-xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {STICKERS.map((sticker) => (
                    <button
                      key={sticker}
                      type="button"
                      className="flex aspect-square items-center justify-center rounded-lg bg-muted/60 text-4xl transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleSticker(sticker)}
                      disabled={sending || Boolean(editingMessageId)}
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              setSelectedFiles(Array.from(event.target.files || []).slice(0, 5));
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="icon-lg"
            variant="ghost"
            disabled={Boolean(editingMessageId)}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Dinh kem tep"
          >
            <PaperclipIcon />
          </Button>

          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              sendTypingStart();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            className="max-h-32 min-h-10 resize-none"
            placeholder="Nhap tin nhan..."
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={(!draft.trim() && selectedFiles.length === 0) || sending}
            aria-label={editingMessageId ? "Luu tin nhan" : "Gui tin nhan"}
          >
            {editingMessageId ? <CheckIcon /> : <SendIcon />}
          </Button>
        </div>
      </form>

      {selectedConversation.type === "group" && (
        <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Quan ly nhom chat</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="groupName" className="text-xs font-medium">
                  Ten nhom
                </label>
                <div className="flex gap-2">
                  <Input
                    id="groupName"
                    value={groupName}
                    disabled={!isGroupOwner}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder="Nhap ten nhom"
                  />
                  {isGroupOwner && (
                    <Button
                      type="button"
                      onClick={handleUpdateGroupInfo}
                      disabled={!groupName.trim()}
                    >
                      <CheckIcon />
                      Luu
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Thanh vien</p>
                  <span className="text-xs text-muted-foreground">
                    {selectedConversation.participants.length} nguoi
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedConversation.participants.map((participant) => {
                    const participantId = getParticipantId(participant);
                    const isOwner = participantId === groupOwnerId;
                    const isMe = participantId === user?._id;

                    return (
                      <div
                        key={participantId}
                        className="flex items-center gap-3 rounded-lg border p-2"
                      >
                        <Avatar size="sm">
                          <AvatarImage src={getParticipantAvatar(participant)} />
                          <AvatarFallback>
                            {initials(getParticipantName(participant))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {getParticipantName(participant)}
                            {isMe ? " (ban)" : ""}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Tham gia {participant.joinedAt ? formatTime(participant.joinedAt) : ""}
                          </p>
                        </div>
                        {isOwner && <CrownIcon className="size-4 text-amber-500" />}
                        {isGroupOwner && !isMe && !isOwner && (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleRemoveGroupMember(participantId)}
                            aria-label="Xoa thanh vien"
                          >
                            <UserMinusIcon />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {isGroupOwner && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Them ban be vao nhom</p>
                    {selectedMemberIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Da chon {selectedMemberIds.length}
                      </span>
                    )}
                  </div>
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
                    {addableFriends.map((friend) => (
                      <label
                        key={friend._id}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(friend._id)}
                          onChange={() => toggleSelectedMember(friend._id)}
                        />
                        <Avatar size="sm">
                          <AvatarImage src={friend.avatarUrl} />
                          <AvatarFallback>{initials(friend.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {friend.displayName}
                        </span>
                      </label>
                    ))}
                    {addableFriends.length === 0 && (
                      <p className="px-2 py-3 text-sm text-muted-foreground">
                        Khong con ban be nao co the them.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddGroupMembers}
                    disabled={selectedMemberIds.length === 0}
                  >
                    <UserPlusIcon />
                    Them thanh vien
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)}>
                Dong
              </Button>
              <Button type="button" variant="destructive" onClick={handleLeaveGroup}>
                <LogOutIcon />
                Roi nhom
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
};

export default ChatWindowLayout;
