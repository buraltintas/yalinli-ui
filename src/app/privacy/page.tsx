import { redirect } from "next/navigation";

export default async function PrivacyPage() {
  redirect("/about#privacy");
}
