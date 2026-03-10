export interface User {
  id: number;
  username: string;
}

export interface Todo {
  id: number;
  userId: number;
  text: string;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
