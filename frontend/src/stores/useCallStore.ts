import { create } from "zustand";
import { toast } from "sonner";
import { socketService } from "@/services/socketService";
import type { UserSummary } from "@/types/chat";
import { useChatStore } from "./useChatStore";

// Programmable sound synthesizer using browser's AudioContext (no static file download needed!)
let audioCtx: AudioContext | null = null;
let ringtoneInterval: number | null = null;

const playRingtone = (type: "ringing" | "calling") => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    if (ringtoneInterval) clearInterval(ringtoneInterval);

    const playBeep = () => {
      if (!audioCtx || audioCtx.state === "suspended") return;
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "ringing") {
        // High-pitched double phone ring: 440Hz + 480Hz
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);

        setTimeout(() => {
          if (!audioCtx) return;
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.frequency.setValueAtTime(440, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.5);
        }, 700);
      } else {
        // Outgoing call beep sound
        osc.frequency.setValueAtTime(425, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
      }
    };

    playBeep();
    ringtoneInterval = window.setInterval(playBeep, type === "ringing" ? 3000 : 4000);
  } catch (error) {
    console.error("Lỗi khi phát nhạc chuông cuộc gọi:", error);
  }
};

const stopRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
};

interface CallState {
  callActive: boolean;
  callState: "idle" | "calling" | "ringing" | "connected";
  callType: "audio" | "video" | null;
  peerUser: UserSummary | null;
  isMuted: boolean;
  isVideoOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  incomingSignalData: any | null;

  // Group calling states
  groupCallActive: boolean;
  groupCallState: "idle" | "calling" | "ringing" | "connected";
  groupCallType: "audio" | "video" | null;
  groupConversationId: string | null;
  groupCallPeers: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    stream: MediaStream | null;
    peerConnection: RTCPeerConnection | null;
  }>;
  groupCallCaller: UserSummary | null;

  startCall: (toUser: UserSummary, type: "audio" | "video") => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => void;
  endCall: (emitEvent?: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  
  handleIncomingCall: (fromUserId: string, fromUser: UserSummary, signalData: any, callType: "audio" | "video") => void;
  handleCallAccepted: (signalData: any) => Promise<void>;
  handleIceCandidate: (candidate: any) => Promise<void>;
  handleCallEnded: () => void;
  handleCallDeclined: () => void;
  handleCallFailed: (reason: string) => void;

  // Group calling methods
  startGroupCall: (conversationId: string, type: "audio" | "video") => Promise<void>;
  joinGroupCall: (conversationId: string) => Promise<void>;
  acceptIncomingGroupCall: () => Promise<void>;
  declineIncomingGroupCall: () => void;
  leaveGroupCall: () => void;
  initiatePeerConnection: (peerId: string, isInitiator: boolean) => Promise<RTCPeerConnection>;

  handleIncomingGroupCall: (conversationId: string, caller: UserSummary, callType: "audio" | "video") => void;
  handleGroupUserJoined: (userId: string) => Promise<void>;
  handleGroupUserLeft: (userId: string) => void;
  handleGroupUserDeclined: (userId: string) => void;
  handleGroupJoinSuccess: (existingUsers: string[]) => Promise<void>;
  handleGroupSignal: (fromUserId: string, signalData: any) => Promise<void>;
}

