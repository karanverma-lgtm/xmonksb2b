export interface UserAccount {
  username: string;
  password: string;
  name: string;
  role: string;
  avatarColor?: string;
}

export const VALID_USERS: UserAccount[] = [
  {
    username: "admin",
    password: "nimda",
    name: "Admin User",
    role: "Administrator",
    avatarColor: "from-blue-600 to-indigo-600",
  },
  {
    username: "amit",
    password: "tima",
    name: "Amit",
    role: "Sales Representative",
    avatarColor: "from-emerald-600 to-teal-600",
  },
  {
    username: "gaurav",
    password: "varuag",
    name: "Gaurav",
    role: "Sales Representative",
    avatarColor: "from-amber-600 to-orange-600",
  },
  {
    username: "preeti",
    password: "iteerp",
    name: "Preeti",
    role: "Sales Representative",
    avatarColor: "from-rose-600 to-pink-600",
  },
  {
    username: "nikhil",
    password: "lihkin",
    name: "Nikhil",
    role: "Sales Representative",
    avatarColor: "from-cyan-600 to-blue-600",
  },
  {
    username: "ruby",
    password: "ybur",
    name: "Ruby",
    role: "Sales Manager",
    avatarColor: "from-purple-600 to-pink-600",
  },
];

export function authenticateUser(usernameInput: string, passwordInput: string): UserAccount | null {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();
  const found = VALID_USERS.find(
    (u) =>
      u.username.toLowerCase() === cleanUser &&
      (u.password === cleanPass || u.password.toLowerCase() === cleanPass.toLowerCase())
  );
  return found || null;
}
