import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { jsPDF } from "jspdf";
import { GeneratedResume, ResumeTemplateId } from "../types.js";

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "Tailored_Resume"
  );
}

interface PreparedPhotoAsset {
  dataUrl: string;
  uint8Array: Uint8Array;
}

/**
 * Renders any candidate photo (data URL or image URL) onto a square high-DPI canvas
 * with center-crop (object-fit: cover), rounded corners or circle mask, and a template border.
 * Returns both a PNG dataURL (for jsPDF) and Uint8Array (for DOCX ImageRun).
 */
async function prepareStyledPhotoAsset(
  photoUrl?: string,
  shape: "rounded" | "circle" | "square" = "rounded",
  borderColorHex: string = "#4f46e5"
): Promise<PreparedPhotoAsset | null> {
  if (!photoUrl || typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 240;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        const radius = shape === "circle" ? size / 2 : shape === "rounded" ? 36 : 12;

        const drawRoundedPath = (r: number, inset: number = 0) => {
          const x = inset;
          const y = inset;
          const w = size - inset * 2;
          const h = size - inset * 2;
          const rad = Math.max(0, r - inset);
          ctx.beginPath();
          if (shape === "circle") {
            ctx.arc(size / 2, size / 2, w / 2, 0, Math.PI * 2);
          } else {
            ctx.moveTo(x + rad, y);
            ctx.lineTo(x + w - rad, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
            ctx.lineTo(x + w, y + h - rad);
            ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
            ctx.lineTo(x + rad, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
            ctx.lineTo(x, y + rad);
            ctx.quadraticCurveTo(x, y, x + rad, y);
          }
          ctx.closePath();
        };

        ctx.save();
        drawRoundedPath(radius, 2);
        ctx.clip();

        // White background fallback for transparent PNGs
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);

        // Center-crop image (object-fit: cover)
        const imgW = img.naturalWidth || img.width || size;
        const imgH = img.naturalHeight || img.height || size;
        const scale = Math.max(size / imgW, size / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const offsetX = (size - drawW) / 2;
        const offsetY = (size - drawH) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        ctx.restore();

        // Draw border
        ctx.save();
        drawRoundedPath(radius, 4);
        ctx.lineWidth = 8;
        ctx.strokeStyle = borderColorHex;
        ctx.stroke();
        ctx.restore();

        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1] || "";
        const binaryStr = atob(base64);
        const uint8Array = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          uint8Array[i] = binaryStr.charCodeAt(i);
        }

        resolve({ dataUrl, uint8Array });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = photoUrl;
  });
}

function getCanonicalData(resume: GeneratedResume) {
  const content = resume.content || {};
  const rawSkills =
    content.skills && content.skills.length > 0
      ? content.skills
      : resume.atsScore?.matchedSkills || [
          ...(resume.technicalSkills?.languages || []),
          ...(resume.technicalSkills?.frameworks || []),
          ...(resume.technicalSkills?.cloudAndDevops || []),
          ...(resume.technicalSkills?.databases || []),
        ];
  const dedupedSkills = Array.from(new Set(rawSkills)).filter(Boolean);

  const scoreAny = (resume.atsScore || {}) as any;
  const rawJdKeywords: string[] = [
    ...(resume.atsScore?.jdMatchedKeywords || scoreAny.jdKeywordsMatched || []),
    ...(resume.atsScore?.matchedSkills || []),
  ];
  const jdMatchedKeywords = Array.from(
    new Set(rawJdKeywords.map((k) => (k || "").trim()).filter((k) => k.length >= 2))
  );

  const isSkillJdMatched = (skillName: string): boolean => {
    const sLow = skillName.toLowerCase().trim();
    return jdMatchedKeywords.some((kw) => {
      const kLow = kw.toLowerCase().trim();
      return sLow === kLow || sLow.includes(kLow) || kLow.includes(sLow);
    });
  };

  // Prioritize JD-matching skills first just like ResumeViewer.tsx
  const skills = [...dedupedSkills].sort((a, b) => {
    const aMatch = isSkillJdMatched(a);
    const bMatch = isSkillJdMatched(b);
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return 0;
  });

  const rawSoftList: string[] = Array.isArray(resume.softSkills)
    ? resume.softSkills
    : Array.isArray(content.softSkills)
    ? content.softSkills
    : [];
  const softSkills: string[] = Array.from(new Set<string>(rawSoftList)).filter(Boolean);
  const dynamicSections = resume.dynamicSections || content.dynamicSections || [];
  const projects = content.projects || [];
  const achievements = content.academicAchievements || [];
  const activities = content.activities || [];
  const additional = content.additional || {};
  const isNonTech = resume.trackType === "NON_TECHNICAL";

  const rawHeadings = resume.sectionHeadings || content.sectionHeadings || {};
  const headings = {
    summary: rawHeadings.summary || "Professional Summary",
    experience: rawHeadings.experience || "Professional Experience",
    education: rawHeadings.education || "Education",
    skills:
      rawHeadings.skills ||
      (isNonTech ? "Core Competencies & Skills" : "Technical & Professional Skills"),
    softSkills: rawHeadings.softSkills || "Soft & Interpersonal Skills",
    projects: rawHeadings.projects || "Key Projects",
    certifications: rawHeadings.certifications || "Certifications & Credentials",
    achievements: rawHeadings.achievements || "Achievements & Honors",
    activities: rawHeadings.activities || rawHeadings.achievements || "Leadership & Activities",
  };

  const contactParts: string[] = [];
  if (resume.contactInfo?.email) contactParts.push(resume.contactInfo.email);
  if (resume.contactInfo?.phone) contactParts.push(resume.contactInfo.phone);
  if (resume.contactInfo?.location) contactParts.push(resume.contactInfo.location);
  if (resume.contactInfo?.linkedIn && resume.linkedInData?.includeProfileUrlInResume !== false) {
    contactParts.push(resume.contactInfo.linkedIn);
  }
  if (!isNonTech && resume.contactInfo?.github) {
    contactParts.push(resume.contactInfo.github);
  }
  if (!isNonTech && resume.contactInfo?.portfolio) {
    contactParts.push(resume.contactInfo.portfolio);
  }

  return {
    skills,
    softSkills,
    dynamicSections,
    projects,
    achievements,
    activities,
    additional,
    isNonTech,
    headings,
    contactParts,
    jdMatchedKeywords,
    isSkillJdMatched,
  };
}

function normalizeTemplateId(templateId?: ResumeTemplateId | string): ResumeTemplateId {
  switch (templateId) {
    case "executive_columns":
      return "col_executive_split";
    case "technical_grid":
      return "col_tech_matrix";
    case "modern_sidebar":
      return "col_modern_sidebar";
    case "double_rail":
      return "col_compact_dual";
    case "tri_column_brief":
    case "academic_cv":
      return "col_academic_grid";
    case "consulting":
      return "harvard";
    case "two_column":
    case "col_executive_split":
    case "col_tech_matrix":
    case "col_modern_sidebar":
    case "col_academic_grid":
    case "col_compact_dual":
    case "harvard":
    case "modern":
    case "tech":
    case "minimal":
    case "finance":
    case "healthcare":
      return templateId;
    default:
      return "two_column";
  }
}

function isColumnBasedTemplate(templateId: ResumeTemplateId): boolean {
  const norm = normalizeTemplateId(templateId);
  return (
    norm === "two_column" ||
    norm === "col_executive_split" ||
    norm === "col_tech_matrix" ||
    norm === "col_modern_sidebar" ||
    norm === "col_academic_grid" ||
    norm === "col_compact_dual"
  );
}

/**
 * Generates and downloads a Plain Text (.txt) ATS Resume preserving 100% of candidate information
 */
