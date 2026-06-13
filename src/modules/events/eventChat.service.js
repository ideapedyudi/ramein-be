import env from "../../config/env.js";
import { query } from "../../db/mysql.js";
import ApiError from "../../utils/apiError.js";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];

const MONTH_ALIASES = new Map([
  ["januari", 1],
  ["january", 1],
  ["jan", 1],
  ["februari", 2],
  ["february", 2],
  ["feb", 2],
  ["maret", 3],
  ["march", 3],
  ["mar", 3],
  ["april", 4],
  ["apr", 4],
  ["mei", 5],
  ["may", 5],
  ["juni", 6],
  ["june", 6],
  ["jun", 6],
  ["juli", 7],
  ["july", 7],
  ["jul", 7],
  ["agustus", 8],
  ["august", 8],
  ["agu", 8],
  ["ags", 8],
  ["aug", 8],
  ["september", 9],
  ["sep", 9],
  ["sept", 9],
  ["oktober", 10],
  ["october", 10],
  ["okt", 10],
  ["oct", 10],
  ["november", 11],
  ["nov", 11],
  ["desember", 12],
  ["december", 12],
  ["des", 12],
  ["dec", 12]
]);

const REJECTION_REPLY = "Maaf, saya hanya bisa membantu sapaan singkat, menjelaskan kemampuan chat, mencari event berdasarkan bulan, dan menjelaskan detail event berdasarkan nama event.";
const EVENT_SEARCH_STOP_WORDS = new Set([
  "ada",
  "apa",
  "aja",
  "aj",
  "sih",
  "dong",
  "tentang",
  "mengenai",
  "detail",
  "deskripsi",
  "kapan",
  "harga",
  "harganya",
  "berapa",
  "info",
  "informasi",
  "jelasin",
  "jelaskan",
  "ceritain",
  "cerita",
  "event",
  "acara",
  "konser",
  "tolong",
  "dong",
  "yang",
  "di",
  "bulan",
  "ini",
  "tahun",
  "kamu",
  "bisa",
  "bantu",
  "apa",
  "aja",
  "the",
  "a",
  "an"
]);

const UNSUPPORTED_DIRECT_QUESTION_WORDS = new Set([
  "siapa",
  "kenapa",
  "mengapa",
  "bagaimana",
  "gimana",
  "dimana",
  "presiden",
  "cuaca",
  "berita",
  "politik"
]);

function sanitizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeVisitorName(visitorName) {
  const sanitized = sanitizeText(visitorName);
  if (!sanitized) return null;

  const words = sanitized
    .split(" ")
    .filter(Boolean)
    .slice(0, 3);

  if (words.length === 0) return null;
  return titleCase(words.join(" "));
}

function extractVisitorName(message) {
  const normalized = sanitizeText(message);
  if (!normalized) return null;

  const words = normalized.split(" ").filter(Boolean);
  const stopWords = new Set([
    "dan",
    "mau",
    "ingin",
    "cari",
    "carikan",
    "ada",
    "apa",
    "event",
    "acara",
    "konser",
    "bulan",
    "ini",
    "tolong"
  ]);

  for (let index = 0; index < words.length; index += 1) {
    const currentWord = words[index];
    const nextWord = words[index + 1];
    const isNamePrefix = currentWord === "saya" || currentWord === "aku";
    const isFullNamePrefix = currentWord === "nama" && nextWord === "saya";

    if (!isNamePrefix && !isFullNamePrefix) continue;

    const nameStartIndex = isFullNamePrefix ? index + 2 : index + 1;
    const nameParts = [];

    for (let cursor = nameStartIndex; cursor < words.length && nameParts.length < 3; cursor += 1) {
      const word = words[cursor];
      if (stopWords.has(word) || MONTH_ALIASES.has(word)) break;
      if (!/^[a-z]+$/.test(word)) break;
      nameParts.push(word);
    }

    if (nameParts.length > 0) {
      return titleCase(nameParts.join(" "));
    }
  }

  return null;
}

