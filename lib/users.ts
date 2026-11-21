import { isEnvOwner } from "./session";
import { db } from "./db";
import { User } from "./models";
import { checkPassword, hashPassword } from "./passwords";

export type UserRow = {
  id: string;
  username: string;
  name: string;
  role: "admin" | "consultant";
  active: boolean;
};

function cleanUsername(value: string) {
  return value.trim().toLowerCase();
}

export async function ensureOwner() {
  await db();
  const username = cleanUsername(process.env.AUTH_USERNAME || "");
  const password = process.env.AUTH_PASSWORD || "";
  if (!username || !password) return null;
  const existing = await User.findOne({ username });
  if (existing) return existing;
  return User.create({
    username,
    name: "Saafar admin",
    role: "admin",
    passwordHash: await hashPassword(password),
    active: true,
  });
}

export async function authenticate(username: string, password: string) {
  await db();
  const key = cleanUsername(username);
  if (!key || !password) return null;
  const owner = await ensureOwner();
  const user = await User.findOne({ username: key });
  if (!user) return null;
  const passwordOk = (await checkPassword(password, user.passwordHash)) || (owner && String(owner._id) === String(user._id) && isEnvOwner(key, password));
  if (!passwordOk) return null;
  if (!user.active && !(owner && String(owner._id) === String(user._id) && isEnvOwner(key, password))) return null;
  if (!user.active) {
    user.active = true;
    await user.save();
  }
  return user;
}

export async function listUsers(): Promise<UserRow[]> {
  await ensureOwner();
  const rows = await User.find().sort({ role: 1, name: 1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    username: row.username,
    name: row.name,
    role: row.role,
    active: row.active,
  }));
}

export async function createUser(input: { name: string; username: string; password: string; role: "admin" | "consultant" }) {
  await ensureOwner();
  const name = input.name.trim();
  const username = cleanUsername(input.username);
  if (!name) throw new Error("Name is required");
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("Username must be 3–32 letters, numbers, dots, or dashes");
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters");
  const taken = await User.findOne({ username });
  if (taken) throw new Error("That username is already in use");
  const created = await User.create({
    username,
    name,
    role: input.role === "admin" ? "admin" : "consultant",
    passwordHash: await hashPassword(input.password),
    active: true,
  });
  return created;
}

export async function setUserPassword(id: string, password: string) {
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  const user = await User.findById(id);
  if (!user) throw new Error("User not found");
  user.passwordHash = await hashPassword(password);
  await user.save();
  return user;
}

export async function setUserActive(id: string, active: boolean, actorId: string) {
  const user = await User.findById(id);
  if (!user) throw new Error("User not found");
  if (!active && String(user._id) === actorId) throw new Error("You cannot disable your own login");
  if (!active && user.role === "admin") {
    const admins = await User.countDocuments({ role: "admin", active: true, _id: { $ne: user._id } });
    if (!admins) throw new Error("Keep at least one active admin");
  }
  user.active = active;
  await user.save();
  return user;
}
