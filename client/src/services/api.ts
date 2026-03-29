import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const api = axios.create({
  baseURL: API_BASE,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Auth ----
export interface LoginResponse {
  message: string;
  token: string;
  user: { id: string; name: string; email: string; role: string };
}

export const login = (email: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { email, password });

export const register = (name: string, email: string, password: string, role: string) =>
  api.post<LoginResponse>('/auth/register', { name, email, password, role });

// ---- Auctions ----
export interface Auction {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  start_price: number;
  current_highest_bid: number;
  end_time: string;
  status: string;
  seller: { name: string };
  highest_bidder: { name: string } | null;
  bids?: Bid[];
}

export interface Bid {
  id: string;
  amount: number;
  created_at: string;
  bidder: { name: string };
}

export const getAuctions = () => api.get<Auction[]>('/auctions');

export const getAuction = (id: string) => api.get<Auction>(`/auctions/${id}`);

// ---- Bids ----
export const placeBid = (auctionId: string, amount: number) =>
  api.post(`/auctions/${auctionId}/bids`, { amount });

export default api;
