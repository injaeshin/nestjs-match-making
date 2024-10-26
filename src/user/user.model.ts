import { MatchStatus } from '../common/enums';
import { Socket } from 'socket.io';

export interface IUser {
  id: number;
  name: string;
  score: number;
  socket?: Socket;
  matchStatus?: MatchStatus;
}

export class UserModel implements IUser {
  id: number;
  name: string;
  score: number;
  socket?: Socket;
  matchStatus?: MatchStatus = MatchStatus.None;

  clear() {
    this.id = 0;
    this.name = '';
    this.score = 0;
    this.socket = undefined;
    this.matchStatus = MatchStatus.None;
  }

  setStatus(status: MatchStatus) {
    this.matchStatus = status;
  }

  setSocket(client: Socket) {
    this.socket = client;
  }

  getSocket(): Socket {
    return this.socket;
  }

  isOnline(): boolean {
    return !!this.socket?.connected;
  }
}

export const botUsers: IUser[] = [
  { id: 1, name: 'John Doe', score: 100 },
  { id: 2, name: 'Alice Caeiro', score: 220 },
  { id: 3, name: 'Who Knows', score: 280 },
  { id: 4, name: 'Another Person', score: 420 },
  { id: 5, name: 'Help Me', score: 560 },
  { id: 6, name: 'Anyone', score: 590 },
  { id: 7, name: 'Nobody', score: 660 },
  { id: 8, name: 'Some Person', score: 800 },
  { id: 9, name: 'Another Person', score: 890 },
  { id: 10, name: 'Somebody', score: 1000 },
];