function formatMonthLabel(month, year) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function formatDateTimeForDisplay(value) {
  if (!value) return "-";

  const rawValue = String(value).trim();
  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::\d{2})?)?$/);
  if (!match) return rawValue;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] || "00";
  const minute = match[5] || "00";

  return `${day} ${MONTH_NAMES[month - 1]} ${year} ${hour}.${minute} WIB`;
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatTicketSummary(ticketTypes) {
  if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
    return "Harga tiket belum tersedia.";
  }

  const paidTickets = ticketTypes.filter((ticket) => Number(ticket.price) > 0);
  if (paidTickets.length === 0) {
    return "Event ini gratis.";
  }

  return ticketTypes
    .map((ticket, index) => `${index + 1}. ${ticket.name}: ${Number(ticket.price) > 0 ? formatRupiah(ticket.price) : "Gratis"}`)
    .join("\n");
}

function isGreetingOnly(message) {
  const normalized = sanitizeText(message);
  if (!normalized) return false;

  const hasGreeting = /\b(halo|hallo|hai|hi|hello)\b/.test(normalized)
    || /\bselamat (pagi|siang|sore|malam)\b/.test(normalized);

  if (!hasGreeting) return false;

  const remainder = normalized
    .replace(/\b(halo|hallo|hai|hi|hello)\b/g, " ")
    .replace(/\bselamat (pagi|siang|sore|malam)\b/g, " ")
    .replace(/\b(nama saya|saya|aku)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!remainder) return true;

  const remainderWords = remainder.split(" ").filter(Boolean);
  return remainderWords.length <= 3 && remainderWords.every((word) => /^[a-z]+$/.test(word));
}

function detectMonthFromMessage(normalizedMessage) {
  if (/\bbulan ini\b/.test(normalizedMessage)) {
    return new Date().getUTCMonth() + 1;
  }

  for (const [alias, monthNumber] of MONTH_ALIASES.entries()) {
    if (new RegExp(`\\b${alias}\\b`).test(normalizedMessage)) {
      return monthNumber;
    }
  }

  return null;
}

function detectIntent(message) {
  const normalized = sanitizeText(message);
  const isIdentityQuestion = /\b(kamu|anda|namamu|nama kamu|nama anda)\b/.test(normalized)
    && /\b(siapa|apa)\b/.test(normalized);

  if (isIdentityQuestion) {
    return { intent: "identity" };
  }

  const isCapabilityQuestion = /\b(kamu|anda)\b/.test(normalized)
    && /\b(bisa|bantu)\b/.test(normalized)
    && /\bapa\b/.test(normalized);

  if (isCapabilityQuestion) {
    return { intent: "capabilities" };
  }

  const hasEventKeyword = /\b(event|acara|konser)\b/.test(normalized);

  if (hasEventKeyword) {
    const month = detectMonthFromMessage(normalized);
    if (month) {
      const yearMatch = normalized.match(/\b(20\d{2})\b/);
      return {
        intent: "month_event_list",
        month,
        year: yearMatch ? Number(yearMatch[1]) : new Date().getUTCFullYear()
      };
    }
  }

  if (isGreetingOnly(message)) {
    return { intent: "greeting" };
  }

  return { intent: "rejected" };
}

function handleEventQueryError(error) {
  if (error instanceof ApiError) {
    throw error;
  }

  if (["ECONNREFUSED", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST"].includes(error?.code)) {
    throw new ApiError(503, "Event database is unavailable");
  }

  throw error;
}

async function listPublicEventsByMonth(month, year) {
  let rows;

  try {
    rows = await query(
      `SELECT
        e.id,
        e.title,
        e.start_datetime,
        e.end_datetime,
        c.name AS category_name,
        ci.name AS city_name
      FROM events e
      JOIN categories c ON c.id = e.category_id
      JOIN cities ci ON ci.id = e.city_id
      WHERE e.visibility = 'public'
        AND e.status = 'published'
        AND e.is_published = 1
        AND MONTH(e.start_datetime) = ?
        AND YEAR(e.start_datetime) = ?
      ORDER BY e.start_datetime ASC, e.title ASC`,
      [month, year]
    );
  } catch (error) {
    handleEventQueryError(error);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    category_name: row.category_name,
    city_name: row.city_name
  }));
}

