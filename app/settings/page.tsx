import * as React from "react";
import { AccountSettingsSection } from "@/components/dashboard/AccountSettingsSection";

export const metadata = {
  title: "Account Settings — REEC Academy",
  description: "Manage your account, cloud sync status, and learning progress.",
};

export default function SettingsPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-32 lg:pb-8 max-w-5xl mx-auto w-full">
      <AccountSettingsSection />
    </div>
  );
}
