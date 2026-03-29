import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
};

export const joinAuction = (auctionId: string) => {
  const s = getSocket();
  s.emit('join_auction', auctionId);
};

export const leaveAuction = (auctionId: string) => {
  const s = getSocket();
  s.emit('leave_auction', auctionId);
};

export default getSocket;
