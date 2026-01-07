export interface User {
  id: string;
  email: string;
  password?: string | null;
  role: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}
