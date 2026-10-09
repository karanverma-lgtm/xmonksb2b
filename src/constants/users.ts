export interface UserAccount {
  username: string;
  password: string;
  name: string;
  role: string;
  avatarColor?: string;
  email?: string;
  phone?: string;
  designation?: string;
}

export const VALID_USERS: UserAccount[] = [
  {
    username: "admin",
    password: "nimda",
    name: "Admin User",
    role: "Administrator",
    designation: "Executive Leadership",
    email: "sales@xmonks.com",
    phone: "",
    avatarColor: "from-blue-600 to-indigo-600",
  },
  {
    username: "amit",
    password: "tima",
    name: "Amit Shelly",
    role: "Sales Representative",
    designation: "Senior Business Lead – Enterprise",
    email: "amit@xmonks.com",
    phone: "+91 9711266420",
    avatarColor: "from-emerald-600 to-teal-600",
  },
  {
    username: "gaurav",
    password: "varuag",
    name: "Gaurav",
    role: "Sales Representative",
    designation: "Enterprise Business Lead",
    email: "gaurav@xmonks.com",
    phone: "",
    avatarColor: "from-amber-600 to-orange-600",
  },
  {
    username: "preeti",
    password: "iteerp",
    name: "Preeti",
    role: "Sales Representative",
    designation: "Enterprise Business Lead",
    email: "preeti@xmonks.com",
    phone: "",
    avatarColor: "from-rose-600 to-pink-600",
  },
  {
    username: "nikhil",
    password: "lihkin",
    name: "Nikhil",
    role: "Sales Representative",
    designation: "Enterprise Business Lead",
    email: "nikhil@xmonks.com",
    phone: "",
    avatarColor: "from-cyan-600 to-blue-600",
  },
  {
    username: "ruby",
    password: "ybur",
    name: "Ruby Dayal",
    role: "Sales Manager",
    designation: "Sales Manager – Enterprise",
    email: "ruby.dayal@xmonks.com",
    phone: "",
    avatarColor: "from-purple-600 to-pink-600",
  },
  {
    username: "accounts",
    password: "money@xmonks",
    name: "Accounts Department",
    role: "Accounts",
    designation: "Finance & Accounts",
    email: "accounts@xmonks.com",
    phone: "",
    avatarColor: "from-emerald-600 to-teal-700",
  },
];

export function getUserProfile(
  userOrName?: Partial<UserAccount> | string | null
): {
  name: string;
  email: string;
  role: string;
  designation: string;
  phone: string;
} {
  if (!userOrName) {
    return {
      name: "xMonks B2B Team",
      email: "sales@xmonks.com",
      role: "Enterprise Solutions",
      designation: "Enterprise Solutions",
      phone: "",
    };
  }

  const query =
    typeof userOrName === "string"
      ? userOrName.toLowerCase().trim()
      : (userOrName.username || userOrName.name || "").toLowerCase().trim();

  const found = VALID_USERS.find(
    (u) =>
      u.username.toLowerCase() === query ||
      u.name.toLowerCase() === query ||
      u.name.toLowerCase().startsWith(query) ||
      query.startsWith(u.username.toLowerCase())
  );

  if (found) {
    return {
      name: found.name,
      email: found.email || `${found.username}@xmonks.com`,
      role: found.role,
      designation: found.designation || found.role,
      phone: found.phone || "",
    };
  }

  if (typeof userOrName === "object" && userOrName) {
    return {
      name: userOrName.name || "xMonks Team",
      email: userOrName.email || `${userOrName.username || "sales"}@xmonks.com`,
      role: userOrName.role || "Enterprise Solutions",
      designation: userOrName.designation || userOrName.role || "Enterprise Solutions",
      phone: userOrName.phone || "",
    };
  }

  return {
    name: String(userOrName),
    email: `${query.replace(/\s+/g, ".")}@xmonks.com`,
    role: "Enterprise Solutions",
    designation: "Enterprise Solutions",
    phone: "",
  };
}

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

/**
 * Resolves a given owner/user string to their canonical display name.
 * Handles known aliases: "Amit" <-> "Amit Shelly", "Ruby" <-> "Ruby Dayal", etc.
 */
export function getCanonicalOwnerName(name?: string | null): string {
  if (!name) return "Unassigned";
  const clean = name.trim();
  const lower = clean.toLowerCase();
  if (!lower || lower === "all" || lower === "unassigned") return clean;
  if (lower === "amit" || lower === "amit shelly") return "Amit Shelly";
  if (lower === "ruby" || lower === "ruby dayal") return "Ruby Dayal";
  if (lower === "gaurav") return "Gaurav";
  if (lower === "preeti" || lower === "pooja") return "Preeti";
  if (lower === "nikhil") return "Nikhil";
  if (lower === "admin" || lower === "admin user") return "Admin User";
  if (lower === "accounts" || lower === "accounts department") return "Accounts Department";

  for (const u of VALID_USERS) {
    const uName = u.name.toLowerCase();
    const uUser = u.username.toLowerCase();
    if (
      lower === uUser ||
      lower === uName ||
      lower.includes(uUser) ||
      uName.includes(lower) ||
      lower.includes(uName)
    ) {
      return u.name;
    }
  }
  return clean;
}

/**
 * Compares two owner names using a flexible contains & canonical alias condition.
 * e.g. "Amit Shelly" matches "Amit", "Ruby Dayal" matches "Ruby".
 */
export function isSameOwner(ownerA?: string | null, ownerB?: string | null): boolean {
  if (!ownerA || !ownerB) return false;
  const a = ownerA.toLowerCase().trim();
  const b = ownerB.toLowerCase().trim();
  if (a === "all" || b === "all") return true;
  if (a === b) return true;

  // Two-way contains check
  if (a.includes(b) || b.includes(a)) return true;

  // Canonical name equivalence check
  const canonA = getCanonicalOwnerName(a).toLowerCase();
  const canonB = getCanonicalOwnerName(b).toLowerCase();
  if (canonA === canonB) return true;
  if (canonA.includes(canonB) || canonB.includes(canonA)) return true;

  return false;
}

