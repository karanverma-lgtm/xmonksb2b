import zlib from "node:zlib";

interface DocumentMeta {
  title?: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  author?: string;
  date?: string;
  fileName?: string;
}

/**
 * Lightweight, zero-dependency in-memory ZIP builder for DOCX & PPTX packages
 */
function createZip(files: Array<{ name: string; data: string | Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf-8");
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf-8");
    const crc = zlib.crc32(dataBuf);
    const uncompressedSize = dataBuf.length;

    const compressedData = zlib.deflateRawSync(dataBuf);
    const compressedSize = compressedData.length;

    // Local file header (30 bytes + name length)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8); // Deflate
    localHeader.writeUInt16LE(0x4000, 10);
    localHeader.writeUInt16LE(0x4000, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory header (46 bytes + name length)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0x4000, 12);
    centralHeader.writeUInt16LE(0x4000, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirOffset = offset;
  const centralDirBuffer = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirBuffer.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}

/**
 * Escapes characters for PDF stream strings
 */
function escapePdf(text: string): string {
  return (text || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Generates a valid PDF 1.4 binary file with executive xMonks branding
 */
export function generateSamplePdf(meta: DocumentMeta): Buffer {
  const title = meta.title || meta.fileName || "xMonks Corporate Collateral";
  const desc = meta.description || "Executive coaching, leadership transformation, and enterprise solutions.";
  const author = meta.author || "xMonks Enterprise Team";
  const dateStr = meta.date || "2026";
  const fileName = meta.fileName || "document.pdf";
  const tagsStr = (meta.tags || []).join(" • ");

  const streamLines: string[] = [
    // Top banner background (dark purple)
    "0.18 0.12 0.38 rg",
    "40 735 515 65 re f",

    // Banner Text
    "1 1 1 rg",
    "BT /F2 14 Tf 55 770 Td (XMONKS ENTERPRISE COLLATERAL VAULT) Tj ET",
    "BT /F1 9 Tf 55 750 Td (Cloudflare R2 Storage - Verified Corporate Resource) Tj ET",

    // Document Title
    "0.1 0.12 0.2 rg",
    `BT /F2 16 Tf 40 700 Td (${escapePdf(title.substring(0, 65))}) Tj ET`,

    // Metadata line
    "0.4 0.45 0.55 rg",
    `BT /F1 10 Tf 40 680 Td (File: ${escapePdf(fileName)}   |   Author: ${escapePdf(author)}   |   Date: ${escapePdf(dateStr)}) Tj ET`,

    // Divider
    "0.8 0.82 0.88 RG 1 w 40 665 m 555 665 l S",

    // Section 1: Overview
    "0.18 0.12 0.38 rg",
    "BT /F2 12 Tf 40 640 Td (1. EXECUTIVE SUMMARY & OVERVIEW) Tj ET",
    "0.2 0.22 0.28 rg",
    `BT /F1 10 Tf 40 618 Td (${escapePdf(desc.substring(0, 85))}) Tj ET`,
  ];

  if (desc.length > 85) {
    streamLines.push(
      `BT /F1 10 Tf 40 602 Td (${escapePdf(desc.substring(85, 175))}) Tj ET`
    );
  }
  if (desc.length > 175) {
    streamLines.push(
      `BT /F1 10 Tf 40 586 Td (${escapePdf(desc.substring(175, 260))}) Tj ET`
    );
  }

  // Section 2: Framework
  streamLines.push(
    "0.18 0.12 0.38 rg",
    "BT /F2 12 Tf 40 550 Td (2. STRATEGIC PILLARS & KEY DELIVERABLES) Tj ET",
    "0.25 0.28 0.35 rg",
    "BT /F1 9.5 Tf 40 528 Td (- ICF Accredited Executive Leadership Coaching Framework) Tj ET",
    "BT /F1 9.5 Tf 40 510 Td (- Psychometric Diagnostics, 360-Degree Feedback & Behavioral Benchmarks) Tj ET",
    "BT /F1 9.5 Tf 40 492 Td (- Scalable Cohort Architecture for Fortune 500 Enterprise Deployments) Tj ET",
    "BT /F1 9.5 Tf 40 474 Td (- Data-driven ROI Metrics, Retention Gains & Performance Analytics) Tj ET"
  );

  if (tagsStr) {
    streamLines.push(
      "0.4 0.45 0.55 rg",
      `BT /F1 9 Tf 40 440 Td (Key Tags: ${escapePdf(tagsStr)}) Tj ET`
    );
  }

  // Footer box
  streamLines.push(
    "0.94 0.95 0.97 rg 40 50 515 35 re f",
    "0.45 0.5 0.6 rg",
    "BT /F1 8 Tf 50 72 Td (CONFIDENTIAL - FOR AUTHORIZED ENTERPRISE CLIENT OUTREACH ONLY) Tj ET",
    "BT /F1 8 Tf 50 58 Td (Generated & Verified by xMonks B2B Sales Engine - https://xmonks.com) Tj ET"
  );

  const streamContent = streamLines.join("\n");
  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  const objects: string[] = [
    // 1: Catalog
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    // 2: Pages
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    // 3: Page
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n",
    // 4: Resources
    "4 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >>\nendobj\n",
    // 5: Contents
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdfStr = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdfStr, "utf-8"));
    pdfStr += obj;
  }

  const xrefOffset = Buffer.byteLength(pdfStr, "utf-8");
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += off.toString().padStart(10, "0") + " 00000 n \n";
  }

  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pdfStr += xref;

  return Buffer.from(pdfStr, "utf-8");
}

/**
 * Generates a valid Microsoft Word OpenXML (.docx) document
 */
export function generateSampleDocx(meta: DocumentMeta): Buffer {
  const title = meta.title || "xMonks Enterprise Document";
  const desc = meta.description || "Executive overview and service level agreement.";
  const author = meta.author || "xMonks Corporate";

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="2E1A47"/></w:rPr>
        <w:t>xMonks Enterprise Collateral Vault</w:t>
      </w:r>
    </w:p>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1E293B"/></w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:i/><w:color w:val="64748B"/></w:rPr>
        <w:t>Prepared by: ${escapeXml(author)} | Date: 2026</w:t>
      </w:r>
    </w:p>
    <w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:color w:val="2E1A47"/></w:rPr>
        <w:t>Executive Summary:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:t>${escapeXml(desc)}</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:color w:val="2E1A47"/></w:rPr>
        <w:t>Confidentiality &amp; Governance Notice:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:t>This proprietary corporate material is distributed exclusively for xMonks enterprise client engagements and structured outreach programs.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  return createZip([
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: relsXml },
    { name: "word/document.xml", data: documentXml },
  ]);
}

