import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { generateContentWithFallback } from "./ai.js";

export interface ContactDetails {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  otherContact?: string;
}

export interface RawExtractedDocument {
  text: string;
  detectedType: "pdf" | "docx" | "txt" | "unknown";
  cleanedText: string;
  contactDetails: ContactDetails;
  identifiedSections: {
    sectionName: string;
    canonicalSection: string;
    rawContent: string;
  }[];
}

/**
 * Step 1: Clean & Normalize raw extracted text
 * - Strips unprintable control characters and PDF glyph artifacts
 * - Eliminates excessive whitespace while preserving indentation & structure
 * - Removes repeated headers, footers, and page numbers
 * - De-duplicates redundant lines from multi-column PDF streams
 */
export function cleanAndNormalizeText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  // 1. Normalize line endings to \n
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Remove null bytes and non-printable control chars (except \n, \t)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, "");

  // 3. Remove common running headers, footers & page numbering artifacts
  // e.g. "Page 1 of 3", "Page 2", "- 1 -", "Resume - John Doe"
  text = text.replace(/^[ \t]*(?:page\s*\d+\s*(?:of|\/)\s*\d+|page\s*\d+|-+\s*\d+\s*-+)[ \t]*$/gim, "");

  // 4. Split into lines to clean line-by-line
  const lines = text.split("\n");
  const cleanedLines: string[] = [];
  let previousLine = "";

  for (let i = 0; i < lines.length; i++) {
    // Strip trailing whitespace
    const line = lines[i].trimEnd();

    // Collapse consecutive duplicate lines often created by PDF column wrapping
    if (line.trim().length > 0 && line.trim() === previousLine.trim()) {
      continue;
    }

    cleanedLines.push(line);
    if (line.trim().length > 0) {
      previousLine = line;
    }
  }

  // 5. Collapse 3+ consecutive empty lines down to at most 2 empty lines
  let result = cleanedLines.join("\n").replace(/\n{4,}/g, "\n\n\n");

  return result.trim();
}

/**
 * Step 2: Extract contact details using strict regex
 * Never invents facts; extracts only patterns explicitly present in the text.
 */
export function extractContactDetails(text: string): ContactDetails {
  const details: ContactDetails = {};

  // Email regex RFC 5322 subset
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    details.email = emailMatch[0].trim();
  }

  // Phone regex (international & US formats)
  const phoneRegex = /(?:(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{9,12})\b/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    details.phone = phoneMatch[0].trim();
  }

  // LinkedIn regex
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|profile)\/([A-Za-z0-9_-]+)\/?/i;
  const linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch) {
    details.linkedin = linkedinMatch[0].trim();
  }

  // GitHub regex
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_-]+)\/?/i;
  const githubMatch = text.match(githubRegex);
  if (githubMatch) {
    details.github = githubMatch[0].trim();
  }

  // Portfolio / Website regex
  const portfolioRegex = /(?:https?:\/\/)(?!linkedin|github)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s)]*)?/i;
  const portfolioMatch = text.match(portfolioRegex);
  if (portfolioMatch) {
    details.portfolio = portfolioMatch[0].trim();
  }

  // Name heuristic from top lines (first non-empty line that doesn't look like contact/header)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    const isContactOrLabel =
      line.includes("@") ||
      line.match(phoneRegex) ||
      line.toLowerCase().includes("resume") ||
      line.toLowerCase().includes("curriculum vitae") ||
      line.toLowerCase().includes("http") ||
      line.length > 50 ||
      line.length < 2;

    if (!isContactOrLabel && /^[A-Za-z\s.'-]+$/.test(line)) {
      details.fullName = line;
      break;
    }
  }

  return details;
}

/**
 * Step 3: Canonical Section Detection
 * Matches exact and equivalent resume section headings.
 */
