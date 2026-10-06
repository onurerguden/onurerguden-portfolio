import { permanentRedirect } from "next/navigation";
/** next.config.ts answers / first; this covers a server without it. */
export default function Entry() {
  permanentRedirect("/en");
}