/**
 * Generates a valid Microsoft PowerPoint OpenXML (.pptx) presentation
 */
export function generateSamplePptx(meta: DocumentMeta): Buffer {
  const title = meta.title || "xMonks Enterprise Presentation";
  const desc = meta.description || "Executive coaching & capability development architecture.";
  const author = meta.author || "xMonks Corporate";

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

  const presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`;

  const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="5143500"/>
</p:presentation>`;

  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="800000" y="1000000"/><a:ext cx="7544000" cy="1200000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="3600" b="1"><a:solidFill><a:srgbClr val="2E1A47"/></a:solidFill></a:rPr>
              <a:t>${escapeXml(title)}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="1800" i="1"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill></a:rPr>
              <a:t>xMonks Executive Deck | Author: ${escapeXml(author)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Subtitle"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="800000" y="2400000"/><a:ext cx="7544000" cy="1800000"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="1600"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr>
              <a:t>${escapeXml(desc)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

  return createZip([
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: relsXml },
    { name: "ppt/_rels/presentation.xml.rels", data: presRelsXml },
    { name: "ppt/presentation.xml", data: presentationXml },
    { name: "ppt/slides/slide1.xml", data: slideXml },
  ]);
}

function escapeXml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Master dispatcher: constructs a valid buffer and MIME type matching the filename extension
 */
export function generateSampleDocument(
  fileName: string,
  meta?: DocumentMeta
): { buffer: Buffer; contentType: string } {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const safeMeta = { fileName, ...meta };

  switch (ext) {
    case "pdf":
      return {
        buffer: generateSamplePdf(safeMeta),
        contentType: "application/pdf",
      };
    case "pptx":
    case "ppt":
      return {
        buffer: generateSamplePptx(safeMeta),
        contentType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };
    case "docx":
    case "doc":
      return {
        buffer: generateSampleDocx(safeMeta),
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    case "csv":
      const csvStr = `Document,Author,Category,Description\n"${meta?.title || fileName}","${meta?.author || "xMonks"}","Enterprise","${meta?.description || ""}"\n`;
      return {
        buffer: Buffer.from(csvStr, "utf-8"),
        contentType: "text/csv; charset=utf-8",
      };
    default:
      return {
        buffer: generateSamplePdf(safeMeta),
        contentType: "application/pdf",
      };
  }
}