function extractEventSearchTerms(message) {
  return sanitizeText(message)
    .split(" ")
    .filter(Boolean)
    .filter((word) => !EVENT_SEARCH_STOP_WORDS.has(word))
    .filter((word) => !MONTH_ALIASES.has(word))
    .filter((word) => !/^20\d{2}$/.test(word))
    .slice(0, 8);
}

function shouldAttemptEventLookup(message) {
  const normalized = sanitizeText(message);
  const hasEventKeyword = /\b(event|acara|konser)\b/.test(normalized);
  const hasDetailKeyword = /\b(info|informasi|detail|deskripsi|kapan|harga|harganya|jelasin|jelaskan|tentang)\b/.test(normalized);
  if (hasEventKeyword || hasDetailKeyword) return true;

  const words = normalized.split(" ").filter(Boolean);
  const terms = extractEventSearchTerms(message);
  const hasUnsupportedQuestionWord = words.some((word) => UNSUPPORTED_DIRECT_QUESTION_WORDS.has(word));

  return !hasUnsupportedQuestionWord && terms.length >= 2 && terms.length <= 6;
}

function scoreEventMatch(message, row, terms) {
  const normalizedMessage = sanitizeText(message);
  const normalizedTitle = sanitizeText(row.title);
  const normalizedDescription = sanitizeText(row.description);

  let score = 0;
  let titleMatchCount = 0;

  if (normalizedTitle === normalizedMessage) score += 100;
  if (normalizedMessage.includes(normalizedTitle) && normalizedTitle.length >= 4) score += 60;
  if (normalizedTitle.includes(normalizedMessage) && normalizedMessage.length >= 4) score += 40;

  for (const term of terms) {
    if (normalizedTitle.includes(term)) {
      titleMatchCount += 1;
      score += 15;
      continue;
    }

    if (normalizedDescription.includes(term)) {
      score += 4;
    }
  }

  return {
    score,
    titleMatchCount
  };
}

async function getTicketTypesByEventId(eventId) {
  let ticketRows;

  try {
    ticketRows = await query(
      `SELECT id, name, price, quota, sold, sale_start_at, sale_end_at
      FROM event_ticket_types
      WHERE event_id = ?
      ORDER BY price ASC, created_at ASC, id ASC`,
      [eventId]
    );
  } catch (error) {
    handleEventQueryError(error);
  }

  return ticketRows.map((ticket) => ({
    id: ticket.id,
    name: ticket.name,
    price: Number(ticket.price),
    quota: Number(ticket.quota),
    sold: Number(ticket.sold),
    sale_start_at: ticket.sale_start_at,
    sale_end_at: ticket.sale_end_at
  }));
}

async function findPublicEventByMessage(message) {
  const terms = extractEventSearchTerms(message);
  if (terms.length === 0) {
    return null;
  }

  const clauses = terms.map(() => "(LOWER(e.title) LIKE ? OR LOWER(e.description) LIKE ?)");
  const values = terms.flatMap((term) => [`%${term}%`, `%${term}%`]);

  let rows;

  try {
    rows = await query(
      `SELECT
        e.id,
        e.title,
        e.description,
        e.start_datetime,
        e.end_datetime,
        e.address_detail,
        e.event_type,
        e.payment_type,
        e.label_online,
        e.url_online,
        c.name AS category_name,
        ci.name AS city_name,
        o.name AS organizer_name
      FROM events e
      JOIN categories c ON c.id = e.category_id
      JOIN cities ci ON ci.id = e.city_id
      JOIN organizers o ON o.id = e.organizer_id
      WHERE e.visibility = 'public'
        AND e.status = 'published'
        AND e.is_published = 1
        AND (${clauses.join(" OR ")})
      ORDER BY e.start_datetime ASC, e.title ASC
      LIMIT 20`,
      values
    );
  } catch (error) {
    handleEventQueryError(error);
  }

  if (rows.length === 0) {
    return null;
  }

  const ranked = rows
    .map((row) => ({ row, ...scoreEventMatch(message, row, terms) }))
    .filter((item) => item.titleMatchCount > 0 || item.score >= 60)
    .sort((left, right) => right.score - left.score);

  const bestMatch = ranked[0];
  if (!bestMatch || bestMatch.score < 15) {
    return null;
  }

  const ticketTypes = await getTicketTypesByEventId(bestMatch.row.id);
  return {
    id: bestMatch.row.id,
    title: bestMatch.row.title,
    description: bestMatch.row.description,
    start_datetime: bestMatch.row.start_datetime,
    end_datetime: bestMatch.row.end_datetime,
    address_detail: bestMatch.row.address_detail,
    event_type: bestMatch.row.event_type,
    payment_type: bestMatch.row.payment_type,
    label_online: bestMatch.row.label_online,
    url_online: bestMatch.row.url_online,
    category_name: bestMatch.row.category_name,
    city_name: bestMatch.row.city_name,
    organizer_name: bestMatch.row.organizer_name,
    ticket_types: ticketTypes
  };
}