export function downloadResumeAsTxt(resume: GeneratedResume): void {
  const { skills, softSkills, dynamicSections, projects, achievements, headings, contactParts } =
    getCanonicalData(resume);
  const lines: string[] = [];

  lines.push((resume.candidateName || "CANDIDATE NAME").toUpperCase());
  if (resume.targetJobTitle) {
    lines.push(`Target Role: ${resume.targetJobTitle}`);
  }
  if (contactParts.length > 0) {
    lines.push(contactParts.join(" | "));
  }
  lines.push("=".repeat(72));
  lines.push("");

  if (resume.summary) {
    lines.push(headings.summary.toUpperCase());
    lines.push("-".repeat(36));
    lines.push(resume.summary);
    lines.push("");
  }

  if (skills.length > 0) {
    lines.push(headings.skills.toUpperCase());
    lines.push("-".repeat(36));
    lines.push(skills.join(" • "));
    if (softSkills.length > 0) {
      lines.push(`${headings.softSkills}: ${softSkills.join(" • ")}`);
    }
    lines.push("");
  }

  if (resume.experience && resume.experience.length > 0) {
    lines.push(headings.experience.toUpperCase());
    lines.push("-".repeat(36));
    for (const exp of resume.experience) {
      lines.push(
        `${exp.role} | ${exp.company}${exp.location ? ` (${exp.location})` : ""} | ${exp.dates || ""}`
      );
      for (const b of exp.bullets || []) {
        lines.push(`  • ${b}`);
      }
      lines.push("");
    }
  }

  if (projects.length > 0) {
    lines.push(headings.projects.toUpperCase());
    lines.push("-".repeat(36));
    for (const p of projects) {
      const techStr =
        p.technologies && p.technologies.length > 0 ? ` [${p.technologies.join(", ")}]` : "";
      lines.push(`${p.name}${techStr}${p.dates ? ` | ${p.dates}` : ""}`);
      if (p.description) lines.push(`  • ${p.description}`);
      if (Array.isArray(p.bullets)) {
        for (const b of p.bullets) {
          if (b && b !== p.description) lines.push(`  • ${b}`);
        }
      }
      if (p.outcome && p.outcome !== p.description) lines.push(`  • Impact: ${p.outcome}`);
      lines.push("");
    }
  }

  if (resume.education && resume.education.length > 0) {
    lines.push(headings.education.toUpperCase());
    lines.push("-".repeat(36));
    for (const ed of resume.education) {
      lines.push(
        `${ed.degree} — ${ed.institution}${ed.year ? ` (${ed.year})` : ""}${
          ed.gpa ? ` | GPA: ${ed.gpa}` : ""
        }`
      );
      if (ed.details) lines.push(`  • ${ed.details}`);
    }
    lines.push("");
  }

  if (resume.certifications && resume.certifications.length > 0) {
    lines.push(headings.certifications.toUpperCase());
    lines.push("-".repeat(36));
    for (const cert of resume.certifications) {
      lines.push(`  • ${cert}`);
    }
    lines.push("");
  }

  if (achievements.length > 0) {
    lines.push(headings.achievements.toUpperCase());
    lines.push("-".repeat(36));
    for (const ach of achievements) {
      lines.push(`  • ${ach}`);
    }
    lines.push("");
  }

  if (dynamicSections && dynamicSections.length > 0) {
    for (const sec of dynamicSections) {
      if (!sec.items || sec.items.length === 0) continue;
      lines.push((sec.heading || "ADDITIONAL INFORMATION").toUpperCase());
      lines.push("-".repeat(36));
      for (const item of sec.items) {
        if (item.title) {
          lines.push(
            `${item.title}${item.subtitle ? ` | ${item.subtitle}` : ""}${
              item.date ? ` (${item.date})` : ""
            }`
          );
        }
        for (const b of item.bullets || []) {
          lines.push(`  • ${b}`);
        }
      }
      lines.push("");
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(resume.candidateName || "Candidate")}_ATS_Resume.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a structured JSON (.json) Resume export
 */
export function downloadResumeAsJson(resume: GeneratedResume): void {
  const blob = new Blob([JSON.stringify(resume, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(resume.candidateName || "Candidate")}_ATS_Resume.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a 1-Page Microsoft Word (.docx) document
 * supporting all 12 single-column and column-based templates, embedding candidate photo if present,
 * and preserving 100% of candidate data.
 */
export async function downloadResumeAsDocx(
  resume: GeneratedResume,
  templateId: ResumeTemplateId = "harvard"
): Promise<void> {
  const {
    skills,
    softSkills,
    dynamicSections,
    projects,
    achievements,
    headings,
    contactParts,
  } = getCanonicalData(resume);

  const isHarvard = templateId === "harvard";
  const isFinance = templateId === "finance";
  const isTech = templateId === "tech" || templateId === "col_tech_matrix";
  const isMinimal = templateId === "minimal";
  const isColumn = isColumnBasedTemplate(templateId);

  const fontName = isHarvard || isFinance ? "Times New Roman" : isTech ? "Consolas" : "Calibri";
  const accentColor =
    isMinimal || isHarvard || isFinance
      ? "000000"
      : isTech
      ? "4C1D95"
      : templateId === "healthcare"
      ? "0F766E"
      : templateId === "col_academic_grid"
      ? "075985"
      : templateId === "col_compact_dual"
      ? "9F1239"
      : "1E3A8A";

  const photoAsset = await prepareStyledPhotoAsset(
    resume.photoUrl,
    templateId === "col_modern_sidebar" ? "circle" : "rounded",
    `#${accentColor}`
  );

  const makeHeader = (title: string) =>
    new Paragraph({
      spacing: { before: 120, after: 40 },
      border: {
        bottom: {
          color: accentColor,
          space: 2,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      children: [
        new TextRun({
          text: isHarvard ? title : title.toUpperCase(),
          bold: true,
          size: 20,
          color: accentColor,
          font: fontName,
        }),
      ],
    });

  const children: (Paragraph | Table)[] = [];

  // Header Block (with optional embedded photo)
  const headerTextParagraphs: Paragraph[] = [
    new Paragraph({
      alignment:
        !photoAsset && (isHarvard || isFinance || templateId === "col_academic_grid")
          ? AlignmentType.CENTER
          : AlignmentType.LEFT,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: isHarvard
            ? resume.candidateName || "Candidate Name"
            : (resume.candidateName || "Candidate Name").toUpperCase(),
          bold: true,
          size: 32,
          color: templateId === "col_tech_matrix" ? "FFFFFF" : "0F172A",
          font: fontName,
        }),
      ],
    }),
  ];

  if (resume.targetJobTitle && !isHarvard) {
    headerTextParagraphs.push(
      new Paragraph({
        alignment:
          !photoAsset && (isFinance || templateId === "col_academic_grid")
            ? AlignmentType.CENTER
            : AlignmentType.LEFT,
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: resume.targetJobTitle,
            bold: true,
            size: 20,
            color: templateId === "col_tech_matrix" ? "C4B5FD" : accentColor,
            font: fontName,
          }),
        ],
      })
    );
  }

  if (contactParts.length > 0) {
    headerTextParagraphs.push(
      new Paragraph({
        alignment:
          !photoAsset && (isHarvard || isFinance || templateId === "col_academic_grid")
            ? AlignmentType.CENTER
            : AlignmentType.LEFT,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: contactParts.join("  •  "),
            size: 18,
            color: templateId === "col_tech_matrix" ? "CBD5E1" : "334155",
            font: fontName,
          }),
        ],
      })
    );
  }

  if (photoAsset || templateId === "col_tech_matrix") {
    const isDarkHeader = templateId === "col_tech_matrix";
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: {
            style: BorderStyle.SINGLE,
            size: isDarkHeader ? 0 : 8,
            color: isDarkHeader ? "0F172A" : accentColor,
          },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: photoAsset ? 82 : 100, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: isDarkHeader ? 120 : 0, right: 80 },
                shading: isDarkHeader
                  ? { fill: "0F172A", type: ShadingType.CLEAR, color: "auto" }
                  : undefined,
                children: headerTextParagraphs,
              }),
              ...(photoAsset
                ? [
                    new TableCell({
                      width: { size: 18, type: WidthType.PERCENTAGE },
                      margins: { top: 60, bottom: 60, right: isDarkHeader ? 120 : 0 },
                      shading: isDarkHeader
                        ? { fill: "0F172A", type: ShadingType.CLEAR, color: "auto" }
                        : undefined,
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new ImageRun({
                              data: photoAsset.uint8Array,
                              transformation: { width: 58, height: 58 },
                              type: "png",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      })
    );
  } else {
    children.push(...headerTextParagraphs);
  }

  // Helper to build section paragraphs
  const buildSummaryParagraphs = (): Paragraph[] => {
    if (!resume.summary) return [];
    return [
      makeHeader(headings.summary),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: resume.summary,
            size: 18,
            color: "1E293B",
            font: fontName,
          }),
        ],
      }),
    ];
  };

  const buildSkillsParagraphs = (): Paragraph[] => {
    if (skills.length === 0) return [];
    return [
      makeHeader(headings.skills),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: skills.join(" • "),
            size: 18,
            color: "0F172A",
            font: fontName,
          }),
        ],
      }),
    ];
  };

  const buildExperienceParagraphs = (): Paragraph[] => {
    if (!resume.experience || resume.experience.length === 0) return [];
    const paras: Paragraph[] = [makeHeader(headings.experience)];
    for (const exp of resume.experience) {
      paras.push(
        new Paragraph({
          spacing: { before: 40, after: 20 },
          children: [
            new TextRun({
              text: `${exp.role}`,
              bold: true,
              size: 19,
              color: "0F172A",
              font: fontName,
            }),
            new TextRun({
              text: ` — ${exp.company}`,
              italics: isHarvard,
              bold: !isHarvard,
              size: 18,
              color: "334155",
              font: fontName,
            }),
            new TextRun({
              text: exp.dates ? `   (${exp.dates})` : "",
              size: 17,
              color: "475569",
              font: fontName,
            }),
          ],
        })
      );
      for (const b of exp.bullets || []) {
        paras.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 20 },
            children: [
              new TextRun({
                text: b,
                size: 17,
                color: "1E293B",
                font: fontName,
              }),
            ],
          })
        );
      }
    }
    return paras;
  };

  const buildProjectsParagraphs = (): Paragraph[] => {
    if (projects.length === 0) return [];
    const paras: Paragraph[] = [makeHeader(headings.projects)];
    for (const p of projects) {
      const techText =
        p.technologies && p.technologies.length > 0
          ? ` [${Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies}]`
          : "";
      paras.push(
        new Paragraph({
          spacing: { before: 40, after: 20 },
          children: [
            new TextRun({
              text: p.name,
              bold: true,
              size: 18,
              color: "0F172A",
              font: fontName,
            }),
            new TextRun({
              text: techText,
              size: 17,
              color: accentColor,
              font: fontName,
            }),
          ],
        })
      );
      if (p.description) {
        paras.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 20 },
            children: [
              new TextRun({
                text: p.description,
                size: 17,
                color: "1E293B",
                font: fontName,
              }),
            ],
          })
        );
      }
    }
    return paras;
  };

  const buildEducationParagraphs = (): Paragraph[] => {
    if (!resume.education || resume.education.length === 0) return [];
    const paras: Paragraph[] = [makeHeader(headings.education)];
    for (const ed of resume.education) {
      paras.push(
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: `${ed.degree}`,
              bold: true,
              size: 18,
              color: "0F172A",
              font: fontName,
            }),
            new TextRun({
              text: ` — ${ed.institution}${ed.year ? ` (${ed.year})` : ""}${
                ed.gpa ? ` • GPA: ${ed.gpa}` : ""
              }`,
              size: 17,
              color: "334155",
              font: fontName,
            }),
          ],
        })
      );
    }
    return paras;
  };

  const buildCertsAndAchievementsParagraphs = (): Paragraph[] => {
    const paras: Paragraph[] = [];
    if (resume.certifications && resume.certifications.length > 0) {
      paras.push(makeHeader(headings.certifications));
      for (const c of resume.certifications) {
        paras.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 20 },
            children: [new TextRun({ text: c, size: 17, color: "1E293B", font: fontName })],
          })
        );
      }
    }
    if (achievements.length > 0) {
      paras.push(makeHeader(headings.achievements));
      for (const a of achievements) {
        paras.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 20 },
            children: [new TextRun({ text: a, size: 17, color: "1E293B", font: fontName })],
          })
        );
      }
    }
    if (softSkills && softSkills.length > 0) {
      paras.push(makeHeader(headings.softSkills));
      paras.push(
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({ text: softSkills.join(" • "), size: 17, color: "1E293B", font: fontName }),
          ],
        })
      );
    }
    if (dynamicSections && dynamicSections.length > 0) {
      for (const sec of dynamicSections) {
        if (!sec.items || sec.items.length === 0) continue;
        paras.push(makeHeader(sec.heading || "Additional Section"));
        for (const item of sec.items) {
          if (item.title) {
            paras.push(
              new Paragraph({
                spacing: { after: 15 },
                children: [
                  new TextRun({
                    text: item.title,
                    bold: true,
                    size: 17.5,
                    color: "0F172A",
                    font: fontName,
                  }),
                  ...(item.subtitle
                    ? [
                        new TextRun({
                          text: ` — ${item.subtitle}`,
                          size: 17,
                          color: "334155",
                          font: fontName,
                        }),
                      ]
                    : []),
                  ...(item.date
                    ? [
                        new TextRun({
                          text: ` (${item.date})`,
                          size: 16.5,
                          color: "64748B",
                          font: fontName,
                        }),
                      ]
                    : []),
                ],
              })
            );
          }
          for (const b of item.bullets || []) {
            paras.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 18 },
                children: [new TextRun({ text: b, size: 17, color: "1E293B", font: fontName })],
              })
            );
          }
        }
      }
    }
    return paras;
  };

  if (isColumn) {
    if (templateId === "col_tech_matrix") {
      // Top full-width Summary + Categorized Skill Matrix, then 2-column Experience | Projects/Education
      children.push(...buildSummaryParagraphs(), ...buildSkillsParagraphs());
      const leftCol = [...buildExperienceParagraphs()];
      const rightCol = [
        ...buildProjectsParagraphs(),
        ...buildEducationParagraphs(),
        ...buildCertsAndAchievementsParagraphs(),
      ];
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 58, type: WidthType.PERCENTAGE },
                  margins: { right: 140, top: 40, bottom: 40 },
                  children: leftCol.length > 0 ? leftCol : [new Paragraph("")],
                }),
                new TableCell({
                  width: { size: 42, type: WidthType.PERCENTAGE },
                  margins: { left: 140, top: 40, bottom: 40 },
                  children: rightCol.length > 0 ? rightCol : [new Paragraph("")],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      const leftSideFirst =
        templateId === "two_column" ||
        templateId === "col_modern_sidebar" ||
        templateId === "col_academic_grid";

      const sidebarParas = [
        ...buildSkillsParagraphs(),
        ...buildEducationParagraphs(),
        ...buildCertsAndAchievementsParagraphs(),
      ];
      const mainParas = [
        ...buildSummaryParagraphs(),
        ...buildExperienceParagraphs(),
        ...buildProjectsParagraphs(),
      ];

      const col1Paras =
        templateId === "col_compact_dual"
          ? [...buildSummaryParagraphs(), ...buildExperienceParagraphs(), ...buildEducationParagraphs()]
          : leftSideFirst
          ? sidebarParas
          : mainParas;
      const col2Paras =
        templateId === "col_compact_dual"
          ? [
              ...buildSkillsParagraphs(),
              ...buildProjectsParagraphs(),
              ...buildCertsAndAchievementsParagraphs(),
            ]
          : leftSideFirst
          ? mainParas
          : sidebarParas;

      const col1Width = templateId === "col_compact_dual" ? 50 : leftSideFirst ? 34 : 66;
      const col2Width = 100 - col1Width;

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: col1Width, type: WidthType.PERCENTAGE },
                  margins: { right: 160, top: 40, bottom: 40 },
                  shading:
                    templateId === "col_modern_sidebar"
                      ? { fill: "F8FAFC", type: ShadingType.CLEAR, color: "auto" }
                      : undefined,
                  children: col1Paras.length > 0 ? col1Paras : [new Paragraph("")],
                }),
                new TableCell({
                  width: { size: col2Width, type: WidthType.PERCENTAGE },
                  margins: { left: 160, top: 40, bottom: 40 },
                  children: col2Paras.length > 0 ? col2Paras : [new Paragraph("")],
                }),
              ],
            }),
          ],
        })
      );
    }
  } else {
    children.push(
      ...buildSummaryParagraphs(),
      ...buildSkillsParagraphs(),
      ...buildExperienceParagraphs(),
      ...buildProjectsParagraphs(),
      ...buildEducationParagraphs(),
      ...buildCertsAndAchievementsParagraphs()
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 500,
              right: 560,
              bottom: 500,
              left: 560,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(resume.candidateName || "Candidate")}_${templateId}_1Page_Resume.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ColumnRhythm {
  lineStep: number;
  bulletGap: number;
  entryGap: number;
  sectionGapBefore: number;
  sectionGapAfter: number;
  pillH: number;
  pillGapY: number;
}

interface PdfLayoutSpec {
  scale: number;
  marginX: number;
  marginY: number;
  targetBottomY: number;
  nameSize: number;
  subtitleSize: number;
  contactSize: number;
  titleSize: number;
  entryTitleSize: number;
  bodySize: number;
  metaSize: number;
  pillFontSize: number;
  headerBottomGap: number;
  boxPadY: number;
  mainRhythm: ColumnRhythm;
  leftRhythm: ColumnRhythm;
  rightRhythm: ColumnRhythm;
}

interface RenderPassResult {
  maxY: number;
  isTwoColumn: boolean;
  leftEndY: number;
  rightEndY: number;
}

function clampVal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function buildColumnRhythm(
  scale: number,
  bodySize: number,
  expand: number
): ColumnRhythm {
  const bodyMm = bodySize * 0.3528;
  const baseLineRatio =
    scale >= 1
      ? 1.35 + (scale - 1) * 0.25
      : 1.2 + Math.max(0, scale - 0.55) * 0.33;
  const baseLineStep = bodyMm * baseLineRatio;
  const baseBulletGap = Math.max(0.1, (scale - 0.72) * 1.05);
  const baseEntryGap = Math.max(0.9, 2.2 * scale);
  const baseSectionBefore = Math.max(1.2, 3.0 * scale);
  const baseSectionAfter = Math.max(2.0, 3.8 * scale);
  const basePillH = clampVal(4.3 * scale, 3.2, 6.0);
  const basePillGapY = clampVal(1.35 * scale, 0.8, 2.8);

  return {
    lineStep: Number((baseLineStep + expand * 2.1).toFixed(2)),
    bulletGap: Number((baseBulletGap + expand * 2.7).toFixed(2)),
    entryGap: Number((baseEntryGap + expand * 6.5).toFixed(2)),
    sectionGapBefore: Number((baseSectionBefore + expand * 8.2).toFixed(2)),
    sectionGapAfter: Number((baseSectionAfter + expand * 3.8).toFixed(2)),
    pillH: Number((basePillH + expand * 1.15).toFixed(2)),
    pillGapY: Number((basePillGapY + expand * 2.4).toFixed(2)),
  };
}

function buildPdfLayoutSpec(
  pageHeight: number,
  scale: number,
  mainExpand: number,
  leftExpand: number = mainExpand,
  rightExpand: number = mainExpand
): PdfLayoutSpec {
  const marginX = Number(clampVal(11.0 * Math.pow(scale, 0.32), 8.5, 13.5).toFixed(2));
  const marginY = Number(clampVal(10.5 * Math.pow(scale, 0.32), 8.0, 13.0).toFixed(2));
  const targetBottomY = Number((pageHeight - marginY).toFixed(2));

  const nameSize = Number(clampVal(17.5 * scale, 13.0, 22.8).toFixed(1));
  const subtitleSize = Number(clampVal(10.0 * scale, 7.6, 13.2).toFixed(1));
  const contactSize = Number(clampVal(8.5 * scale, 6.8, 10.6).toFixed(1));
  const titleSize = Number(clampVal(10.2 * scale, 7.8, 13.0).toFixed(1));
  const entryTitleSize = Number(clampVal(9.6 * scale, 7.4, 12.2).toFixed(1));
  const bodySize = Number(clampVal(9.1 * scale, 7.0, 11.4).toFixed(1));
  const metaSize = Number(clampVal(8.4 * scale, 6.6, 10.4).toFixed(1));
  const pillFontSize = Number(clampVal(8.1 * scale, 6.4, 10.2).toFixed(1));

  const headerBottomGap = Number((clampVal(4.2 * scale, 2.4, 6.8) + mainExpand * 5.5).toFixed(2));
  const boxPadY = Number((clampVal(3.4 * scale, 2.2, 5.4) + mainExpand * 2.8).toFixed(2));

  return {
    scale,
    marginX,
    marginY,
    targetBottomY,
    nameSize,
    subtitleSize,
    contactSize,
    titleSize,
    entryTitleSize,
    bodySize,
    metaSize,
    pillFontSize,
    headerBottomGap,
    boxPadY,
    mainRhythm: buildColumnRhythm(scale, bodySize, mainExpand),
    leftRhythm: buildColumnRhythm(scale, bodySize, leftExpand),
    rightRhythm: buildColumnRhythm(scale, bodySize, rightExpand),
  };
}

/**
 * Generates and downloads a 1-Page PDF document (.pdf) that visually matches
 * the exact selected resume template (across all 12 templates), dynamically
 * optimizes font sizes and vertical spacing to fill the A4 page cleanly without
 * bottom white space or overflow, and embeds the candidate's profile photo.
 */
export async function downloadResumeAsPdf(
  resume: GeneratedResume,
  rawTemplateId: ResumeTemplateId = "two_column",
  _element?: HTMLElement | null
): Promise<void> {
  const templateId = normalizeTemplateId(rawTemplateId);
  const {
    skills,
    softSkills,
    dynamicSections,
    projects,
    achievements,
    activities,
    headings,
    contactParts,
    isSkillJdMatched,
  } = getCanonicalData(resume);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const isSerif = templateId === "harvard" || templateId === "finance";
  const isMonoHeader = templateId === "tech" || templateId === "col_tech_matrix";
  const fontFam = isSerif ? "times" : "helvetica";
  const headerFontFam = isMonoHeader ? "courier" : fontFam;

  // Determine template-specific photo border & shape
  const photoShape: "rounded" | "circle" | "square" =
    templateId === "col_modern_sidebar"
      ? "circle"
      : isSerif || templateId === "minimal"
      ? "square"
      : "rounded";

  const photoBorderHex =
    templateId === "col_tech_matrix"
      ? "#a78bfa"
      : templateId === "col_modern_sidebar" || templateId === "modern"
      ? "#4f46e5"
      : templateId === "col_executive_split"
      ? "#312e81"
      : templateId === "col_academic_grid"
      ? "#075985"
      : templateId === "col_compact_dual"
      ? "#9f1239"
      : templateId === "healthcare"
      ? "#0f766e"
      : templateId === "tech"
      ? "#6d28d9"
      : templateId === "minimal" || templateId === "finance" || templateId === "harvard"
      ? "#0f172a"
      : "#94a3b8";

  const photoAsset = await prepareStyledPhotoAsset(resume.photoUrl, photoShape, photoBorderHex);

  const runRenderPass = (spec: PdfLayoutSpec, dryRun: boolean): RenderPassResult => {
    const margin = spec.marginX;
    const maxWidth = pageWidth - margin * 2;
    let y = spec.marginY;

    const {
      nameSize,
      subtitleSize,
      contactSize,
      titleSize,
      entryTitleSize,
      bodySize,
      metaSize,
      pillFontSize,
    } = spec;

    // Helper: Draw rounded Skill Badges
    const drawSkillBadges = (
      skillList: string[],
      xStart: number,
      colW: number,
      startY: number,
      rhythm: ColumnRhythm,
      measureOnly: boolean = dryRun
    ): number => {
      if (!skillList || skillList.length === 0) return startY;
      let cx = xStart;
      let cy = startY;
      const pillH = rhythm.pillH;
      const padX = clampVal(1.8 * spec.scale, 1.3, 2.5);
      const gapX = clampVal(1.3 * spec.scale, 0.9, 1.9);
      const gapY = rhythm.pillGapY;

      for (const rawSkill of skillList) {
        const skill = (rawSkill || "").trim();
        if (!skill) continue;
        const matched = isSkillJdMatched(skill);
        pdf.setFont(fontFam, matched ? "bold" : "normal");
        pdf.setFontSize(pillFontSize);

        let label = skill;
        let textW = pdf.getTextWidth(label);
        if (textW + padX * 2 > colW) {
          label = pdf.splitTextToSize(label, colW - padX * 2)[0] || label;
          textW = pdf.getTextWidth(label);
        }
        const pillW = Math.min(colW, textW + padX * 2);

        if (cx + pillW > xStart + colW && cx > xStart) {
          cx = xStart;
          cy += pillH + gapY;
        }

        if (!measureOnly && cy <= pageHeight - 4) {
          if (matched) {
            pdf.setFillColor(238, 242, 255);
            pdf.setDrawColor(165, 180, 252);
            pdf.setTextColor(30, 27, 75);
          } else {
            pdf.setFillColor(241, 245, 249);
            pdf.setDrawColor(203, 213, 225);
            pdf.setTextColor(30, 41, 59);
          }
          pdf.setLineWidth(0.2);
          const rectTop = cy - pillH * 0.76;
          pdf.roundedRect(cx, rectTop, pillW, pillH, 0.9, 0.9, "FD");
          pdf.text(label, cx + padX, rectTop + pillH * 0.72);
        }

        cx += pillW + gapX;
      }

      return cy + pillH * 0.35 + rhythm.entryGap * 0.4;
    };

    // Helper: Draw Section Heading with template-specific typography & underline
    const drawSectionHeader = (
      title: string,
      xStart: number,
      colW: number,
      curY: number,
      rhythm: ColumnRhythm,
      colorRGB: [number, number, number] = [15, 23, 42],
      lineRGB: [number, number, number] = [203, 213, 225],
      useMono: boolean = false,
      keepCase: boolean = false,
      isFirstInCol: boolean = false
    ): number => {
      if (!isFirstInCol) {
        curY += rhythm.sectionGapBefore;
      }
      pdf.setFont(useMono ? "courier" : fontFam, "bold");
      pdf.setFontSize(titleSize);
      if (!dryRun && curY <= pageHeight - 4) {
        pdf.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
        pdf.text(keepCase ? title : title.toUpperCase(), xStart, curY);
      }
      curY += clampVal(1.3 * spec.scale, 1.0, 1.8);
      if (!dryRun && curY <= pageHeight - 4) {
        pdf.setDrawColor(lineRGB[0], lineRGB[1], lineRGB[2]);
        pdf.setLineWidth(isSerif || templateId === "minimal" ? 0.35 : 0.25);
        pdf.line(xStart, curY, xStart + colW, curY);
      }
      return curY + rhythm.sectionGapAfter;
    };

    // Helper: Render Experience entries into a column or full width
    const renderExperienceBlock = (
      xPos: number,
      width: number,
      curY: number,
      rhythm: ColumnRhythm,
      opts?: {
        roleCompanyJoiner?: string;
        companyColor?: [number, number, number];
        dateColor?: [number, number, number];
        monoDates?: boolean;
        companyFirst?: boolean;
        italicSecondary?: boolean;
      }
    ): number => {
      const joiner = opts?.roleCompanyJoiner ?? " — ";
      const compColor = opts?.companyColor ?? [49, 46, 129];
      const dtColor = opts?.dateColor ?? [100, 116, 139];
      const list = resume.experience || [];

      for (let idx = 0; idx < list.length; idx++) {
        const exp = list[idx];
        const dateStr = exp.dates || "";
        pdf.setFont(opts?.monoDates ? "courier" : fontFam, "bold");
        pdf.setFontSize(metaSize);
        const dateW = dateStr ? pdf.getTextWidth(dateStr) + 3 : 0;

        const compWithLoc = exp.company
          ? `${exp.company}${exp.location ? ` (${exp.location})` : ""}`
          : "";
        const primaryText = opts?.companyFirst ? compWithLoc : exp.role || "";
        const secondaryText = opts?.companyFirst ? exp.role || "" : compWithLoc;

        pdf.setFont(fontFam, "bold");
        pdf.setFontSize(entryTitleSize);
        const pText = opts?.companyFirst ? primaryText.toUpperCase() : primaryText;
        if (!dryRun && curY <= pageHeight - 4) {
          pdf.setTextColor(15, 23, 42);
          pdf.text(pText, xPos, curY);
        }
        const pW = pdf.getTextWidth(pText);

        if (secondaryText && pW + 6 < width - dateW) {
          pdf.setFont(fontFam, opts?.italicSecondary ? "italic" : "bold");
          pdf.setFontSize(bodySize);
          const secLine = pdf.splitTextToSize(
            `${joiner}${secondaryText}`,
            Math.max(15, width - dateW - pW - 1)
          )[0];
          if (secLine && !dryRun && curY <= pageHeight - 4) {
            pdf.setTextColor(compColor[0], compColor[1], compColor[2]);
            pdf.text(secLine, xPos + pW, curY);
          }
        } else if (secondaryText) {
          curY += rhythm.lineStep * 0.92;
          pdf.setFont(fontFam, opts?.italicSecondary ? "italic" : "bold");
          pdf.setFontSize(bodySize);
          const secLine = pdf.splitTextToSize(secondaryText, width - dateW)[0];
          if (secLine && !dryRun && curY <= pageHeight - 4) {
            pdf.setTextColor(compColor[0], compColor[1], compColor[2]);
            pdf.text(secLine, xPos, curY);
          }
        }

        if (dateStr && !dryRun && curY <= pageHeight - 4) {
          pdf.setFont(opts?.monoDates ? "courier" : fontFam, "bold");
          pdf.setFontSize(metaSize);
          pdf.setTextColor(dtColor[0], dtColor[1], dtColor[2]);
          pdf.text(dateStr, xPos + width, curY, { align: "right" });
        }
        curY += rhythm.lineStep;

        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        const bullets = exp.bullets || [];
        for (let bIdx = 0; bIdx < bullets.length; bIdx++) {
          const b = bullets[bIdx];
          const bLines = pdf.splitTextToSize(`• ${b}`, width - 1.8);
          for (const bl of bLines) {
            if (!dryRun && curY <= pageHeight - 4) {
              pdf.setTextColor(30, 41, 59);
              pdf.text(bl, xPos + 1.0, curY);
            }
            curY += rhythm.lineStep;
          }
          if (bIdx < bullets.length - 1) {
            curY += rhythm.bulletGap;
          }
        }
        if (idx < list.length - 1) {
          curY += rhythm.entryGap;
        }
      }
      return curY;
    };

    // Helper: Render Projects entries into a column or full width (including description, bullets & outcome)
    const renderProjectsBlock = (
      xPos: number,
      width: number,
      curY: number,
      rhythm: ColumnRhythm,
      techColor: [number, number, number] = [67, 56, 202],
      useMonoTech: boolean = false
    ): number => {
      for (let idx = 0; idx < projects.length; idx++) {
        const p = projects[idx];
        pdf.setFont(fontFam, "bold");
        pdf.setFontSize(entryTitleSize);
        const nameStr = p.name || "Project";
        if (!dryRun && curY <= pageHeight - 4) {
          pdf.setTextColor(15, 23, 42);
          pdf.text(nameStr, xPos, curY);
        }

        const techArr = Array.isArray(p.technologies)
          ? p.technologies
          : p.technologies
          ? [String(p.technologies)]
          : [];

        if (techArr.length > 0) {
          const techText = `[${techArr.slice(0, 6).join(", ")}]`;
          pdf.setFont(useMonoTech ? "courier" : fontFam, "bold");
          pdf.setFontSize(metaSize);
          const nameW = pdf.getTextWidth(nameStr);
          const availW = width - nameW - 3;
          if (availW > 22) {
            const shortTech = pdf.splitTextToSize(techText, availW)[0];
            if (shortTech && !dryRun && curY <= pageHeight - 4) {
              pdf.setTextColor(techColor[0], techColor[1], techColor[2]);
              pdf.text(shortTech, xPos + width, curY, { align: "right" });
            }
          } else {
            curY += rhythm.lineStep * 0.9;
            const shortTech = pdf.splitTextToSize(techText, width)[0];
            if (shortTech && !dryRun && curY <= pageHeight - 4) {
              pdf.setTextColor(techColor[0], techColor[1], techColor[2]);
              pdf.text(shortTech, xPos, curY);
            }
          }
        }
        curY += rhythm.lineStep;

        const projLines: string[] = [];
        if (p.description) projLines.push(p.description);
        if (Array.isArray(p.bullets)) {
          for (const b of p.bullets) {
            if (b && b !== p.description) projLines.push(`• ${b}`);
          }
        }
        if (p.outcome && p.outcome !== p.description) {
          projLines.push(`• Impact: ${p.outcome}`);
        }

        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (let lIdx = 0; lIdx < projLines.length; lIdx++) {
          const dLines = pdf.splitTextToSize(projLines[lIdx], width - 1);
          for (const dl of dLines) {
            if (!dryRun && curY <= pageHeight - 4) {
              pdf.setTextColor(51, 65, 85);
              pdf.text(dl, xPos, curY);
            }
            curY += rhythm.lineStep;
          }
          if (lIdx < projLines.length - 1) {
            curY += rhythm.bulletGap;
          }
        }
        if (idx < projects.length - 1) {
          curY += rhythm.entryGap;
        }
      }
      return curY;
    };

    // Helper: Render Education entries
    const renderEducationBlock = (
      xPos: number,
      width: number,
      curY: number,
      rhythm: ColumnRhythm,
      compactOneLine: boolean = false,
      institutionFirst: boolean = false
    ): number => {
      const edList = resume.education || [];
      for (let idx = 0; idx < edList.length; idx++) {
        const ed = edList[idx];
        if (compactOneLine) {
          pdf.setFont(fontFam, "bold");
          pdf.setFontSize(bodySize);
          const leftText = institutionFirst
            ? `${ed.institution} — ${ed.degree}${ed.gpa ? ` (GPA: ${ed.gpa})` : ""}`
            : `${ed.degree} — ${ed.institution}${ed.gpa ? ` (GPA: ${ed.gpa})` : ""}`;
          const yearW = ed.year ? 20 : 0;
          const lines = pdf.splitTextToSize(leftText, width - yearW);
          for (let i = 0; i < lines.length; i++) {
            if (!dryRun && curY <= pageHeight - 4) {
              pdf.setFont(fontFam, i === 0 ? "bold" : "normal");
              pdf.setTextColor(15, 23, 42);
              pdf.text(lines[i], xPos, curY);
              if (i === 0 && ed.year) {
                pdf.setFont(fontFam, "normal");
                pdf.setFontSize(metaSize);
                pdf.setTextColor(71, 85, 105);
                pdf.text(String(ed.year), xPos + width, curY, { align: "right" });
                pdf.setFontSize(bodySize);
              }
            }
            curY += rhythm.lineStep;
          }
        } else {
          pdf.setFont(fontFam, "bold");
          pdf.setFontSize(entryTitleSize);
          const topStr = institutionFirst ? ed.institution || "" : ed.degree || "";
          const subStr = institutionFirst ? ed.degree || "" : ed.institution || "";
          for (const tl of pdf.splitTextToSize(topStr, width)) {
            if (!dryRun && curY <= pageHeight - 4) {
              pdf.setTextColor(15, 23, 42);
              pdf.text(tl, xPos, curY);
            }
            curY += rhythm.lineStep;
          }
          pdf.setFont(fontFam, "normal");
          pdf.setFontSize(bodySize);
          for (const sl of pdf.splitTextToSize(subStr, width)) {
            if (!dryRun && curY <= pageHeight - 4) {
              pdf.setTextColor(51, 65, 85);
              pdf.text(sl, xPos, curY);
            }
            curY += rhythm.lineStep;
          }
          const meta = [ed.year, ed.gpa ? `GPA: ${ed.gpa}` : "", ed.location]
            .filter(Boolean)
            .join(" • ");
          if (meta) {
            pdf.setFontSize(metaSize);
            if (!dryRun && curY <= pageHeight - 4) {
              pdf.setTextColor(100, 116, 139);
              pdf.text(meta, xPos, curY);
            }
            curY += rhythm.lineStep;
          }
        }
        if (ed.details) {
          pdf.setFont(fontFam, "normal");
          pdf.setFontSize(metaSize);
          for (const dl of pdf.splitTextToSize(ed.details, width - 1)) {
            if (!dryRun && curY <= pageHeight - 4) {
              pdf.setTextColor(71, 85, 105);
              pdf.text(dl, xPos, curY);
            }
            curY += rhythm.lineStep;
          }
        }
        if (idx < edList.length - 1) {
          curY += rhythm.entryGap * 0.75;
        }
      }
      return curY;
    };

    // Helper: Render Bullet List (Certifications, Achievements, Activities)
    const renderBulletItems = (
      items: string[],
      xPos: number,
      width: number,
      curY: number,
      rhythm: ColumnRhythm,
      colorRGB: [number, number, number] = [30, 41, 59]
    ): number => {
      pdf.setFont(fontFam, "normal");
      pdf.setFontSize(bodySize);
      for (let i = 0; i < items.length; i++) {
        const lines = pdf.splitTextToSize(`• ${items[i]}`, width);
        for (const l of lines) {
          if (!dryRun && curY <= pageHeight - 4) {
            pdf.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
            pdf.text(l, xPos, curY);
          }
          curY += rhythm.lineStep;
        }
        if (i < items.length - 1) {
          curY += rhythm.bulletGap;
        }
      }
      return curY;
    };

    // Helper: Render Dynamic Sections & Soft Skills
    const renderDynamicAndSoftSkills = (
      xPos: number,
      width: number,
      curY: number,
      rhythm: ColumnRhythm,
      headerRGB: [number, number, number] = [15, 23, 42],
      lineRGB: [number, number, number] = [203, 213, 225]
    ): number => {
      if (softSkills.length > 0) {
        curY = drawSectionHeader(headings.softSkills, xPos, width, curY, rhythm, headerRGB, lineRGB);
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const l of pdf.splitTextToSize(softSkills.join("  •  "), width)) {
          if (!dryRun && curY <= pageHeight - 4) {
            pdf.setTextColor(30, 41, 59);
            pdf.text(l, xPos, curY);
          }
          curY += rhythm.lineStep;
        }
      }

      if (dynamicSections && dynamicSections.length > 0) {
        for (const sec of dynamicSections) {
          if (!sec.items || sec.items.length === 0) continue;
          curY = drawSectionHeader(
            sec.heading || "Additional Section",
            xPos,
            width,
            curY,
            rhythm,
            headerRGB,
            lineRGB
          );
          for (let idx = 0; idx < sec.items.length; idx++) {
            const item = sec.items[idx];
            if (item.title || item.subtitle || item.date) {
              pdf.setFont(fontFam, "bold");
              pdf.setFontSize(entryTitleSize);
              const tLine = pdf.splitTextToSize(
                `${item.title || ""}${item.subtitle ? ` — ${item.subtitle}` : ""}`,
                width - (item.date ? 20 : 0)
              )[0];
              if (tLine && !dryRun && curY <= pageHeight - 4) {
                pdf.setTextColor(15, 23, 42);
                pdf.text(tLine, xPos, curY);
              }
              if (item.date && !dryRun && curY <= pageHeight - 4) {
                pdf.setFont(fontFam, "normal");
                pdf.setFontSize(metaSize);
                pdf.setTextColor(100, 116, 139);
                pdf.text(String(item.date), xPos + width, curY, { align: "right" });
              }
              curY += rhythm.lineStep;
            }
            const bullets = item.bullets || [];
            if (bullets.length > 0) {
              curY = renderBulletItems(bullets, xPos + 1.0, width - 1.5, curY, rhythm);
            }
            if (idx < sec.items.length - 1) {
              curY += rhythm.entryGap * 0.75;
            }
          }
        }
      }
      return curY;
    };

    // =========================================================================
    // TEMPLATE 3: ENGINEERING DUAL-COLUMN MATRIX ('col_tech_matrix')
    // =========================================================================
    if (templateId === "col_tech_matrix") {
      const photoSz = clampVal(14.5 * spec.scale, 12.5, 18.5);
      const headerH = Math.max(
        photoAsset ? photoSz + 4.5 : 15,
        clampVal(16.5 * spec.scale, 14, 22)
      );
      if (!dryRun) {
        pdf.setFillColor(15, 23, 42);
        pdf.roundedRect(margin, y, maxWidth, headerH, 2.5, 2.5, "F");
      }

      let textStartX = margin + 4;
      if (photoAsset) {
        if (!dryRun) {
          pdf.addImage(
            photoAsset.dataUrl,
            "PNG",
            margin + 3.5,
            y + (headerH - photoSz) / 2,
            photoSz,
            photoSz
          );
        }
        textStartX = margin + photoSz + 6.5;
      }

      if (!dryRun) {
        pdf.setFont("courier", "bold");
        pdf.setFontSize(clampVal(nameSize * 0.9, 12.5, 19.5));
        pdf.setTextColor(255, 255, 255);
        pdf.text(
          (resume.candidateName || "CANDIDATE NAME").toUpperCase(),
          textStartX,
          y + headerH * 0.36
        );

        if (resume.targetJobTitle) {
          pdf.setFont("courier", "bold");
          pdf.setFontSize(subtitleSize);
          pdf.setTextColor(196, 181, 253);
          pdf.text(resume.targetJobTitle, textStartX, y + headerH * 0.62);
        }

        if (contactParts.length > 0) {
          pdf.setFont("courier", "normal");
          pdf.setFontSize(contactSize);
          pdf.setTextColor(203, 213, 225);
          const cLine = pdf.splitTextToSize(
            contactParts.join(" | "),
            maxWidth - (textStartX - margin) - 4
          )[0];
          if (cLine) {
            pdf.text(cLine, textStartX, y + headerH * 0.85);
          }
        }
      }

      y += headerH + spec.headerBottomGap * 0.75;

      // Summary Box
      if (resume.summary) {
        const prefix = `[${headings.summary.toUpperCase()}]: `;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        const sumLines = pdf.splitTextToSize(`${prefix}${resume.summary}`, maxWidth - 6);
        const boxH = sumLines.length * spec.mainRhythm.lineStep + spec.boxPadY;

        if (!dryRun) {
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.25);
          pdf.roundedRect(margin, y, maxWidth, boxH, 2, 2, "FD");

          let sy = y + spec.boxPadY * 0.52 + bodySize * 0.25;
          for (let i = 0; i < sumLines.length; i++) {
            if (i === 0 && sumLines[0].startsWith(prefix)) {
              pdf.setFont("courier", "bold");
              pdf.setFontSize(bodySize - 0.2);
              pdf.setTextColor(76, 29, 149);
              pdf.text(prefix, margin + 3, sy);
              const pW = pdf.getTextWidth(prefix);
              pdf.setFont(fontFam, "normal");
              pdf.setFontSize(bodySize);
              pdf.setTextColor(30, 41, 59);
              pdf.text(sumLines[0].slice(prefix.length), margin + 3 + pW, sy);
            } else {
              pdf.setFont(fontFam, "normal");
              pdf.setFontSize(bodySize);
              pdf.setTextColor(30, 41, 59);
              pdf.text(sumLines[i], margin + 3, sy);
            }
            sy += spec.mainRhythm.lineStep;
          }
        }
        y += boxH + spec.headerBottomGap * 0.65;
      }

      // Categorized Skill Matrix Box
      if (skills.length > 0) {
        const badgeStartOffset = clampVal(7.5 * spec.scale, 6.2, 10.2);
        const dryEndY = drawSkillBadges(
          skills,
          margin + 3,
          maxWidth - 6,
          y + badgeStartOffset,
          spec.mainRhythm,
          true
        );
        const matrixBoxH = Math.max(11, dryEndY - y + spec.boxPadY * 0.55);

        if (!dryRun) {
          pdf.setFillColor(245, 243, 255);
          pdf.setDrawColor(221, 214, 254);
          pdf.setLineWidth(0.25);
          pdf.roundedRect(margin, y, maxWidth, matrixBoxH, 2, 2, "FD");

          pdf.setFont("courier", "bold");
          pdf.setFontSize(metaSize);
          pdf.setTextColor(46, 16, 101);
          pdf.text(
            `// ${headings.skills.toUpperCase()} (JD-PRIORITIZED MATRIX)`,
            margin + 3,
            y + badgeStartOffset * 0.52
          );

          drawSkillBadges(
            skills,
            margin + 3,
            maxWidth - 6,
            y + badgeStartOffset,
            spec.mainRhythm,
            false
          );
        }
        y += matrixBoxH + spec.headerBottomGap * 0.7;
      }

      const leftW = (maxWidth - 6) * 0.58;
      const rightW = maxWidth - 6 - leftW;
      const leftX = margin;
      const rightX = margin + leftW + 6;
      const splitTopY = y;

      // Left Column: 01 // Experience
      let ly = y;
      let leftFirst = true;
      if (resume.experience && resume.experience.length > 0) {
        ly = drawSectionHeader(
          `01 // ${headings.experience}`,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderExperienceBlock(leftX, leftW, ly, spec.leftRhythm, {
          roleCompanyJoiner: " @ ",
          companyColor: [15, 23, 42],
          dateColor: [100, 116, 139],
          monoDates: true,
        });
      }
      ly = renderDynamicAndSoftSkills(leftX, leftW, ly, spec.leftRhythm);

      // Right Column: 02 // Projects, 03 // Education, 04 // Certifications
      let ry = y;
      let rightFirst = true;
      if (projects.length > 0) {
        ry = drawSectionHeader(
          `02 // ${headings.projects}`,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderProjectsBlock(rightX, rightW, ry, spec.rightRhythm, [109, 40, 217], true);
      }

      if (resume.education && resume.education.length > 0) {
        ry = drawSectionHeader(
          `03 // ${headings.education}`,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderEducationBlock(rightX, rightW, ry, spec.rightRhythm, false, false);
      }

      const creds = [...(resume.certifications || []), ...achievements];
      if (creds.length > 0) {
        ry = drawSectionHeader(
          `04 // ${headings.certifications}`,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderBulletItems(creds, rightX, rightW, ry, spec.rightRhythm);
      }

      if (!dryRun) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(
          margin + leftW + 3,
          splitTopY - 1,
          margin + leftW + 3,
          Math.max(ly, ry, spec.targetBottomY - 2)
        );
      }

      return {
        maxY: Math.max(ly, ry),
        isTwoColumn: true,
        leftEndY: ly,
        rightEndY: ry,
      };
    }

    // =========================================================================
    // TEMPLATE 4: MODERN SLATE SIDEBAR ACCENT ('col_modern_sidebar')
    // =========================================================================
    if (templateId === "col_modern_sidebar") {
      const cardX = margin;
      const cardY = y;
      const cardW = maxWidth;
      const cardH = pageHeight - y * 2;
      const leftW = cardW * 0.34;
      const rightW = cardW - leftW;

      if (!dryRun) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(cardX, cardY, leftW, cardH, "F");
        pdf.setFillColor(79, 70, 229);
        pdf.rect(cardX, cardY, 1.6, cardH, "F");
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.rect(cardX, cardY, cardW, cardH, "S");
        pdf.line(cardX + leftW, cardY, cardX + leftW, cardY + cardH);
      }

      let ly = cardY + clampVal(5.5 * spec.scale, 4.2, 7.5);
      const lx = cardX + 4.5;
      const lw = leftW - 7.5;

      const photoSz = clampVal(16 * spec.scale, 13.5, 20);
      if (photoAsset) {
        if (!dryRun) {
          pdf.addImage(photoAsset.dataUrl, "PNG", lx, ly, photoSz, photoSz);
        }
        ly += photoSz + clampVal(3.8 * spec.scale, 2.8, 5.5);
      }

      pdf.setFont(fontFam, "bold");
      const sidebarNameSize = clampVal(nameSize * 0.82, 11.5, 17.5);
      pdf.setFontSize(sidebarNameSize);
      for (const nl of pdf.splitTextToSize(resume.candidateName || "Candidate Name", lw)) {
        if (!dryRun) {
          pdf.setTextColor(15, 23, 42);
          pdf.text(nl, lx, ly);
        }
        ly += sidebarNameSize * 0.38;
      }

      if (resume.targetJobTitle) {
        pdf.setFont(fontFam, "bold");
        pdf.setFontSize(subtitleSize);
        for (const tl of pdf.splitTextToSize(resume.targetJobTitle, lw)) {
          if (!dryRun) {
            pdf.setTextColor(67, 56, 202);
            pdf.text(tl, lx, ly);
          }
          ly += spec.leftRhythm.lineStep;
        }
      }

      ly += 1.2;
      if (!dryRun) {
        pdf.setDrawColor(226, 232, 240);
        pdf.line(lx, ly, lx + lw, ly);
      }
      ly += spec.leftRhythm.sectionGapAfter * 0.85;

      pdf.setFont(fontFam, "normal");
      pdf.setFontSize(contactSize);
      for (const c of contactParts) {
        const cl = pdf.splitTextToSize(c, lw)[0];
        if (cl) {
          if (!dryRun) {
            pdf.setTextColor(51, 65, 85);
            pdf.text(cl, lx, ly);
          }
          ly += spec.leftRhythm.lineStep * 0.92;
        }
      }

      if (skills.length > 0) {
        ly = drawSectionHeader(
          headings.skills,
          lx,
          lw,
          ly,
          spec.leftRhythm,
          [30, 27, 75],
          [203, 213, 225]
        );
        ly = drawSkillBadges(skills, lx, lw, ly, spec.leftRhythm, dryRun);
      }

      if (resume.education && resume.education.length > 0) {
        ly = drawSectionHeader(
          headings.education,
          lx,
          lw,
          ly,
          spec.leftRhythm,
          [30, 27, 75],
          [203, 213, 225]
        );
        ly = renderEducationBlock(lx, lw, ly, spec.leftRhythm, false, false);
      }

      const creds = [...(resume.certifications || []), ...achievements];
      if (creds.length > 0) {
        ly = drawSectionHeader(
          headings.certifications,
          lx,
          lw,
          ly,
          spec.leftRhythm,
          [30, 27, 75],
          [203, 213, 225]
        );
        ly = renderBulletItems(creds, lx, lw, ly, spec.leftRhythm);
      }

      if (softSkills.length > 0) {
        ly = drawSectionHeader(
          headings.softSkills,
          lx,
          lw,
          ly,
          spec.leftRhythm,
          [30, 27, 75],
          [203, 213, 225]
        );
        ly = renderBulletItems(softSkills, lx, lw, ly, spec.leftRhythm);
      }

      // Right Main Column
      let ry = cardY + clampVal(6 * spec.scale, 4.5, 8);
      const rx = cardX + leftW + 4.5;
      const rw = rightW - 8.5;
      let rightFirst = true;

      if (resume.summary) {
        ry = drawSectionHeader(
          headings.summary,
          rx,
          rw,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [226, 232, 240],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const sl of pdf.splitTextToSize(resume.summary, rw)) {
          if (!dryRun) {
            pdf.setTextColor(30, 41, 59);
            pdf.text(sl, rx, ry);
          }
          ry += spec.rightRhythm.lineStep;
        }
      }

      if (resume.experience && resume.experience.length > 0) {
        ry = drawSectionHeader(
          headings.experience,
          rx,
          rw,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [226, 232, 240],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderExperienceBlock(rx, rw, ry, spec.rightRhythm, {
          roleCompanyJoiner: " — ",
          companyColor: [15, 23, 42],
          dateColor: [67, 56, 202],
        });
      }

      if (projects.length > 0) {
        ry = drawSectionHeader(
          headings.projects,
          rx,
          rw,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [226, 232, 240],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderProjectsBlock(rx, rw, ry, spec.rightRhythm, [79, 70, 229], false);
      }

      if (dynamicSections && dynamicSections.length > 0) {
        for (const sec of dynamicSections) {
          if (!sec.items || sec.items.length === 0) continue;
          ry = drawSectionHeader(
            sec.heading || "Additional Section",
            rx,
            rw,
            ry,
            spec.rightRhythm,
            [15, 23, 42],
            [226, 232, 240]
          );
          for (let idx = 0; idx < sec.items.length; idx++) {
            const item = sec.items[idx];
            if (item.title || item.subtitle || item.date) {
              pdf.setFont(fontFam, "bold");
              pdf.setFontSize(entryTitleSize);
              const tLine = pdf.splitTextToSize(
                `${item.title || ""}${item.subtitle ? ` — ${item.subtitle}` : ""}`,
                rw - (item.date ? 20 : 0)
              )[0];
              if (tLine && !dryRun) {
                pdf.setTextColor(15, 23, 42);
                pdf.text(tLine, rx, ry);
              }
              if (item.date && !dryRun) {
                pdf.setFont(fontFam, "normal");
                pdf.setFontSize(metaSize);
                pdf.setTextColor(100, 116, 139);
                pdf.text(String(item.date), rx + rw, ry, { align: "right" });
              }
              ry += spec.rightRhythm.lineStep;
            }
            if (item.bullets && item.bullets.length > 0) {
              ry = renderBulletItems(item.bullets, rx + 1.0, rw - 1.5, ry, spec.rightRhythm);
            }
            if (idx < sec.items.length - 1) {
              ry += spec.rightRhythm.entryGap * 0.75;
            }
          }
        }
      }

      if (!dryRun) {
        const cardBottom = Math.min(pageHeight - 6, Math.max(ly + 3, ry + 3, spec.targetBottomY));
        const cardH = cardBottom - cardY;
        // Draw sidebar background and borders behind text? Wait: in jsPDF, rect('F') draws on top if called after text!
      }

      return {
        maxY: Math.max(ly, ry),
        isTwoColumn: true,
        leftEndY: ly,
        rightEndY: ry,
      };
    }

    // =========================================================================
    // HEADER RENDERING FOR THE OTHER 10 TEMPLATES (WITH PHOTO SUPPORT IN ALL!)
    // =========================================================================
    const photoSize = clampVal(15 * spec.scale, 13, 19);
    const headerAvailW = photoAsset ? maxWidth - photoSize - 5 : maxWidth;

    if (templateId === "harvard" || templateId === "finance" || templateId === "col_academic_grid") {
      const headerStartY = y;
      if (photoAsset && !dryRun) {
        pdf.addImage(
          photoAsset.dataUrl,
          "PNG",
          pageWidth - margin - photoSize,
          headerStartY - 0.5,
          photoSize,
          photoSize
        );
      }

      pdf.setFont(fontFam, "bold");
      pdf.setFontSize(nameSize);
      const titleName =
        templateId === "finance"
          ? (resume.candidateName || "CANDIDATE NAME").toUpperCase()
          : resume.candidateName || "Candidate Name";
      if (!dryRun) {
        pdf.setTextColor(15, 23, 42);
        pdf.text(titleName, pageWidth / 2, y + nameSize * 0.25, { align: "center" });
      }
      y += nameSize * 0.48;

      if (resume.targetJobTitle && templateId !== "harvard") {
        pdf.setFont(fontFam, "bold");
        pdf.setFontSize(subtitleSize);
        if (!dryRun) {
          pdf.setTextColor(
            templateId === "col_academic_grid" ? 7 : 51,
            templateId === "col_academic_grid" ? 89 : 65,
            templateId === "col_academic_grid" ? 133 : 85
          );
          pdf.text(resume.targetJobTitle, pageWidth / 2, y, { align: "center" });
        }
        y += subtitleSize * 0.42;
      }

      if (contactParts.length > 0) {
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(contactSize);
        const sep = templateId === "finance" ? "  |  " : "  •  ";
        const cLine = pdf.splitTextToSize(contactParts.join(sep), headerAvailW - 8)[0];
        if (cLine && !dryRun) {
          pdf.setTextColor(71, 85, 105);
          pdf.text(cLine, pageWidth / 2, y, { align: "center" });
        }
        y += contactSize * 0.42;
      }

      if (photoAsset) {
        y = Math.max(y, headerStartY + photoSize + 1.5);
      }

      if (!dryRun) {
        pdf.setDrawColor(15, 23, 42);
        if (templateId === "finance") {
          pdf.setLineWidth(0.5);
          pdf.line(margin, y, pageWidth - margin, y);
          pdf.setLineWidth(0.25);
          pdf.line(margin, y + 0.9, pageWidth - margin, y + 0.9);
        } else {
          pdf.setLineWidth(0.45);
          pdf.line(margin, y, pageWidth - margin, y);
        }
      }
      y += spec.headerBottomGap;
    } else if (templateId === "col_executive_split" || templateId === "healthcare") {
      const isHealth = templateId === "healthcare";
      const accent: [number, number, number] = isHealth ? [15, 118, 110] : [49, 46, 129];
      const headerStartY = y;

      if (!dryRun) {
        pdf.setFont(fontFam, "bold");
        pdf.setFontSize(nameSize);
        pdf.setTextColor(15, 23, 42);
        pdf.text(resume.candidateName || "Candidate Name", margin, y + nameSize * 0.27);

        if (resume.targetJobTitle) {
          pdf.setFont(fontFam, "bold");
          pdf.setFontSize(subtitleSize);
          pdf.setTextColor(accent[0], accent[1], accent[2]);
          pdf.text(
            resume.targetJobTitle.toUpperCase(),
            margin,
            y + nameSize * 0.27 + subtitleSize * 0.5
          );
        }
      }

      const contactRightX = photoAsset ? pageWidth - margin - photoSize - 3.5 : pageWidth - margin;
      let cy = y + 2.5;
      pdf.setFont(fontFam, "normal");
      pdf.setFontSize(contactSize);
      for (const c of contactParts.slice(0, 4)) {
        if (!dryRun) {
          pdf.setTextColor(51, 65, 85);
          pdf.text(c, contactRightX, cy, { align: "right" });
        }
        cy += contactSize * 0.41;
      }

      if (photoAsset && !dryRun) {
        pdf.addImage(
          photoAsset.dataUrl,
          "PNG",
          pageWidth - margin - photoSize,
          headerStartY,
          photoSize,
          photoSize
        );
      }

      y = Math.max(
        headerStartY + nameSize * 0.27 + subtitleSize * 0.65 + 2,
        cy + 1,
        photoAsset ? headerStartY + photoSize + 1.5 : 0
      );
      if (!dryRun) {
        pdf.setDrawColor(accent[0], accent[1], accent[2]);
        pdf.setLineWidth(0.55);
        pdf.line(margin, y, pageWidth - margin, y);
      }
      y += spec.headerBottomGap;
    } else {
      const headerStartY = y;
      const isCompactDual = templateId === "col_compact_dual";
      const titleRGB: [number, number, number] =
        templateId === "col_compact_dual"
          ? [159, 18, 57]
          : templateId === "tech"
          ? [109, 40, 217]
          : templateId === "minimal"
          ? [0, 0, 0]
          : [67, 56, 202];

      let textX = margin;
      if (photoAsset && isCompactDual) {
        if (!dryRun) {
          pdf.addImage(photoAsset.dataUrl, "PNG", margin, headerStartY, photoSize, photoSize);
        }
        textX = margin + photoSize + 3.5;
      } else if (photoAsset && !dryRun) {
        pdf.addImage(
          photoAsset.dataUrl,
          "PNG",
          pageWidth - margin - photoSize,
          headerStartY,
          photoSize,
          photoSize
        );
      }

      pdf.setFont(headerFontFam, "bold");
      pdf.setFontSize(nameSize);
      if (!dryRun) {
        pdf.setTextColor(15, 23, 42);
        pdf.text(
          (resume.candidateName || "CANDIDATE NAME").toUpperCase(),
          textX,
          y + nameSize * 0.27
        );
      }
      y += nameSize * 0.52;

      if (resume.targetJobTitle) {
        pdf.setFont(fontFam, "bold");
        pdf.setFontSize(subtitleSize);
        if (!dryRun) {
          pdf.setTextColor(titleRGB[0], titleRGB[1], titleRGB[2]);
          pdf.text(resume.targetJobTitle, textX, y);
        }
        y += subtitleSize * 0.42;
      }

      if (contactParts.length > 0) {
        pdf.setFont(templateId === "tech" ? "courier" : fontFam, "normal");
        pdf.setFontSize(contactSize);
        const sep =
          templateId === "tech"
            ? " / "
            : templateId === "modern" || isCompactDual
            ? "  |  "
            : "  •  ";
        const cLine = pdf.splitTextToSize(contactParts.join(sep), headerAvailW)[0];
        if (cLine && !dryRun) {
          pdf.setTextColor(
            templateId === "minimal" ? 0 : 71,
            templateId === "minimal" ? 0 : 85,
            templateId === "minimal" ? 0 : 105
          );
          pdf.text(cLine, textX, y);
        }
        y += contactSize * 0.42;
      }

      if (photoAsset) {
        y = Math.max(y, headerStartY + photoSize + 1.5);
      }

      if (!dryRun) {
        const borderRGB: [number, number, number] =
          templateId === "modern"
            ? [79, 70, 229]
            : templateId === "minimal"
            ? [0, 0, 0]
            : [15, 23, 42];
        pdf.setDrawColor(borderRGB[0], borderRGB[1], borderRGB[2]);
        pdf.setLineWidth(templateId === "minimal" ? 0.35 : 0.55);
        pdf.line(margin, y, pageWidth - margin, y);
      }
      y += spec.headerBottomGap;
    }

    // =========================================================================
    // TEMPLATE 1: COMPACT LEFT-SIDEBAR SPLIT RAIL ('two_column')
    // =========================================================================
    if (templateId === "two_column") {
      const leftW = (maxWidth - 6) * 0.33;
      const rightW = maxWidth - 6 - leftW;
      const leftX = margin;
      const rightX = margin + leftW + 6;
      const splitTopY = y;

      // Left Sidebar: Skills, Education, Certifications, Achievements, Soft Skills
      let ly = y;
      let leftFirst = true;
      if (skills.length > 0) {
        ly = drawSectionHeader(
          headings.skills,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = drawSkillBadges(skills, leftX, leftW, ly, spec.leftRhythm, dryRun);
      }
      if (resume.education && resume.education.length > 0) {
        ly = drawSectionHeader(
          headings.education,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderEducationBlock(leftX, leftW, ly, spec.leftRhythm, false, false);
      }
      if (resume.certifications && resume.certifications.length > 0) {
        ly = drawSectionHeader(
          headings.certifications,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderBulletItems(resume.certifications, leftX, leftW, ly, spec.leftRhythm);
      }
      if (achievements.length > 0) {
        ly = drawSectionHeader(
          headings.achievements,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderBulletItems(achievements, leftX, leftW, ly, spec.leftRhythm);
      }

      // Right Main Pane: Summary, Experience, Projects, Dynamic Sections & Soft Skills
      let ry = y;
      let rightFirst = true;
      if (resume.summary) {
        ry = drawSectionHeader(
          headings.summary,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const sl of pdf.splitTextToSize(resume.summary, rightW)) {
          if (!dryRun) {
            pdf.setTextColor(30, 41, 59);
            pdf.text(sl, rightX, ry);
          }
          ry += spec.rightRhythm.lineStep;
        }
      }
      if (resume.experience && resume.experience.length > 0) {
        ry = drawSectionHeader(
          headings.experience,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderExperienceBlock(rightX, rightW, ry, spec.rightRhythm, {
          roleCompanyJoiner: " — ",
          companyColor: [49, 46, 129],
        });
      }
      if (projects.length > 0) {
        ry = drawSectionHeader(
          headings.projects,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderProjectsBlock(rightX, rightW, ry, spec.rightRhythm, [67, 56, 202], false);
      }
      ry = renderDynamicAndSoftSkills(rightX, rightW, ry, spec.rightRhythm);

      if (!dryRun) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(
          margin + leftW + 3,
          splitTopY - 1,
          margin + leftW + 3,
          Math.max(ly, ry, spec.targetBottomY - 2)
        );
      }

      return {
        maxY: Math.max(ly, ry),
        isTwoColumn: true,
        leftEndY: ly,
        rightEndY: ry,
      };
    }

    // =========================================================================
    // TEMPLATE 2: EXECUTIVE ASYMMETRIC RIGHT-RAIL ('col_executive_split')
    // =========================================================================
    if (templateId === "col_executive_split") {
      const leftW = (maxWidth - 6) * 0.66;
      const rightW = maxWidth - 6 - leftW;
      const leftX = margin;
      const rightX = margin + leftW + 6;
      const splitTopY = y;

      // Left Primary Narrative (8 cols)
      let ly = y;
      let leftFirst = true;
      if (resume.summary) {
        ly = drawSectionHeader(
          headings.summary,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [30, 27, 75],
          [199, 210, 254],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const sl of pdf.splitTextToSize(resume.summary, leftW)) {
          if (!dryRun) {
            pdf.setTextColor(30, 41, 59);
            pdf.text(sl, leftX, ly);
          }
          ly += spec.leftRhythm.lineStep;
        }
      }
      if (resume.experience && resume.experience.length > 0) {
        ly = drawSectionHeader(
          headings.experience,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [30, 27, 75],
          [199, 210, 254],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderExperienceBlock(leftX, leftW, ly, spec.leftRhythm, {
          roleCompanyJoiner: " | ",
          companyColor: [71, 85, 105],
          dateColor: [55, 48, 163],
        });
      }
      if (projects.length > 0) {
        ly = drawSectionHeader(
          headings.projects,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [30, 27, 75],
          [199, 210, 254],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderProjectsBlock(leftX, leftW, ly, spec.leftRhythm, [67, 56, 202], false);
      }
      ly = renderDynamicAndSoftSkills(leftX, leftW, ly, spec.leftRhythm, [30, 27, 75], [199, 210, 254]);

      // Right Strategy Rail (4 cols) with rounded slate-50 card for Skills
      let ry = y;
      let rightFirst = true;
      if (skills.length > 0) {
        const innerHeadY = ry + 2.2;
        const innerBadgesStartY = innerHeadY + spec.rightRhythm.sectionGapAfter + 1.2;
        const drySkillsY = drawSkillBadges(
          skills,
          rightX + 2.5,
          rightW - 5,
          innerBadgesStartY,
          spec.rightRhythm,
          true
        );
        const cardH = Math.max(12, drySkillsY - ry + 2.0);
        if (!dryRun) {
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(rightX, ry - 2, rightW, cardH, 2, 2, "FD");
          drawSectionHeader(
            headings.skills,
            rightX + 2.5,
            rightW - 5,
            innerHeadY,
            spec.rightRhythm,
            [30, 27, 75],
            [203, 213, 225],
            false,
            false,
            true
          );
          drawSkillBadges(
            skills,
            rightX + 2.5,
            rightW - 5,
            innerBadgesStartY,
            spec.rightRhythm,
            false
          );
        }
        ry += cardH + 1.5;
        rightFirst = false;
      }
      if (resume.education && resume.education.length > 0) {
        ry = drawSectionHeader(
          headings.education,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [30, 27, 75],
          [199, 210, 254],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderEducationBlock(rightX, rightW, ry, spec.rightRhythm, false, false);
      }
      const creds = [...(resume.certifications || []), ...achievements];
      if (creds.length > 0) {
        ry = drawSectionHeader(
          headings.certifications,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [30, 27, 75],
          [199, 210, 254],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderBulletItems(creds, rightX, rightW, ry, spec.rightRhythm);
      }

      if (!dryRun) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(
          margin + leftW + 3,
          splitTopY - 1,
          margin + leftW + 3,
          Math.max(ly, ry, spec.targetBottomY - 2)
        );
      }

      return {
        maxY: Math.max(ly, ry),
        isTwoColumn: true,
        leftEndY: ly,
        rightEndY: ry,
      };
    }

    // =========================================================================
    // TEMPLATE 5: STRUCTURED CREDENTIALS & RESEARCH GRID ('col_academic_grid')
    // =========================================================================
    if (templateId === "col_academic_grid") {
      if (resume.summary) {
        pdf.setFont(fontFam, "bold");
        pdf.setFontSize(titleSize);
        if (!dryRun) {
          pdf.setTextColor(8, 47, 73);
          pdf.text(headings.summary.toUpperCase(), margin, y);
        }
        y += spec.mainRhythm.sectionGapAfter;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const sl of pdf.splitTextToSize(resume.summary, maxWidth)) {
          if (!dryRun) {
            pdf.setTextColor(30, 41, 59);
            pdf.text(sl, margin, y);
          }
          y += spec.mainRhythm.lineStep;
        }
        y += 0.8;
        if (!dryRun) {
          pdf.setDrawColor(226, 232, 240);
          pdf.line(margin, y, pageWidth - margin, y);
        }
        y += spec.headerBottomGap * 0.85;
      }

      const leftW = (maxWidth - 6) * 0.41;
      const rightW = maxWidth - 6 - leftW;
      const leftX = margin;
      const rightX = margin + leftW + 6;
      const splitTopY = y;

      // Left Column: Education, Skills, Certifications, Achievements
      let ly = y;
      let leftFirst = true;
      if (resume.education && resume.education.length > 0) {
        ly = drawSectionHeader(
          headings.education,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [8, 47, 73],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderEducationBlock(leftX, leftW, ly, spec.leftRhythm, false, true);
      }
      if (skills.length > 0) {
        ly = drawSectionHeader(
          headings.skills,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [8, 47, 73],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = drawSkillBadges(skills, leftX, leftW, ly, spec.leftRhythm, dryRun);
      }
      const creds = [...(resume.certifications || []), ...achievements];
      if (creds.length > 0) {
        ly = drawSectionHeader(
          headings.certifications,
          leftX,
          leftW,
          ly,
          spec.leftRhythm,
          [8, 47, 73],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderBulletItems(creds, leftX, leftW, ly, spec.leftRhythm);
      }

      // Right Column: Experience & Projects
      let ry = y;
      let rightFirst = true;
      if (resume.experience && resume.experience.length > 0) {
        ry = drawSectionHeader(
          headings.experience,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [8, 47, 73],
          [203, 213, 225],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderExperienceBlock(rightX, rightW, ry, spec.rightRhythm, {
          roleCompanyJoiner: " — ",
          companyColor: [15, 23, 42],
        });
      }
      if (projects.length > 0) {
        ry = drawSectionHeader(
          headings.projects,
          rightX,
          rightW,
          ry,
          spec.rightRhythm,
          [8, 47, 73],
          [203, 213, 225],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderProjectsBlock(rightX, rightW, ry, spec.rightRhythm, [7, 89, 133], false);
      }
      ry = renderDynamicAndSoftSkills(rightX, rightW, ry, spec.rightRhythm, [8, 47, 73], [203, 213, 225]);

      if (!dryRun) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(
          margin + leftW + 3,
          splitTopY - 1,
          margin + leftW + 3,
          Math.max(ly, ry, spec.targetBottomY - 2)
        );
      }

      return {
        maxY: Math.max(ly, ry),
        isTwoColumn: true,
        leftEndY: ly,
        rightEndY: ry,
      };
    }

    // =========================================================================
    // TEMPLATE 6: SYMMETRIC 50/50 HIGH-DENSITY DUAL PANE ('col_compact_dual')
    // =========================================================================
    if (templateId === "col_compact_dual") {
      if (resume.summary) {
        const prefix = `${headings.summary.toUpperCase()}: `;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        const sumLines = pdf.splitTextToSize(`${prefix}${resume.summary}`, maxWidth - 5);
        const boxH = sumLines.length * spec.mainRhythm.lineStep + spec.boxPadY;
        if (!dryRun) {
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(margin, y - 1.5, maxWidth, boxH, 1.5, 1.5, "FD");

          let sy = y - 1.5 + spec.boxPadY * 0.52 + bodySize * 0.25;
          for (let i = 0; i < sumLines.length; i++) {
            if (i === 0 && sumLines[0].startsWith(prefix)) {
              pdf.setFont(fontFam, "bold");
              pdf.setTextColor(15, 23, 42);
              pdf.text(prefix, margin + 2.5, sy);
              const pW = pdf.getTextWidth(prefix);
              pdf.setFont(fontFam, "normal");
              pdf.setTextColor(30, 41, 59);
              pdf.text(sumLines[0].slice(prefix.length), margin + 2.5 + pW, sy);
            } else {
              pdf.setFont(fontFam, "normal");
              pdf.setTextColor(30, 41, 59);
              pdf.text(sumLines[i], margin + 2.5, sy);
            }
            sy += spec.mainRhythm.lineStep;
          }
        }
        y += boxH + spec.headerBottomGap * 0.65;
      }

      const colW = (maxWidth - 6) * 0.5;
      const leftX = margin;
      const rightX = margin + colW + 6;
      const splitTopY = y;

      // Column 1: Experience & Education
      let ly = y;
      let leftFirst = true;
      if (resume.experience && resume.experience.length > 0) {
        ly = drawSectionHeader(
          headings.experience,
          leftX,
          colW,
          ly,
          spec.leftRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderExperienceBlock(leftX, colW, ly, spec.leftRhythm, {
          roleCompanyJoiner: " — ",
          companyColor: [15, 23, 42],
        });
      }
      if (resume.education && resume.education.length > 0) {
        ly = drawSectionHeader(
          headings.education,
          leftX,
          colW,
          ly,
          spec.leftRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          leftFirst
        );
        leftFirst = false;
        ly = renderEducationBlock(leftX, colW, ly, spec.leftRhythm, true, false);
      }

      // Column 2: Skills, Projects, Certifications & Honors
      let ry = y;
      let rightFirst = true;
      if (skills.length > 0) {
        ry = drawSectionHeader(
          headings.skills,
          rightX,
          colW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = drawSkillBadges(skills, rightX, colW, ry, spec.rightRhythm, dryRun);
      }
      if (projects.length > 0) {
        ry = drawSectionHeader(
          headings.projects,
          rightX,
          colW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderProjectsBlock(rightX, colW, ry, spec.rightRhythm, [67, 56, 202], false);
      }
      const creds = [...(resume.certifications || []), ...achievements];
      if (creds.length > 0) {
        ry = drawSectionHeader(
          `${headings.certifications} & Honors`,
          rightX,
          colW,
          ry,
          spec.rightRhythm,
          [15, 23, 42],
          [203, 213, 225],
          false,
          false,
          rightFirst
        );
        rightFirst = false;
        ry = renderBulletItems(creds, rightX, colW, ry, spec.rightRhythm);
      }
      ry = renderDynamicAndSoftSkills(rightX, colW, ry, spec.rightRhythm);

      if (!dryRun) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(
          margin + colW + 3,
          splitTopY - 1,
          margin + colW + 3,
          Math.max(ly, ry, spec.targetBottomY - 2)
        );
      }

      return {
        maxY: Math.max(ly, ry),
        isTwoColumn: true,
        leftEndY: ly,
        rightEndY: ry,
      };
    }

    // =========================================================================
    // TEMPLATE 9: SILICON VALLEY TECH ('tech')
    // =========================================================================
    if (templateId === "tech") {
      let isFirst = true;
      if (skills.length > 0) {
        const badgeStartOffset = clampVal(7.2 * spec.scale, 6.0, 10.0);
        const dryEndY = drawSkillBadges(
          skills,
          margin + 3,
          maxWidth - 6,
          y + badgeStartOffset,
          spec.mainRhythm,
          true
        );
        const boxH = Math.max(11, dryEndY - y + spec.boxPadY * 0.55);
        if (!dryRun) {
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(203, 213, 225);
          pdf.roundedRect(margin, y - 1, maxWidth, boxH, 2, 2, "FD");
          pdf.setFont("courier", "bold");
          pdf.setFontSize(metaSize);
          pdf.setTextColor(30, 41, 59);
          pdf.text(
            `// ${headings.skills.toUpperCase()} (JD-PRIORITIZED)`,
            margin + 3,
            y + badgeStartOffset * 0.45
          );
          drawSkillBadges(
            skills,
            margin + 3,
            maxWidth - 6,
            y + badgeStartOffset,
            spec.mainRhythm,
            false
          );
        }
        y += boxH + spec.mainRhythm.sectionGapBefore;
      }

      if (resume.summary) {
        y = drawSectionHeader(
          `01. ${headings.summary}`,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          isFirst
        );
        isFirst = false;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const sl of pdf.splitTextToSize(resume.summary, maxWidth)) {
          if (!dryRun) {
            pdf.setTextColor(30, 41, 59);
            pdf.text(sl, margin, y);
          }
          y += spec.mainRhythm.lineStep;
        }
      }

      if (resume.experience && resume.experience.length > 0) {
        y = drawSectionHeader(
          `02. ${headings.experience}`,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          isFirst
        );
        isFirst = false;
        y = renderExperienceBlock(margin, maxWidth, y, spec.mainRhythm, {
          roleCompanyJoiner: " @ ",
          companyColor: [15, 23, 42],
          monoDates: true,
        });
      }

      if (projects.length > 0) {
        y = drawSectionHeader(
          `03. ${headings.projects}`,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          isFirst
        );
        isFirst = false;
        y = renderProjectsBlock(margin, maxWidth, y, spec.mainRhythm, [109, 40, 217], true);
      }

      if (resume.education && resume.education.length > 0) {
        y = drawSectionHeader(
          `04. ${headings.education}`,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          isFirst
        );
        isFirst = false;
        y = renderEducationBlock(margin, maxWidth, y, spec.mainRhythm, true, false);
      }

      const creds = [...(resume.certifications || []), ...achievements];
      if (creds.length > 0) {
        y = drawSectionHeader(
          `05. ${headings.certifications}`,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [203, 213, 225],
          true,
          false,
          isFirst
        );
        isFirst = false;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const cl of pdf.splitTextToSize(creds.join("  •  "), maxWidth)) {
          if (!dryRun) {
            pdf.setTextColor(30, 41, 59);
            pdf.text(cl, margin, y);
          }
          y += spec.mainRhythm.lineStep;
        }
      }

      y = renderDynamicAndSoftSkills(margin, maxWidth, y, spec.mainRhythm);
      return { maxY: y, isTwoColumn: false, leftEndY: y, rightEndY: y };
    }

    // =========================================================================
    // TEMPLATE 11: WALL STREET & CORPORATE FINANCE ('finance')
    // =========================================================================
    if (templateId === "finance") {
      let isFirst = true;
      if (resume.education && resume.education.length > 0) {
        y = drawSectionHeader(
          headings.education,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [15, 23, 42],
          false,
          false,
          isFirst
        );
        isFirst = false;
        y = renderEducationBlock(margin, maxWidth, y, spec.mainRhythm, true, true);
      }

      if (resume.experience && resume.experience.length > 0) {
        y = drawSectionHeader(
          headings.experience,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [15, 23, 42],
          false,
          false,
          isFirst
        );
        isFirst = false;
        y = renderExperienceBlock(margin, maxWidth, y, spec.mainRhythm, {
          roleCompanyJoiner: " — ",
          companyFirst: true,
          italicSecondary: true,
          companyColor: [15, 23, 42],
          dateColor: [15, 23, 42],
        });
      }

      if (projects.length > 0) {
        y = drawSectionHeader(
          `Selected Transactions & ${headings.projects}`,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [15, 23, 42],
          false,
          false,
          isFirst
        );
        isFirst = false;
        y = renderProjectsBlock(margin, maxWidth, y, spec.mainRhythm, [15, 23, 42], false);
      }

      const creds = [...(resume.certifications || []), ...achievements];
      if (skills.length > 0 || creds.length > 0) {
        y = drawSectionHeader(
          `${headings.skills}, Certifications & Additional Information`,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          [15, 23, 42],
          [15, 23, 42],
          false,
          false,
          isFirst
        );
        isFirst = false;
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        if (skills.length > 0) {
          const sPrefix = "Core Competencies & Skills: ";
          const sLines = pdf.splitTextToSize(`${sPrefix}${skills.join(" • ")}`, maxWidth);
          for (const sl of sLines) {
            if (!dryRun) {
              pdf.setTextColor(15, 23, 42);
              pdf.text(sl, margin, y);
            }
            y += spec.mainRhythm.lineStep;
          }
          y += spec.mainRhythm.bulletGap;
        }
        if (creds.length > 0) {
          for (const cl of pdf.splitTextToSize(
            `Certifications & Honors: ${creds.join(" • ")}`,
            maxWidth
          )) {
            if (!dryRun) {
              pdf.setTextColor(15, 23, 42);
              pdf.text(cl, margin, y);
            }
            y += spec.mainRhythm.lineStep;
          }
        }
      }

      y = renderDynamicAndSoftSkills(margin, maxWidth, y, spec.mainRhythm, [15, 23, 42], [15, 23, 42]);
      return { maxY: y, isTwoColumn: false, leftEndY: y, rightEndY: y };
    }

    // =========================================================================
    // TEMPLATE 12: CLINICAL, OPERATIONS & SPECIALIST ('healthcare')
    // =========================================================================
    if (templateId === "healthcare") {
      const tealDark: [number, number, number] = [19, 78, 74];
      const tealLine: [number, number, number] = [153, 246, 228];

      if (resume.summary) {
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        const sumLines = pdf.splitTextToSize(resume.summary, maxWidth - 6);
        const boxH = sumLines.length * spec.mainRhythm.lineStep + spec.boxPadY;
        if (!dryRun) {
          pdf.setFillColor(240, 253, 250);
          pdf.rect(margin, y - 1.5, maxWidth, boxH, "F");
          pdf.setFillColor(15, 118, 110);
          pdf.rect(margin, y - 1.5, 1.3, boxH, "F");

          let sy = y - 1.5 + spec.boxPadY * 0.52 + bodySize * 0.25;
          pdf.setTextColor(30, 41, 59);
          for (const sl of sumLines) {
            pdf.text(sl, margin + 3.5, sy);
            sy += spec.mainRhythm.lineStep;
          }
        }
        y += boxH + spec.mainRhythm.sectionGapBefore * 0.7;
      }

      // Top 7:5 Grid: Skills (Left 58%) + Certifications & Licensure (Right 42%)
      const leftW = (maxWidth - 6) * 0.58;
      const rightW = maxWidth - 6 - leftW;
      let ly = drawSectionHeader(
        headings.skills,
        margin,
        leftW,
        y,
        spec.mainRhythm,
        tealDark,
        tealLine,
        false,
        false,
        true
      );
      ly = drawSkillBadges(skills, margin, leftW, ly, spec.mainRhythm, dryRun);

      let ry = drawSectionHeader(
        `${headings.certifications} & Licensure`,
        margin + leftW + 6,
        rightW,
        y,
        spec.mainRhythm,
        tealDark,
        tealLine,
        false,
        false,
        true
      );
      const creds = [...(resume.certifications || []), ...achievements];
      if (creds.length > 0) {
        ry = renderBulletItems(creds, margin + leftW + 6, rightW, ry, spec.mainRhythm);
      } else {
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        if (!dryRun) {
          pdf.setTextColor(30, 41, 59);
          pdf.text("Verified professional qualifications", margin + leftW + 6, ry);
        }
        ry += spec.mainRhythm.lineStep;
      }

      y = Math.max(ly, ry);

      if (resume.experience && resume.experience.length > 0) {
        y = drawSectionHeader(
          headings.experience,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          tealDark,
          tealLine
        );
        y = renderExperienceBlock(margin, maxWidth, y, spec.mainRhythm, {
          roleCompanyJoiner: " — ",
          companyColor: [15, 23, 42],
          dateColor: [17, 94, 89],
        });
      }

      if (projects.length > 0) {
        y = drawSectionHeader(
          `${headings.projects} & Initiatives`,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          tealDark,
          tealLine
        );
        y = renderProjectsBlock(margin, maxWidth, y, spec.mainRhythm, [15, 118, 110], false);
      }

      if (resume.education && resume.education.length > 0) {
        y = drawSectionHeader(
          headings.education,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          tealDark,
          tealLine
        );
        y = renderEducationBlock(margin, maxWidth, y, spec.mainRhythm, true, false);
      }

      y = renderDynamicAndSoftSkills(margin, maxWidth, y, spec.mainRhythm, tealDark, tealLine);
      return { maxY: y, isTwoColumn: false, leftEndY: y, rightEndY: y };
    }

    // =========================================================================
    // TEMPLATES 7, 8, 10: HARVARD ('harvard'), MODERN EXECUTIVE ('modern'), MINIMAL ('minimal')
    // =========================================================================
    const isMin = templateId === "minimal";
    const isHarv = templateId === "harvard";
    const hColor: [number, number, number] = isMin ? [0, 0, 0] : [15, 23, 42];
    const lColor: [number, number, number] = isMin || isHarv ? [0, 0, 0] : [226, 232, 240];
    let isFirst = true;

    if (resume.summary) {
      y = drawSectionHeader(
        headings.summary,
        margin,
        maxWidth,
        y,
        spec.mainRhythm,
        hColor,
        lColor,
        false,
        false,
        isFirst
      );
      isFirst = false;
      pdf.setFont(fontFam, "normal");
      pdf.setFontSize(bodySize);
      for (const sl of pdf.splitTextToSize(resume.summary, maxWidth)) {
        if (!dryRun) {
          pdf.setTextColor(isMin ? 0 : 30, isMin ? 0 : 41, isMin ? 0 : 59);
          pdf.text(sl, margin, y);
        }
        y += spec.mainRhythm.lineStep;
      }
    }

    if (skills.length > 0) {
      y = drawSectionHeader(
        headings.skills,
        margin,
        maxWidth,
        y,
        spec.mainRhythm,
        hColor,
        lColor,
        false,
        false,
        isFirst
      );
      isFirst = false;
      if (isMin) {
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const sl of pdf.splitTextToSize(skills.join("  •  "), maxWidth)) {
          if (!dryRun) {
            pdf.setTextColor(0, 0, 0);
            pdf.text(sl, margin, y);
          }
          y += spec.mainRhythm.lineStep;
        }
      } else {
        y = drawSkillBadges(skills, margin, maxWidth, y, spec.mainRhythm, dryRun);
      }
    }

    if (resume.experience && resume.experience.length > 0) {
      y = drawSectionHeader(
        headings.experience,
        margin,
        maxWidth,
        y,
        spec.mainRhythm,
        hColor,
        lColor,
        false,
        false,
        isFirst
      );
      isFirst = false;
      y = renderExperienceBlock(margin, maxWidth, y, spec.mainRhythm, {
        roleCompanyJoiner: isHarv ? " — " : " – ",
        italicSecondary: isHarv,
        companyColor: isMin ? [0, 0, 0] : [15, 23, 42],
        dateColor: isMin ? [0, 0, 0] : [100, 116, 139],
      });
    }

    if (projects.length > 0) {
      y = drawSectionHeader(
        headings.projects,
        margin,
        maxWidth,
        y,
        spec.mainRhythm,
        hColor,
        lColor,
        false,
        false,
        isFirst
      );
      isFirst = false;
      y = renderProjectsBlock(
        margin,
        maxWidth,
        y,
        spec.mainRhythm,
        isMin ? [0, 0, 0] : isHarv ? [30, 41, 59] : [79, 70, 229],
        false
      );
    }

    const creds = [
      ...(resume.certifications || []),
      ...achievements,
      ...(activities || []).map((a: any) =>
        typeof a === "string" ? a : `${a.name}: ${a.description || ""}`
      ),
    ].filter(Boolean);

    if (templateId === "modern" && (resume.education?.length || 0) > 0 && creds.length > 0) {
      const colW = (maxWidth - 6) * 0.5;
      let ly = drawSectionHeader(
        headings.education,
        margin,
        colW,
        y,
        spec.mainRhythm,
        hColor,
        lColor
      );
      ly = renderEducationBlock(margin, colW, ly, spec.mainRhythm, false, false);

      let ry = drawSectionHeader(
        headings.certifications,
        margin + colW + 6,
        colW,
        y,
        spec.mainRhythm,
        hColor,
        lColor
      );
      pdf.setFont(fontFam, "normal");
      pdf.setFontSize(bodySize);
      for (const cl of pdf.splitTextToSize(creds.join(" • "), colW)) {
        if (!dryRun) {
          pdf.setTextColor(51, 65, 85);
          pdf.text(cl, margin + colW + 6, ry);
        }
        ry += spec.mainRhythm.lineStep;
      }
      y = Math.max(ly, ry);
    } else {
      if (resume.education && resume.education.length > 0) {
        y = drawSectionHeader(
          headings.education,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          hColor,
          lColor
        );
        y = renderEducationBlock(margin, maxWidth, y, spec.mainRhythm, true, isHarv);
      }

      if (creds.length > 0) {
        y = drawSectionHeader(
          headings.certifications,
          margin,
          maxWidth,
          y,
          spec.mainRhythm,
          hColor,
          lColor
        );
        pdf.setFont(fontFam, "normal");
        pdf.setFontSize(bodySize);
        for (const cl of pdf.splitTextToSize(creds.join("  •  "), maxWidth)) {
          if (!dryRun) {
            pdf.setTextColor(isMin ? 0 : 30, isMin ? 0 : 41, isMin ? 0 : 59);
            pdf.text(cl, margin, y);
          }
          y += spec.mainRhythm.lineStep;
        }
      }
    }

    y = renderDynamicAndSoftSkills(margin, maxWidth, y, spec.mainRhythm, hColor, lColor);
    return { maxY: y, isTwoColumn: false, leftEndY: y, rightEndY: y };
  };

  // =========================================================================
  // 3-STAGE DYNAMIC A4 PAGE OPTIMIZATION ENGINE
  // Stage 1: Binary search proportional typography & rhythm scale [0.55, 1.50]
  // Stage 2: Binary search vertical rhythm justification so maxY -> targetBottomY
  // Stage 3: For 2-column templates, balance the shorter column's vertical rhythm
  // =========================================================================
  let lowScale = 0.55;
  let highScale = 1.5;
  let bestScale = 0.55;

  for (let iter = 0; iter < 15; iter++) {
    const midScale = (lowScale + highScale) / 2;
    const testSpec = buildPdfLayoutSpec(pageHeight, midScale, 0);
    const res = runRenderPass(testSpec, true);
    if (res.maxY <= testSpec.targetBottomY) {
      bestScale = midScale;
      lowScale = midScale;
    } else {
      highScale = midScale;
    }
  }

  let bestMainExpand = 0;
  const basePass = runRenderPass(buildPdfLayoutSpec(pageHeight, bestScale, 0), true);
  const targetY = buildPdfLayoutSpec(pageHeight, bestScale, 0).targetBottomY;

  if (basePass.maxY < targetY - 0.8) {
    let lowExp = 0;
    let highExp = 1.0;
    for (let iter = 0; iter < 12; iter++) {
      const midExp = (lowExp + highExp) / 2;
      const testSpec = buildPdfLayoutSpec(pageHeight, bestScale, midExp, midExp, midExp);
      const res = runRenderPass(testSpec, true);
      if (res.maxY <= testSpec.targetBottomY) {
        bestMainExpand = midExp;
        lowExp = midExp;
      } else {
        highExp = midExp;
      }
    }
  }

  let bestLeftExpand = bestMainExpand;
  let bestRightExpand = bestMainExpand;

  const afterMainPass = runRenderPass(
    buildPdfLayoutSpec(pageHeight, bestScale, bestMainExpand, bestMainExpand, bestMainExpand),
    true
  );

  if (afterMainPass.isTwoColumn) {
    if (afterMainPass.leftEndY < afterMainPass.rightEndY - 3) {
      let lowL = bestMainExpand;
      let highL = 1.0;
      for (let iter = 0; iter < 10; iter++) {
        const midL = (lowL + highL) / 2;
        const testSpec = buildPdfLayoutSpec(
          pageHeight,
          bestScale,
          bestMainExpand,
          midL,
          bestRightExpand
        );
        const res = runRenderPass(testSpec, true);
        if (res.leftEndY <= testSpec.targetBottomY) {
          bestLeftExpand = midL;
          lowL = midL;
        } else {
          highL = midL;
        }
      }
    } else if (afterMainPass.rightEndY < afterMainPass.leftEndY - 3) {
      let lowR = bestMainExpand;
      let highR = 1.0;
      for (let iter = 0; iter < 10; iter++) {
        const midR = (lowR + highR) / 2;
        const testSpec = buildPdfLayoutSpec(
          pageHeight,
          bestScale,
          bestMainExpand,
          bestLeftExpand,
          midR
        );
        const res = runRenderPass(testSpec, true);
        if (res.rightEndY <= testSpec.targetBottomY) {
          bestRightExpand = midR;
          lowR = midR;
        } else {
          highR = midR;
        }
      }
    }
  }

  const finalSpec = buildPdfLayoutSpec(
    pageHeight,
    bestScale,
    bestMainExpand,
    bestLeftExpand,
    bestRightExpand
  );
  runRenderPass(finalSpec, false);

  const safeName = sanitizeFilename(resume.candidateName || "Candidate");
  pdf.save(`${safeName}_${templateId}_1Page_Resume.pdf`);
}
