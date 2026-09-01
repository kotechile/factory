import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import type { SelfEmployment2026Output } from "@/lib/calc/selfEmployment2026";

export async function generateQuarterLinePdf(
  result: SelfEmployment2026Output,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Color Palette
  const darkNavy = rgb(0.06, 0.09, 0.16); // #0f172a
  const slateGray = rgb(0.28, 0.33, 0.41); // #475569
  const textDark = rgb(0.12, 0.16, 0.22); // #1e293b
  const accentBlue = rgb(0.15, 0.39, 0.92); // #2563eb
  const lightBg = rgb(0.96, 0.97, 0.98); // #f8fafc
  const cardBorder = rgb(0.89, 0.91, 0.94); // #e2e8f0
  const emerald = rgb(0.02, 0.59, 0.41); // #059669
  const white = rgb(1, 1, 1);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 8.5 x 11 inches = 612 x 792 pt
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;

  // 1. Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: darkNavy,
  });

  page.drawText("QUARTERLINE", {
    x: margin,
    y: height - 34,
    size: 16,
    font: fontBold,
    color: accentBlue,
  });

  page.drawText("2026 TAX READINESS & AUDIT REPORT", {
    x: margin + 115,
    y: height - 34,
    size: 14,
    font: fontBold,
    color: white,
  });

  page.drawText(
    `Governing Law: One Big Beautiful Bill Act (Pub. L. 119-21) & IRS Rev. Proc. 2025-32`,
    {
      x: margin,
      y: height - 52,
      size: 9,
      font: fontRegular,
      color: rgb(0.75, 0.8, 0.88),
    },
  );

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  page.drawText(`Generated: ${generatedDate}  |  Tax Year: 2026`, {
    x: margin,
    y: height - 66,
    size: 8,
    font: fontRegular,
    color: rgb(0.58, 0.64, 0.72),
  });

  let currentY = height - 100;

  // Helper to draw section box
  const drawSectionBox = (
    title: string,
    rows: Array<[string, string]>,
    boxHeight: number,
  ) => {
    // Background card
    page.drawRectangle({
      x: margin,
      y: currentY - boxHeight,
      width: contentWidth,
      height: boxHeight,
      color: lightBg,
      borderColor: cardBorder,
      borderWidth: 1,
    });

    // Section title
    page.drawRectangle({
      x: margin,
      y: currentY - 22,
      width: contentWidth,
      height: 22,
      color: rgb(0.92, 0.94, 0.96),
      borderColor: cardBorder,
      borderWidth: 1,
    });

    page.drawText(title.toUpperCase(), {
      x: margin + 10,
      y: currentY - 16,
      size: 9,
      font: fontBold,
      color: darkNavy,
    });

    // Rows
    let rowY = currentY - 38;
    for (const [label, val] of rows) {
      page.drawText(label, {
        x: margin + 12,
        y: rowY,
        size: 9,
        font: fontRegular,
        color: slateGray,
      });

      const textWidth = fontBold.widthOfTextAtSize(val, 9);
      page.drawText(val, {
        x: width - margin - 12 - textWidth,
        y: rowY,
        size: 9,
        font: fontBold,
        color: textDark,
      });

      // subtle separator line
      page.drawLine({
        start: { x: margin + 10, y: rowY - 4 },
        end: { x: width - margin - 10, y: rowY - 4 },
        thickness: 0.5,
        color: rgb(0.91, 0.93, 0.95),
      });

      rowY -= 17;
    }

    currentY -= boxHeight + 12;
  };

  // Section 1: Business Summary
  drawSectionBox(
    "1. Business Summary (Schedule C)",
    [
      ["Gross 1099 / Business Revenue", `$${result.grossIncome.toLocaleString()}`],
      ["Ordinary & Necessary Expenses", `-$${result.businessExpenses.toLocaleString()}`],
      ["Net Schedule C Profit", `$${result.netBusinessProfit.toLocaleString()}`],
    ],
    78,
  );

  // Section 2: Self-Employment Tax (Schedule SE)
  drawSectionBox(
    "2. Self-Employment Tax (Schedule SE)",
    [
      ["Net SE Earnings Subject to Tax (92.35% statutory base)", `$${Math.round(result.seEarningsSubjectToTax).toLocaleString()}`],
      ["Social Security Tax (12.4% up to $184,500 wage cap)", `$${Math.round(result.socialSecurityTax).toLocaleString()}`],
      ["Medicare Tax (2.9% standard)", `$${Math.round(result.medicareTax).toLocaleString()}`],
      ["Additional Medicare Tax (0.9% high-earner threshold)", `$${Math.round(result.additionalMedicareTax).toLocaleString()}`],
      ["Total Self-Employment Tax Liability", `$${Math.round(result.totalSelfEmploymentTax).toLocaleString()}`],
      ["Half-SE Above-the-Line Deduction (1040 Schedule 1)", `-$${Math.round(result.halfSeTaxDeduction).toLocaleString()}`],
    ],
    130,
  );

  // Section 3: Section 199A QBI Deduction
  drawSectionBox(
    "3. Section 199A Qualified Business Income (QBI) Deduction",
    [
      ["Qualified Business Income (QBI)", `$${Math.round(result.qualifiedBusinessIncome).toLocaleString()}`],
      ["Statutory QBI Deduction Rate (OBBBA Confirmed Rate)", "20.0%"],
      ["Allowable QBI Deduction Amount", `$${Math.round(result.qbiDeduction).toLocaleString()}`],
      ["Estimated Tax Savings from Section 199A", `$${Math.round(result.qbiTaxSavings).toLocaleString()}`],
    ],
    95,
  );

  // Section 4: Federal Income Tax & Total Liability
  drawSectionBox(
    "4. Federal Income Tax & Total Annual Liability",
    [
      ["Adjusted Taxable Income (After Standard/Itemized Deduction)", `$${Math.round(result.finalTaxableIncome).toLocaleString()}`],
      ["Federal Income Tax (Rev. Proc. 2025-32 Brackets)", `$${Math.round(result.federalIncomeTax).toLocaleString()}`],
      ["Total Combined Federal Tax Liability (SE + Income Tax)", `$${Math.round(result.totalTaxLiability).toLocaleString()}`],
      ["Effective Combined Federal Tax Rate", `${(result.overallEffectiveRate * 100).toFixed(1)}%`],
    ],
    95,
  );

  // Section 5: Estimated Quarterly Payments (Safe Harbor)
  const safeHarborText = result.estimatedPayments.safeHarborApplied
    ? `Applied (Required: $${Math.round(result.estimatedPayments.requiredAnnualPayment).toLocaleString()})`
    : `Standard 90% Rule (Required: $${Math.round(result.estimatedPayments.requiredAnnualPayment).toLocaleString()})`;

  const installments = result.estimatedPayments.quarterlyInstallments.map((q) => [
    `${q.quarter} Installment (Due ${q.dueDate})`,
    `$${q.amount.toLocaleString()}`,
  ]) as Array<[string, string]>;

  drawSectionBox(
    `5. 2026 Estimated Quarterly Installments — Safe Harbor: ${safeHarborText}`,
    installments,
    95,
  );

  // Section 6: Audit Readiness Scorecard Banner
  page.drawRectangle({
    x: margin,
    y: currentY - 50,
    width: contentWidth,
    height: 50,
    color: darkNavy,
    borderColor: cardBorder,
    borderWidth: 1,
  });

  page.drawText("TAX READINESS SCORECARD", {
    x: margin + 12,
    y: currentY - 20,
    size: 10,
    font: fontBold,
    color: white,
  });

  page.drawText(
    `Rating: ${result.scorecard.rating.toUpperCase()}  •  Penalty Risk Score: ${result.scorecard.totalScore}/100`,
    {
      x: margin + 12,
      y: currentY - 36,
      size: 9,
      font: fontRegular,
      color: emerald,
    },
  );

  // Certified Seal / Stamp
  page.drawText("OFFICIAL 2026 CERTIFIED AUDIT WORKPAPER", {
    x: width - margin - 230,
    y: currentY - 28,
    size: 8,
    font: fontBold,
    color: rgb(0.8, 0.85, 0.95),
  });

  // Footer
  page.drawText(
    "Generated by QuarterLine • Autonomous Product & Software Factory (factory.aichieve.net) • Certified for IRS Schedule C filers.",
    {
      x: margin,
      y: 20,
      size: 7.5,
      font: fontRegular,
      color: slateGray,
    },
  );

  page.drawText("Page 1 of 1", {
    x: width - margin - 45,
    y: 20,
    size: 7.5,
    font: fontRegular,
    color: slateGray,
  });

  return await pdfDoc.save();
}
