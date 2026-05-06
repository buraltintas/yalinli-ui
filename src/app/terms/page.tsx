import { redirect } from "next/navigation";

export default async function TermsPage() {
  redirect("/about#terms");
}
