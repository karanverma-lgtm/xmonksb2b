export interface UserAccount {
  username: string;
  password: string;
  name: string;
  role: string;
}

export const VALID_USERS: UserAccount[] = [
  {
    username: "admin",
    password: "nimda",
    name: "Admin User",
    role: "Administrator",
  },
  {
    username: "ruby",
    password: "ybur",
    name: "Ruby",
    role: "Sales Manager",
  },
];

export function authenticateUser(usernameInput: string, passwordInput: string): UserAccount | null {
  const cleanUser = usernameInput.trim().toLowerCase();
  const found = VALID_USERS.find(
    (u) => u.username.toLowerCase() === cleanUser && u.password === passwordInput
  );
  return found || null;
}
