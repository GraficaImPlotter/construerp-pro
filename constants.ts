export const APP_NAME = "ConstruERP Pro";
export const API_VERSION = "v1";

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  authorized: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  canceled: "bg-orange-100 text-orange-800",
};

export const WORK_STATUS_COLORS: Record<string, string> = {
  'Planning': "bg-indigo-100 text-indigo-800",
  'In Progress': "bg-blue-100 text-blue-800",
  'Completed': "bg-green-100 text-green-800",
  'Paused': "bg-yellow-100 text-yellow-800",
};