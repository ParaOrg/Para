import { accountClient } from './account-client';
import { fetchStoredProfile } from './profile';

/** The name and number an account stored, the number as the database keeps it: +639XXXXXXXXX. */
export interface Profile {
  name: string;
  phone: string;
}

/** The signed-in account's own name and number. Needs signal: Profile has nothing to show without it. */
export async function fetchProfile(): Promise<Profile> {
  const stored = await fetchStoredProfile(await accountClient());
  return { name: stored.name ?? '', phone: stored.phone ?? '' };
}
