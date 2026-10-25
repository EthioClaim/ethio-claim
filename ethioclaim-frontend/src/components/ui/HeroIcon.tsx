import React from "react";
import {
  HomeIcon,
  DocumentTextIcon,
  PlusIcon,
  ShieldCheckIcon,
  UsersIcon,
  FolderIcon,
  ClipboardIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

type HeroIconProps = {
  name: string;
  className?: string;
};

export const HeroIcon: React.FC<HeroIconProps> = ({ name, className }) => {
  const icons: Record<string, React.ReactNode> = {
    home: <HomeIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // Dashboard
    "clipboard-list": <ClipboardIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // Claims Management
    "document-text": <DocumentTextIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // Evidence Inspection
    plus: <PlusIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // New Claim Intake
    "shield-check": <ShieldCheckIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // Policy Verification
    users: <UsersIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // Staff & Users
    folder: <FolderIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // Policy Registry Admin
    clipboard: <ClipboardIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // Audit Logs
    cog: <CogIcon className={className ?? "w-4 h-4 flex-shrink-0"} />, // Analysis Operations
  };
  return <>{icons[name] ?? null}</>;
};