function stripMarkdownFence(value) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function buildFallbackReply({ intent, visitorName, monthLabel, events }) {
  if (intent === "identity") {
    return "Saya Mimin, asisten chat Ramein yang bisa membantu Anda menemukan event, melihat daftar event berdasarkan bulan, dan menjelaskan detail event berdasarkan nama event.";
  }

  if (intent === "capabilities") {
    return [
      "Saya bisa membantu 3 hal:",
      "1. Menjawab sapaan singkat.",
      "2. Menampilkan daftar event berdasarkan bulan, misalnya 'ada event apa aja di bulan Juni ini?'.",
      "3. Menjelaskan detail event berdasarkan nama event, seperti deskripsi, jadwal, lokasi, dan harga tiket."
    ].join("\n");
  }

  if (intent === "greeting") {
    const greetingName = visitorName ? ` ${visitorName}` : "";
    return `Halo${greetingName}, saya Mimin dan saya bisa membantu Anda menemukan event.`;
  }

  if (intent === "event_detail") {
    if (!events[0]) {
      return "Maaf, saya belum menemukan event yang Anda maksud. Coba kirim nama event yang lebih spesifik.";
    }

    const event = events[0];
    const onlineInfo = event.label_online ? `\nAkses online: ${event.label_online}${event.url_online ? ` (${event.url_online})` : ""}` : "";

    return [
      `Detail event ${event.title}:`,
      `Deskripsi: ${event.description}`,
      `Kategori: ${event.category_name}`,
      `Penyelenggara: ${event.organizer_name}`,
      `Lokasi: ${event.city_name}, ${event.address_detail}`,
      `Mulai: ${formatDateTimeForDisplay(event.start_datetime)}`,
      `Selesai: ${formatDateTimeForDisplay(event.end_datetime)}`,
      `Harga tiket:`,
      formatTicketSummary(event.ticket_types) + onlineInfo
    ].join("\n");
  }

  if (events.length === 0) {
    return `Belum ada event publik yang tersedia pada ${monthLabel}.`;
  }

  const eventLines = events.map((event, index) => `${index + 1}. ${event.title}`).join("\n");
  return `Event pada ${monthLabel}:\n${eventLines}`;
}