const getMemberInfo = (userId: string) => {
  const conversations = useChatStore.getState().conversations;
  for (const conv of conversations) {
    const member = conv.participants.find((p) => p._id === userId);
    if (member) return member;
  }
  return { _id: userId, displayName: "Người dùng", avatarUrl: null };
};

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useCallStore = create<CallState>((set, get) => {
  
  const setupPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.getSocket()?.emit("call:ice-candidate", {
          toUserId: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        set({ remoteStream: event.streams[0] });
      }
    };

    set({ peerConnection: pc });
    return pc;
  };

  return {
    callActive: false,
    callState: "idle",
    callType: null,
    peerUser: null,
    isMuted: false,
    isVideoOff: false,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    incomingSignalData: null,

    // Group calling initial states
    groupCallActive: false,
    groupCallState: "idle",
    groupCallType: null,
    groupConversationId: null,
    groupCallPeers: [],
    groupCallCaller: null,

    startCall: async (toUser, type) => {
      try {
        set({
          callActive: true,
          callState: "calling",
          callType: type,
          peerUser: toUser,
          isMuted: false,
          isVideoOff: false,
          remoteStream: null,
        });

        playRingtone("calling");

        // Ask for media permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        
        set({ localStream: stream });
        
        const pc = setupPeerConnection(toUser._id);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socketService.getSocket()?.emit("call:initiate", {
          toUserId: toUser._id,
          signalData: offer,
          callType: type,
        });
      } catch (error) {
        console.error("Lỗi khi khởi tạo cuộc gọi:", error);
        toast.error("Không thể truy cập camera hoặc micro");
        get().endCall(true);
      }
    },

    acceptIncomingCall: async () => {
      const { peerUser, incomingSignalData, callType } = get();
      if (!peerUser || !incomingSignalData || !callType) return;

      stopRingtone();
      set({ callState: "connected" });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });

        set({ localStream: stream });

        const pc = setupPeerConnection(peerUser._id);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        await pc.setRemoteDescription(new RTCSessionDescription(incomingSignalData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketService.getSocket()?.emit("call:accept", {
          toUserId: peerUser._id,
          signalData: answer,
        });
      } catch (error) {
        console.error("Lỗi khi chấp nhận cuộc gọi:", error);
        toast.error("Không thể truy cập camera/micro hoặc kết nối thất bại");
        get().endCall(true);
      }
    },

    declineIncomingCall: () => {
      const { peerUser } = get();
      if (peerUser) {
        socketService.getSocket()?.emit("call:decline", { toUserId: peerUser._id });
      }
      get().endCall(false);
    },

    endCall: (emitEvent = true) => {
      const { peerConnection, localStream, peerUser } = get();
      
      stopRingtone();

      if (emitEvent && peerUser) {
        socketService.getSocket()?.emit("call:end", { toUserId: peerUser._id });
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.close();
      }

      set({
        callActive: false,
        callState: "idle",
        callType: null,
        peerUser: null,
        localStream: null,
        remoteStream: null,
        peerConnection: null,
        incomingSignalData: null,
        isMuted: false,
        isVideoOff: false,
      });
    },

    toggleMute: () => {
      const { localStream, isMuted } = get();
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach((track) => {
          track.enabled = isMuted; // Toggle enablement state
        });
        set({ isMuted: !isMuted });
      }
    },

    toggleVideo: () => {
      const { localStream, isVideoOff } = get();
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach((track) => {
          track.enabled = isVideoOff; // Toggle enablement state
        });
        set({ isVideoOff: !isVideoOff });
      }
    },

    handleIncomingCall: (fromUserId, fromUser, signalData, callType) => {
      const { callActive } = get();
      if (callActive) {
        // Send busy signal back to caller
        socketService.getSocket()?.emit("call:busy", { toUserId: fromUserId });
        return;
      }

      set({
        callActive: true,
        callState: "ringing",
        callType,
        peerUser: fromUser,
        incomingSignalData: signalData,
        isMuted: false,
        isVideoOff: false,
        remoteStream: null,
      });

      playRingtone("ringing");
    },

    handleCallAccepted: async (signalData) => {
      const { peerConnection } = get();
      if (peerConnection) {
        try {
          stopRingtone();
          set({ callState: "connected" });
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
        } catch (error) {
          console.error("Lỗi khi xử lý SDP Answer nhận được:", error);
          get().endCall(true);
        }
      }
    },

    handleIceCandidate: async (candidate) => {
      const { peerConnection } = get();
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Lỗi khi thêm ICE candidate:", error);
        }
      }
    },

    handleCallEnded: () => {
      toast.info("Cuộc gọi đã kết thúc");
      get().endCall(false);
    },

    handleCallDeclined: () => {
      toast.info("Người nhận đã từ chối cuộc gọi");
      get().endCall(false);
    },

    handleCallFailed: (reason) => {
      if (reason === "offline") {
        toast.error("Người dùng hiện không trực tuyến");
      } else {
        toast.error("Cuộc gọi thất bại");
      }
      get().endCall(false);
    },

    startGroupCall: async (conversationId, type) => {
      try {
        set({
          groupCallActive: true,
          groupCallState: "connected",
          groupCallType: type,
          groupConversationId: conversationId,
          groupCallPeers: [],
          groupCallCaller: null,
          isMuted: false,
          isVideoOff: false,
        });

        // Ask for media permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });

        set({ localStream: stream });

        socketService.getSocket()?.emit("group-call:initiate", {
          conversationId,
          callType: type,
        });
      } catch (error) {
        console.error("Lỗi khi khởi tạo cuộc gọi nhóm:", error);
        toast.error("Không thể truy cập camera hoặc micro");
        get().leaveGroupCall();
      }
    },

    joinGroupCall: async (conversationId) => {
      try {
        const { groupCallType } = get();
        const type = groupCallType || "audio";

        set({
          groupCallActive: true,
          groupCallState: "connected",
          groupConversationId: conversationId,
          isMuted: false,
          isVideoOff: false,
        });

        stopRingtone();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });

        set({ localStream: stream });

        socketService.getSocket()?.emit("group-call:join", {
          conversationId,
        });
      } catch (error) {
        console.error("Lỗi khi tham gia cuộc gọi nhóm:", error);
        toast.error("Không thể truy cập camera hoặc micro");
        get().leaveGroupCall();
      }
    },

    acceptIncomingGroupCall: async () => {
      const { groupConversationId } = get();
      if (!groupConversationId) return;
      await get().joinGroupCall(groupConversationId);
    },

    declineIncomingGroupCall: () => {
      const { groupConversationId } = get();
      if (groupConversationId) {
        socketService.getSocket()?.emit("group-call:decline", {
          conversationId: groupConversationId,
        });
      }
      stopRingtone();
      set({
        groupCallActive: false,
        groupCallState: "idle",
        groupCallType: null,
        groupConversationId: null,
        groupCallPeers: [],
        groupCallCaller: null,
        localStream: null,
      });
    },

    leaveGroupCall: () => {
      const { groupConversationId, localStream, groupCallPeers } = get();
      stopRingtone();

      if (groupConversationId) {
        socketService.getSocket()?.emit("group-call:leave", {
          conversationId: groupConversationId,
        });
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      groupCallPeers.forEach((peer) => {
        if (peer.peerConnection) {
          peer.peerConnection.onicecandidate = null;
          peer.peerConnection.ontrack = null;
          peer.peerConnection.close();
        }
      });

      set({
        groupCallActive: false,
        groupCallState: "idle",
        groupCallType: null,
        groupConversationId: null,
        groupCallPeers: [],
        groupCallCaller: null,
        localStream: null,
        isMuted: false,
        isVideoOff: false,
      });
    },

    initiatePeerConnection: async (peerId, isInitiator) => {
      const pc = new RTCPeerConnection(rtcConfig);

      pc.onicecandidate = (event) => {
        if (event.candidate && get().groupConversationId) {
          socketService.getSocket()?.emit("group-call:signal", {
            conversationId: get().groupConversationId!,
            toUserId: peerId,
            signalData: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set((state) => ({
            groupCallPeers: state.groupCallPeers.map((p) =>
              p.userId === peerId ? { ...p, stream: event.streams[0] } : p
            ),
          }));
        }
      };

      const localStream = get().localStream;
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      const member = getMemberInfo(peerId);
      set((state) => ({
        groupCallPeers: [
          ...state.groupCallPeers.filter((p) => p.userId !== peerId),
          {
            userId: peerId,
            displayName: member.displayName || "Người dùng",
            avatarUrl: member.avatarUrl || null,
            stream: null,
            peerConnection: pc,
          },
        ],
      }));

      if (isInitiator) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketService.getSocket()?.emit("group-call:signal", {
            conversationId: get().groupConversationId!,
            toUserId: peerId,
            signalData: offer,
          });
        } catch (err) {
          console.error("Lỗi khi tạo offer cho peer:", peerId, err);
        }
      }

      return pc;
    },

    handleIncomingGroupCall: (conversationId, caller, callType) => {
      const { callActive, groupCallActive } = get();
      if (callActive || groupCallActive) {
        return;
      }

      set({
        groupCallActive: true,
        groupCallState: "ringing",
        groupCallType: callType,
        groupConversationId: conversationId,
        groupCallCaller: caller,
        groupCallPeers: [],
        isMuted: false,
        isVideoOff: false,
        localStream: null,
      });

      playRingtone("ringing");
    },

    handleGroupUserJoined: async (userId) => {
      // Add the user as connecting
      const member = getMemberInfo(userId);
      set((state) => {
        const exists = state.groupCallPeers.some((p) => p.userId === userId);
        if (exists) return {};
        return {
          groupCallPeers: [
            ...state.groupCallPeers,
            {
              userId,
              displayName: member.displayName || "Người dùng",
              avatarUrl: member.avatarUrl || null,
              stream: null,
              peerConnection: null,
            },
          ],
        };
      });
    },

    handleGroupUserLeft: (userId) => {
      const { groupCallPeers } = get();
      const peer = groupCallPeers.find((p) => p.userId === userId);
      if (peer?.peerConnection) {
        peer.peerConnection.onicecandidate = null;
        peer.peerConnection.ontrack = null;
        peer.peerConnection.close();
      }

      set((state) => ({
        groupCallPeers: state.groupCallPeers.filter((p) => p.userId !== userId),
      }));

      toast.info(`${peer?.displayName || "Một thành viên"} đã rời cuộc gọi`);
    },

    handleGroupUserDeclined: (userId) => {
      const member = getMemberInfo(userId);
      toast.info(`${member.displayName || "Một thành viên"} đã từ chối cuộc gọi`);
    },

    handleGroupJoinSuccess: async (existingUsers) => {
      // Loop over existing users and initiate peer connection
      for (const userId of existingUsers) {
        if (userId !== socketService.getSocket()?.id) {
          await get().initiatePeerConnection(userId, true);
        }
      }
    },

    handleGroupSignal: async (fromUserId, signalData) => {
      let peer = get().groupCallPeers.find((p) => p.userId === fromUserId);
      let pc = peer?.peerConnection;

      if (!pc) {
        pc = await get().initiatePeerConnection(fromUserId, false);
      }

      try {
        if (signalData.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketService.getSocket()?.emit("group-call:signal", {
            conversationId: get().groupConversationId!,
            toUserId: fromUserId,
            signalData: answer,
          });
        } else if (signalData.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        } else if (signalData.type === "candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (err) {
        console.error("Lỗi khi xử lý tín hiệu group call từ:", fromUserId, err);
      }
    },
  };
});
