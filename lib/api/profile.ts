import { Profile, Role } from "@/types";
import { request } from "./client";

export async function getProfile(): Promise<Profile> {
  return request<Profile>("/api/profile", {
    method: "GET",
  });
}

export async function setRole(role: Role): Promise<Profile> {
  return request<Profile>("/api/profile/role", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}
