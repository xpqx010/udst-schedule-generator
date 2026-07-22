import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = { title: "Request a reset link" };
export default function ForgotPasswordPage() { return <ForgotPasswordForm />; }
