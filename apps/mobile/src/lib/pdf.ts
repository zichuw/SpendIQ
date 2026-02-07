function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildSimplePdf(lines: string[]): string {
  const safeLines = lines.length > 0 ? lines : ['Insights report'];
  const textCommands: string[] = [];

  safeLines.forEach((line, index) => {
    const escaped = escapePdfText(line);
    if (index === 0) {
      textCommands.push(`(${escaped}) Tj`);
    } else {
      textCommands.push(`T* (${escaped}) Tj`);
    }
  });

  const streamContent = `BT
/F1 12 Tf
50 760 Td
14 TL
${textCommands.join('\n')}
ET`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });

  const xrefStart = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

  offsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n 
`;
  });

  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefStart}
%%EOF`;

  return pdf;
}
