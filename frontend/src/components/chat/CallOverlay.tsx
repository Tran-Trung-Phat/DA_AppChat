import * as React from "react";
import { useCallStore } from "@/stores/useCallStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  PhoneIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
  MicIcon,
  MicOffIcon,
  UserIcon,
} from "lucide-react";

const initials = (name?: string) =>
  (name || "M")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const CallOverlay = () => {
  const {
    callActive,
    callState,
    callType,
    peerUser,
    isMuted,
    isVideoOff,
    localStream,
    remoteStream,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCallStore();

  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [callDuration, setCallDuration] = React.useState(0);

  // Hook up video streams to HTML video elements
  React.useEffect(() => {
    if (callState === "connected" && callType === "video") {
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [callState, callType, localStream, remoteStream]);

  // Call timer
  React.useEffect(() => {
    let timer: number | null = null;
    if (callState === "connected") {
      setCallDuration(0);
      timer = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!callActive || !peerUser) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-white select-none animate-in fade-in duration-300">
      
      {/* 1. Ringing State (Cuộc gọi đến) */}
      {callState === "ringing" && (
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000" />
            <Avatar className="size-28 border-4 border-primary/30 relative">
              <AvatarImage src={peerUser.avatarUrl} alt={peerUser.displayName} />
              <AvatarFallback className="bg-primary text-black text-2xl font-bold">
                {initials(peerUser.displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h2 className="text-xl font-bold">{peerUser.displayName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {callType === "video"
                ? "Cuộc gọi video đến..."
                : "Cuộc gọi thoại đến..."}
            </p>
          </div>
          <div className="flex items-center gap-6 mt-8">
            <Button
              size="lg"
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 size-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              onClick={acceptIncomingCall}
            >
              {callType === "video" ? (
                <VideoIcon className="size-6 text-white" />
              ) : (
                <PhoneIcon className="size-6 text-white" />
              )}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700 size-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              onClick={declineIncomingCall}
            >
              <PhoneOffIcon className="size-6 text-white" />
            </Button>
          </div>
        </div>
      )}

      {/* 2. Calling State (Đang gọi đi) */}
      {callState === "calling" && (
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border border-primary/30 animate-pulse duration-1000 scale-125" />
            <Avatar className="size-28 border-4 border-primary/20 relative">
              <AvatarImage src={peerUser.avatarUrl} alt={peerUser.displayName} />
              <AvatarFallback className="bg-primary text-black text-2xl font-bold">
                {initials(peerUser.displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h2 className="text-xl font-bold">{peerUser.displayName}</h2>
            <p className="text-sm text-muted-foreground mt-1 animate-pulse">
              Đang đổ chuông...
            </p>
          </div>
          <div className="mt-8">
            <Button
              size="lg"
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700 size-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              onClick={() => endCall(true)}
            >
              <PhoneOffIcon className="size-6 text-white" />
            </Button>
          </div>
        </div>
      )}

      {/* 3. Connected State (Đã kết nối) */}
      {callState === "connected" && (
        <div className="w-full h-full flex flex-col justify-between p-6 relative">
          
          {/* Top Panel (Peer Details & Duration) */}
          <div className="absolute top-6 left-6 flex flex-col gap-1 z-[100] drop-shadow-md">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border border-white/20">
                <AvatarImage src={peerUser.avatarUrl} alt={peerUser.displayName} />
                <AvatarFallback>{initials(peerUser.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{peerUser.displayName}</p>
                <p className="text-[10px] text-zinc-400">@{peerUser.username}</p>
              </div>
            </div>
            <p className="text-xs font-mono text-zinc-300 mt-1 pl-13">
              {formatDuration(callDuration)}
            </p>
          </div>

          {/* Media / Video Stream Area */}
          <div className="flex-1 w-full h-full flex items-center justify-center relative rounded-2xl overflow-hidden bg-zinc-950">
            {callType === "video" ? (
              <div className="w-full h-full relative">
                {/* Remote Video (Full Screen) */}
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-400 bg-zinc-900">
                    <UserIcon className="size-12 animate-pulse" />
                    <p className="text-xs">Đang chờ video từ đối phương...</p>
                  </div>
                )}

                {/* Local Video (Floating Box) */}
                <div className="absolute top-6 right-6 w-28 sm:w-36 aspect-[3/4] rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900 z-[100]">
                  {isVideoOff ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                      <VideoOffIcon className="size-5" />
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  )}
                </div>
              </div>
            ) : (
              // Audio Call Centered Avatars
              <div className="flex items-center gap-12 sm:gap-20">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="size-24 sm:size-28 border-2 border-white/20">
                    <AvatarImage src={peerUser.avatarUrl} />
                    <AvatarFallback>{initials(peerUser.displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-zinc-400 font-medium">Đối phương</span>
                </div>
                
                {/* Audio Wave animation */}
                <div className="flex items-end gap-1.5 h-10">
                  {[...Array(6)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 bg-primary/80 rounded-full animate-bounce"
                      style={{
                        height: `${20 + Math.random() * 80}%`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: "0.8s",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Overlay Tray */}
          <div className="absolute bottom-10 inset-x-0 flex items-center justify-center gap-6 z-[100]">
            {/* Mute Button */}
            <Button
              size="icon"
              variant={isMuted ? "default" : "outline"}
              className={`size-12 rounded-full border-white/20 hover:scale-105 active:scale-95 transition-transform ${
                isMuted
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-black/35 hover:bg-black/55 text-white"
              }`}
              onClick={toggleMute}
              title={isMuted ? "Bật Mic" : "Tắt Mic"}
            >
              {isMuted ? (
                <MicOffIcon className="size-5" />
              ) : (
                <MicIcon className="size-5" />
              )}
            </Button>

            {/* End Call Button */}
            <Button
              size="lg"
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700 size-14 rounded-full p-0 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              onClick={() => endCall(true)}
              title="Kết thúc cuộc gọi"
            >
              <PhoneOffIcon className="size-6 text-white" />
            </Button>

            {/* Video Toggle Button (Only for video calls) */}
            {callType === "video" && (
              <Button
                size="icon"
                variant={isVideoOff ? "default" : "outline"}
                className={`size-12 rounded-full border-white/20 hover:scale-105 active:scale-95 transition-transform ${
                  isVideoOff
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-black/35 hover:bg-black/55 text-white"
                }`}
                onClick={toggleVideo}
                title={isVideoOff ? "Bật Camera" : "Tắt Camera"}
              >
                {isVideoOff ? (
                  <VideoOffIcon className="size-5" />
                ) : (
                  <VideoIcon className="size-5" />
                )}
              </Button>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default CallOverlay;
