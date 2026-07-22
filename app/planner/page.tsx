import type { Metadata } from "next";
import { PlannerShell } from "@/components/planner-shell";

export const metadata: Metadata = { title: "Planning workspace" };
export default function PlannerPage() { return <PlannerShell />; }
