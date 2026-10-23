import { sharedFacts } from "@/lib/content";

/**
 * My public profiles as list items. rel="me" says each account and this
 * site belong to the same person; the Person's sameAs lists the same URLs.
 */
export default function ProfileLinks() {
  return sharedFacts.profiles.map((profile) => (
    <li key={profile.url}>
      <a href={profile.url} rel="me">
        {profile.name}
      </a>
    </li>
  ));
}
