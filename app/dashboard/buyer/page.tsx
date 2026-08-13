import { redirect } from "next/navigation";

/** Old URL — purchases now live at /library. */
export default function LegacyBuyerRedirect() {
  redirect("/library");
}