export const CANONICAL_SECTION_PATTERNS: {
  canonical: string;
  regex: RegExp;
}[] = [
  {
    canonical: "Profile",
    regex: /^(?:profile|professional\s+profile|professional\s+summary|executive\s+summary|summary|about\s+me|career\s+objective|objective|personal\s+statement|career\s+summary)$/i,
  },
  {
    canonical: "Career Highlights",
    regex: /^(?:career\s+highlights|key\s+highlights|summary\s+of\s+qualifications|key\s+qualifications)$/i,
  },
  {
    canonical: "Education",
    regex: /^(?:education|academic\s+background|academic\s+qualifications|educational\s+qualifications|academics|education\s*(?:&|and)\s*training)$/i,
  },
  {
    canonical: "Certificates",
    regex: /^(?:certificates|certifications|licenses(?:\s*(?:&|and)\s*certifications)?|professional\s+certifications|credentials|accreditations)$/i,
  },
  {
    canonical: "Soft Skills",
    regex: /^(?:soft\s+skills|interpersonal\s+skills|leadership\s*(?:&|and)\s*soft\s+skills|core\s+strengths|behavioral\s+competencies)$/i,
  },
  {
    canonical: "Skills",
    regex: /^(?:skills|technical\s+skills|technical\s+expertise|core\s+competencies|key\s+skills|technologies|areas\s+of\s+expertise|technical\s+proficiencies|tools\s*(?:&|and)\s*technologies|skills\s*(?:&|and)\s*expertise)$/i,
  },
  {
    canonical: "Projects",
    regex: /^(?:projects|technical\s+projects|key\s+projects|academic\s+projects|personal\s+projects|selected\s+projects|selected\s+contributions|engineering\s+projects)$/i,
  },
  {
    canonical: "Internships",
    regex: /^(?:internships|internship\s+experience|industrial\s+training|summer\s+internships|clinical\s+rotations)$/i,
  },
  {
    canonical: "Research Experience",
    regex: /^(?:research\s+experience|academic\s+research|research\s+projects|laboratory\s+experience)$/i,
  },
  {
    canonical: "Experience",
    regex: /^(?:experience|work\s+experience|professional\s+experience|employment\s+history|work\s+history|industry\s+experience|relevant\s+experience|career\s+history)$/i,
  },
  {
    canonical: "Publications",
    regex: /^(?:publications|research\s+publications|papers|research\s+papers|patents(?:\s*(?:&|and)\s*publications)?|selected\s+publications)$/i,
  },
  {
    canonical: "Courses",
    regex: /^(?:courses|relevant\s+coursework|coursework|professional\s+development|continuing\s+education|training\s*(?:&|and)\s*workshops)$/i,
  },
  {
    canonical: "Volunteer Experience",
    regex: /^(?:volunteer\s+experience|volunteering|community\s+service|community\s+involvement|social\s+impact|pro\s+bono)$/i,
  },
  {
    canonical: "Leadership Experience",
    regex: /^(?:leadership\s+experience|leadership|positions\s+of\s+responsibility|extracurricular\s+activities|activities(?:\s*(?:&|and)\s*leadership)?|campus\s+involvement|organizations)$/i,
  },
  {
    canonical: "Languages",
    regex: /^(?:languages|spoken\s+languages|language\s+proficiency|foreign\s+languages)$/i,
  },
  {
    canonical: "Academic Achievements",
    regex: /^(?:academic\s+achievements|achievements|key\s+achievements|honors(?:\s*(?:&|and)\s*awards)?|awards(?:\s*(?:&|and)\s*honors)?|awards|distinctions|accomplishments)$/i,
  },
];

/**
 * Parses raw text into discrete identified sections using regex boundary detection
 * AND heuristic detection for custom user-defined resume headings.
 */
export function detectSectionsWithRegex(text: string): {
  sectionName: string;
  canonicalSection: string;
  rawContent: string;
}[] {
  const lines = text.split("\n");
  const sections: {
    sectionName: string;
    canonicalSection: string;
    rawContent: string;
  }[] = [];

  let currentHeading = "Header + Contact Details";
  let currentCanonical = "Header + Contact Details";
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.length > 0 && trimmed.length < 55) {
      // Strip common markdown markers or trailing colons
      const cleanHeaderCandidate = trimmed
        .replace(/^#+\s*/, "")
        .replace(/^[-═=]+\s*/, "")
        .replace(/\s*[-═=:]+$/, "")
        .trim();

      let matchedCanonical: string | null = null;
      for (const rule of CANONICAL_SECTION_PATTERNS) {
        if (rule.regex.test(cleanHeaderCandidate)) {
          matchedCanonical = rule.canonical;
          break;
        }
      }

      // Also support custom dynamic headings if explicitly formatted as Markdown headings (## Heading)
      // or standalone ALL-CAPS section headers (e.g., "OPEN SOURCE CONTRIBUTIONS", "SPEAKING ENGAGEMENTS")
      if (!matchedCanonical && i > 2) {
        const isMarkdownHeading = /^#{1,3}\s+[A-Za-z][A-Za-z\s&/-]{2,45}$/.test(trimmed);
        const isStandaloneAllCaps =
          cleanHeaderCandidate.length >= 4 &&
          cleanHeaderCandidate.length <= 42 &&
          /^[A-Z][A-Z\s&/-]+$/.test(cleanHeaderCandidate) &&
          !cleanHeaderCandidate.includes("@") &&
          !/\b(?:PRESENT|CURRENT|GPA|LLC|INC|CORP|UNIVERSITY|COLLEGE|B\.S|M\.S|B\.TECH|PH\.D)\b/.test(cleanHeaderCandidate);

        if (isMarkdownHeading || isStandaloneAllCaps) {
          matchedCanonical = `Dynamic:${cleanHeaderCandidate}`;
        }
      }

      if (matchedCanonical) {
        if (currentLines.length > 0) {
          sections.push({
            sectionName: cleanHeaderCandidate || currentHeading,
            canonicalSection: currentCanonical,
            rawContent: currentLines.join("\n").trim(),
          });
        }

        currentHeading = cleanHeaderCandidate || trimmed;
        currentCanonical = matchedCanonical;
        currentLines = [];
        continue;
      }
    }

    currentLines.push(rawLine);
  }

  // Push final section
  if (currentLines.length > 0) {
    sections.push({
      sectionName: currentHeading,
      canonicalSection: currentCanonical,
      rawContent: currentLines.join("\n").trim(),
    });
  }

  return sections;
}