async function requestOpenRouterReply(payload) {
  if (!env.openRouterApiKey || typeof fetch !== "function") {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.appBaseUrl,
        "X-Title": env.openRouterSiteName
      },
      body: JSON.stringify({
        model: env.openRouterModel,
        temperature: 0.2,
        max_tokens: 250,
        response_format: {
          type: "json_object"
        },
        messages: [
          {
            role: "system",
            content: [
              "Anda adalah Mimin, asisten pencarian event untuk aplikasi Ramein.",
              "Jawab hanya dalam bahasa Indonesia.",
              "Anda hanya boleh memakai data yang diberikan.",
              "Jangan mengarang nama event.",
              "Balas wajib dalam JSON valid dengan bentuk: {\"reply\":\"...\"}.",
              "Untuk greeting, kenalkan diri sebagai Mimin yang membantu menemukan event.",
              "Jika user bertanya kemampuan Anda, jelaskan hanya 3 kemampuan yang tersedia: sapaan, daftar event per bulan, dan detail event berdasarkan nama.",
              "Untuk daftar event bulanan, tampilkan nama-nama event dari data yang diberikan.",
              "Untuk detail event, jelaskan deskripsi, waktu, lokasi, dan harga tiket hanya dari data yang diberikan.",
              "Jika daftar event kosong, katakan belum ada event publik pada bulan tersebut."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify(payload)
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(stripMarkdownFence(content));
    if (!parsed?.reply || typeof parsed.reply !== "string") {
      return null;
    }

    return {
      provider: "openrouter",
      model: result.model || env.openRouterModel,
      reply: parsed.reply.trim()
    };
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buildAssistantReply({ intent, visitorName, monthLabel, events }) {
  if (intent === "identity" || intent === "capabilities") {
    return {
      provider: "internal",
      model: null,
      reply: buildFallbackReply({ intent, visitorName, monthLabel, events })
    };
  }

  const openRouterReply = await requestOpenRouterReply({
    intent,
    visitorName,
    monthLabel,
    eventNames: events.map((event) => event.title),
    eventDetail: events[0]
  });

  if (openRouterReply) {
    return openRouterReply;
  }

  return {
    provider: "internal",
    model: null,
    reply: buildFallbackReply({ intent, visitorName, monthLabel, events })
  };
}

async function chatEventAssistant(payload = {}) {
  const message = String(payload.message || "").trim();
  if (!message) {
    throw new ApiError(400, "Message is required");
  }

  const visitorName = normalizeVisitorName(payload.visitorName) || extractVisitorName(message);
  const detectedIntent = detectIntent(message);

  if (detectedIntent.intent === "rejected") {
    const matchedEvent = shouldAttemptEventLookup(message)
      ? await findPublicEventByMessage(message)
      : null;

    if (matchedEvent) {
      const reply = await buildAssistantReply({
        intent: "event_detail",
        visitorName,
        monthLabel: null,
        events: [matchedEvent]
      });

      return {
        accepted: true,
        intent: "event_detail",
        reply: reply.reply,
        provider: reply.provider,
        model: reply.model,
        events: [matchedEvent]
      };
    }

    return {
      accepted: false,
      intent: "rejected",
      reply: REJECTION_REPLY,
      provider: "internal",
      model: null,
      events: []
    };
  }

  if (detectedIntent.intent === "greeting") {
    const reply = await buildAssistantReply({
      intent: "greeting",
      visitorName,
      monthLabel: null,
      events: []
    });

    return {
      accepted: true,
      intent: "greeting",
      reply: reply.reply,
      provider: reply.provider,
      model: reply.model,
      events: []
    };
  }

  if (detectedIntent.intent === "identity") {
    const reply = await buildAssistantReply({
      intent: "identity",
      visitorName,
      monthLabel: null,
      events: []
    });

    return {
      accepted: true,
      intent: "identity",
      reply: reply.reply,
      provider: reply.provider,
      model: reply.model,
      events: []
    };
  }

  if (detectedIntent.intent === "capabilities") {
    const reply = await buildAssistantReply({
      intent: "capabilities",
      visitorName,
      monthLabel: null,
      events: []
    });

    return {
      accepted: true,
      intent: "capabilities",
      reply: reply.reply,
      provider: reply.provider,
      model: reply.model,
      events: []
    };
  }

  const { month, year } = detectedIntent;
  const monthLabel = formatMonthLabel(month, year);
  const events = await listPublicEventsByMonth(month, year);
  const reply = await buildAssistantReply({
    intent: "month_event_list",
    visitorName,
    monthLabel,
    events
  });

  return {
    accepted: true,
    intent: "month_event_list",
    reply: reply.reply,
    provider: reply.provider,
    model: reply.model,
    month: {
      number: month,
      name: MONTH_NAMES[month - 1],
      year
    },
    events
  };
}

export default {
  chatEventAssistant
};
