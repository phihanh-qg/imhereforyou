// Google OAuth Token Client & Workspace API Integrations
// Scopes enabled:
// - https://www.googleapis.com/auth/calendar.events
// - https://www.googleapis.com/auth/contacts.readonly

import firebaseConfig from "../../firebase-applet-config.json";

const OAUTH_CLIENT_ID = (firebaseConfig as any).oAuthClientId || "501491610830-hte65p7op4q20g32e2udardk934sej65.apps.googleusercontent.com";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/contacts.readonly",
].join(" ");

let tokenClient: any = null;
let currentAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

// Load Google Identity Services script dynamically if not present
export function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

// Check if currently has valid token
export function isGoogleAuthenticated(): boolean {
  return Boolean(currentAccessToken && Date.now() < tokenExpiresAt - 60000);
}

// Request Google OAuth Access Token
export async function getGoogleAccessToken(promptConsent: boolean = false): Promise<string> {
  await loadGsiScript();

  if (currentAccessToken && Date.now() < tokenExpiresAt - 60000 && !promptConsent) {
    return currentAccessToken;
  }

  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        return reject(new Error("Google Identity Services script chưa được tải. Vui lòng thử lại."));
      }

      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.warn("Google Token Response:", tokenResponse);
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          currentAccessToken = tokenResponse.access_token;
          const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3600;
          tokenExpiresAt = Date.now() + expiresIn * 1000;
          resolve(tokenResponse.access_token);
        },
        error_callback: (err: any) => {
          if (err?.type === "popup_closed" || err?.message?.includes("closed") || err?.message === "Popup window closed") {
            return reject(new Error("Cửa sổ đăng nhập đã được đóng. Vui lòng bấm 'Kết nối Google Contacts' để tiếp tục."));
          }
          console.warn("Token client notice:", err?.message || err);
          reject(new Error(err?.message || "Lỗi xác thực Google"));
        },
      });

      tokenClient.requestAccessToken({ prompt: promptConsent ? "consent" : "" });
    } catch (err) {
      reject(err);
    }
  });
}

// ==========================================
// 1. GOOGLE CALENDAR API (Direct creation)
// ==========================================
export interface CalendarEventPayload {
  title: string;
  description: string;
  startTime: Date;
  durationMinutes?: number;
  recurrence?: string[]; // e.g. ["RRULE:FREQ=WEEKLY;BYDAY=SU"]
  createMeetLink?: boolean;
}

export async function createDirectCalendarEvent(
  payload: CalendarEventPayload
): Promise<{ id: string; htmlLink: string; meetLink?: string }> {
  const accessToken = await getGoogleAccessToken();

  const startIso = payload.startTime.toISOString();
  const endTime = new Date(payload.startTime.getTime() + (payload.durationMinutes || 30) * 60 * 1000);
  const endIso = endTime.toISOString();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";

  const eventBody: any = {
    summary: payload.title,
    description: payload.description,
    start: {
      dateTime: startIso,
      timeZone: timeZone,
    },
    end: {
      dateTime: endIso,
      timeZone: timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  if (payload.recurrence && payload.recurrence.length > 0) {
    eventBody.recurrence = payload.recurrence;
  }

  // Add Google Meet conference data if requested
  let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  if (payload.createMeetLink) {
    url += "?conferenceDataVersion=1";
    eventBody.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Calendar API Error:", errorData);
    throw new Error(
      errorData?.error?.message || `Lỗi tạo sự kiện Google Calendar (${response.status})`
    );
  }

  const event = await response.json();
  const meetLink =
    event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri ||
    event.hangoutLink;

  return {
    id: event.id,
    htmlLink: event.htmlLink,
    meetLink: meetLink,
  };
}

// ==========================================
// 2. GOOGLE CONTACTS / PEOPLE API
// ==========================================
export interface GoogleContact {
  resourceName: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  jobTitle?: string;
}

export async function fetchGoogleContacts(pageSize: number = 50): Promise<GoogleContact[]> {
  const accessToken = await getGoogleAccessToken();

  const fields = "names,emailAddresses,phoneNumbers,photos,organizations";
  const url = `https://people.googleapis.com/v1/people/me/connections?pageSize=${pageSize}&personFields=${fields}&sortOrder=FIRST_NAME_ASCENDING`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("People API Error:", errorData);
    throw new Error(
      errorData?.error?.message || `Lỗi tải danh bạ từ Google Contacts (${response.status})`
    );
  }

  const data = await response.json();
  const connections = data.connections || [];

  return connections.map((person: any) => {
    const name = person.names?.[0]?.displayName || "Không tên";
    const email = person.emailAddresses?.[0]?.value || "";
    const phone = person.phoneNumbers?.[0]?.value || "";
    const photo = person.photos?.[0]?.url || "";
    const job = person.organizations?.[0]?.title || "";

    return {
      resourceName: person.resourceName,
      displayName: name,
      email: email,
      phoneNumber: phone,
      photoUrl: photo,
      jobTitle: job,
    };
  });
}

// Search Google Contacts with a query
export async function searchGoogleContacts(queryText: string): Promise<GoogleContact[]> {
  if (!queryText.trim()) {
    return fetchGoogleContacts();
  }

  const accessToken = await getGoogleAccessToken();
  const fields = "names,emailAddresses,phoneNumbers,photos";
  const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(
    queryText
  )}&readMask=${fields}&pageSize=30`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    // Fallback to fetch all and filter in memory
    const all = await fetchGoogleContacts(100);
    const q = queryText.toLowerCase();
    return all.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        (c.phoneNumber && c.phoneNumber.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }

  const data = await response.json();
  const results = data.results || [];

  return results.map((r: any) => {
    const person = r.person;
    return {
      resourceName: person.resourceName,
      displayName: person.names?.[0]?.displayName || "Không tên",
      email: person.emailAddresses?.[0]?.value || "",
      phoneNumber: person.phoneNumbers?.[0]?.value || "",
      photoUrl: person.photos?.[0]?.url || "",
    };
  });
}

// ==========================================
// 3. GOOGLE MEET HELPER
// ==========================================
// Launch an instant Google Meet room or scheduled meeting
export function openGoogleMeetInstant(): string {
  const meetUrl = "https://meet.google.com/new";
  window.open(meetUrl, "_blank", "noopener,noreferrer");
  return meetUrl;
}