/**
 * Step 4: High-Accuracy Multi-Format Extractor
 * Extracts text from PDF, DOCX, or TXT buffers with robust multi-tiered fallbacks.
 */
export async function extractDocumentText(
  buffer: Buffer,
  fileName?: string,
  mimeType?: string
): Promise<{ text: string; detectedType: "pdf" | "docx" | "txt" | "unknown" }> {
  const lowerName = (fileName || "").toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  // Detect type
  let detectedType: "pdf" | "docx" | "txt" | "unknown" = "unknown";
  if (lowerName.endsWith(".pdf") || lowerMime.includes("pdf")) {
    detectedType = "pdf";
  } else if (
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    lowerMime.includes("word") ||
    lowerMime.includes("officedocument")
  ) {
    detectedType = "docx";
  } else if (
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerMime.includes("text")
  ) {
    detectedType = "txt";
  }

  // 1. Plain Text / Markdown
  if (detectedType === "txt") {
    const rawText = buffer.toString("utf-8");
    return {
      text: cleanAndNormalizeText(rawText),
      detectedType: "txt",
    };
  }

  // 2. DOCX Extraction via Mammoth
  if (detectedType === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value || "";
      if (rawText.trim().length > 30) {
        return {
          text: cleanAndNormalizeText(rawText),
          detectedType: "docx",
        };
      }
    } catch (docxErr) {
      console.warn("[DocumentParser] Mammoth DOCX parsing fallback to multimodal:", docxErr);
    }
  }

  // 3. PDF Extraction via pdf-parse
  if (detectedType === "pdf") {
    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      await parser.destroy();
      const rawText = textResult.text || "";
      if (rawText.trim().length > 30) {
        return {
          text: cleanAndNormalizeText(rawText),
          detectedType: "pdf",
        };
      }
    } catch (pdfErr) {
      console.warn("[DocumentParser] pdf-parse extraction fallback to multimodal:", pdfErr);
    }
  }

  // 4. Multimodal Fallback via Gemini (for scanned/complex PDFs or binary DOCX)
  try {
    const base64Data = buffer.toString("base64");
    const effectiveMime =
      detectedType === "pdf" ? "application/pdf" : "application/octet-stream";

    const prompt =
      "You are an expert document text extraction engine. " +
      "Extract ALL textual content from this resume document verbatim and accurately. " +
      "Preserve exact wording, bullet points, dates, skills, metrics, and structural section order. " +
      "Do NOT invent, summarize, or alter any information. " +
      "Return ONLY the extracted text with no introductory or meta-commentary.";

    const parts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: effectiveMime,
        },
      },
      { text: prompt },
    ];

    const extracted = await generateContentWithFallback(parts, {
      temperature: 0.0,
      responseMimeType: "text/plain",
    });

    return {
      text: cleanAndNormalizeText(extracted),
      detectedType: detectedType !== "unknown" ? detectedType : "pdf",
    };
  } catch (aiErr: any) {
    console.error("[DocumentParser] Multimodal extraction failed:", aiErr);
    // Last resort UTF-8 string extraction
    const rawFallback = buffer.toString("utf-8");
    const cleaned = cleanAndNormalizeText(rawFallback);
    if (cleaned.length > 20) {
      return { text: cleaned, detectedType };
    }
    throw new Error("Could not extract readable text from the uploaded document.");
  }
}
