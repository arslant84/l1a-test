
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TrainingRequest, Employee, ApprovalAction } from './types';
import { format } from 'date-fns';

// Helper function to safely get string value or N/A
const val = (data: any, defaultValue: string = 'N/A'): string => {
  if (data === undefined || data === null || data === '') return defaultValue;
  if (data instanceof Date) return format(data, 'dd MMM yyyy');
  return String(data);
};

const programTypeDisplayNames: Record<TrainingRequest['programType'], string> = {
  'course': 'Course',
  'conference/seminar/forum': 'Conference/Seminar/Forum',
  'on-the-job attachment': 'On-the-Job Attachment',
  'skg/fsa': 'SKG/FSA',
  'hse': 'HSE',
  'functional': 'Functional',
  'leadership': 'Leadership',
  'specialized': 'Specialized',
  'others': 'Others',
};

const locationModeDisplayNames: Record<TrainingRequest['mode'], string> = {
  'online': 'Online',
  'in-house': 'In-House',
  'local': 'Local (External)',
  'overseas': 'Overseas (External)',
};


export const generateL1APdf = (request: TrainingRequest, employee: Employee | null, users: Employee[]): void => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;
  const FONT_SIZE_NORMAL = 9;
  const FONT_SIZE_SMALL = 7;
  const FONT_SIZE_HEADER = 12;
  const LINE_HEIGHT = 5;
  const BOX_PADDING = 2;

  // Function to draw a bordered text cell (label + value)
  const drawField = (
    label: string,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    options?: { labelWidth?: number; valueAlign?: 'left' | 'right' | 'center'; valueBold?: boolean, labelFontSize?: number, valueFontSize?: number, noBorder?: boolean }
  ) => {
    const labelW = options?.labelWidth || w / 3;
    const valueW = w - labelW;
    const effectiveLabelFontSize = options?.labelFontSize || FONT_SIZE_SMALL;
    const effectiveValueFontSize = options?.valueFontSize || FONT_SIZE_NORMAL;

    if (!options?.noBorder) {
      doc.setDrawColor(150); // Light gray border for fields
      doc.rect(x, y, w, h);
    }

    doc.setFontSize(effectiveLabelFontSize);
    doc.text(label, x + BOX_PADDING, y + h / 2 + (effectiveLabelFontSize / 3) - 0.5); // Adjusted for vertical centering

    doc.setFontSize(effectiveValueFontSize);
    if(options?.valueBold) doc.setFont('helvetica', 'bold');
    doc.text(value, x + labelW + BOX_PADDING, y + h / 2 + (effectiveValueFontSize / 3) - 0.5, { align: options?.valueAlign || 'left', maxWidth: valueW - 2* BOX_PADDING});
    if(options?.valueBold) doc.setFont('helvetica', 'normal');
  };
  
  // Function to draw a section title
  const drawSectionTitle = (title: string, y: number, height: number = 7, subText?: string) => {
    doc.setFillColor(220, 220, 220); // Light gray background for section titles
    doc.rect(margin, y, contentWidth, height, 'F');
    doc.setFontSize(FONT_SIZE_SMALL);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + BOX_PADDING, y + height / 2 + (FONT_SIZE_SMALL / 3));
    if (subText) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(FONT_SIZE_SMALL -1);
        const subTextWidth = doc.getTextWidth(subText);
        doc.text(subText, pageWidth - margin - BOX_PADDING - subTextWidth, y + height / 2 + (FONT_SIZE_SMALL / 3));
    }
    doc.setFont('helvetica', 'normal');
    return y + height;
  };

  // --- Page Header ---
  doc.setFontSize(FONT_SIZE_HEADER);
  doc.setFont('helvetica', 'bold');
  doc.text('TRAINING NOMINATION FORM', pageWidth / 2, yPos, { align: 'center' });
  yPos += LINE_HEIGHT * 1.5;

  doc.setLineWidth(0.5);
  doc.rect(pageWidth - margin - 25, margin - 3, 25, 10); // L1A Box
  doc.setFontSize(FONT_SIZE_HEADER + 2);
  doc.text('L1A', pageWidth - margin - 25 + 12.5, margin - 3 + 6.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');


  // --- Section A: Nominee's Personal Particulars ---
  yPos = drawSectionTitle("A. NOMINEE'S PERSONAL PARTICULARS", yPos);
  
  const fieldHeight = 7;
  const col1Width = contentWidth * 0.6;
  const col2Width = contentWidth * 0.4;
  const subCol2Width1 = col2Width * 0.4;
  const subCol2Width2 = col2Width * 0.6;

  drawField('NAME', val(employee?.name), margin, yPos, col1Width, fieldHeight, {labelWidth: col1Width * 0.2});
  drawField('STAFF No.', val(employee?.staffNo), margin + col1Width, yPos, col2Width, fieldHeight, {labelWidth: col2Width * 0.4});
  yPos += fieldHeight;

  drawField('POSITION', val(employee?.position), margin, yPos, col1Width, fieldHeight, {labelWidth: col1Width * 0.2});
  drawField('DEPT/DIV', val(employee?.department), margin + col1Width, yPos, col2Width, fieldHeight, {labelWidth: col2Width * 0.4});
  yPos += fieldHeight;
  
  drawField('LOCATION', 'N/A', margin, yPos, col1Width, fieldHeight, {labelWidth: col1Width * 0.2}); // Location not in model
  drawField('H/P No.', 'N/A', margin + col1Width, yPos, col2Width, fieldHeight, {labelWidth: col2Width * 0.4}); // H/P No. not in model
  yPos += fieldHeight;

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('BRIEF CURRENT JOB RESPONSIBILITY:', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  doc.rect(margin, yPos, contentWidth, fieldHeight * 2);
  yPos += fieldHeight * 2;
  
  // Emergency Contact - Not in model, drawing structure
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('CONTACT PERSON IN TIME OF EMERGENCY', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  yPos += fieldHeight;
  drawField('NAME:', 'N/A', margin, yPos, col1Width, fieldHeight);
  drawField('Tel (H/p)', 'N/A', margin + col1Width, yPos, col2Width, fieldHeight);
  yPos += fieldHeight;
  drawField('ADDRESS:', 'N/A', margin, yPos, col1Width, fieldHeight);
  drawField('Tel (Home)', 'N/A', margin + col1Width, yPos, col2Width, fieldHeight);
  yPos += fieldHeight;


  // --- Section B: Training Proposal Particulars ---
  yPos = drawSectionTitle("B. TRAINING PROPOSAL PARTICULARS", yPos);
  
  drawField('PROGRAM TITLE', val(request.trainingTitle), margin, yPos, contentWidth, fieldHeight, { labelWidth: contentWidth * 0.25 });
  yPos += fieldHeight;

  // Program Location (Checkboxes in form, text here)
  let programLocationText = '';
  if (request.mode === 'in-house') programLocationText = 'IN-HOUSE';
  else if (request.mode === 'overseas') programLocationText = 'EXTERNAL OVERSEAS';
  else if (request.mode === 'local') programLocationText = 'EXTERNAL LOCAL';
  else if (request.mode === 'online') programLocationText = 'ONLINE'; // Not explicitly a box in form, but a mode

  drawField('PROGRAM LOCATION', programLocationText, margin, yPos, contentWidth, fieldHeight, { labelWidth: contentWidth * 0.25 });
  yPos += fieldHeight;

  // Type of Program (Checkboxes in form, text here)
  drawField('TYPE OF PROGRAM', programTypeDisplayNames[request.programType], margin, yPos, contentWidth, fieldHeight, { labelWidth: contentWidth * 0.25 });
  yPos += fieldHeight;

  // Course Category (Checkboxes in form, text here - using programType as proxy)
  drawField('COURSE CATEGORY', programTypeDisplayNames[request.programType], margin, yPos, contentWidth, fieldHeight, { labelWidth: contentWidth * 0.25 });
  yPos += fieldHeight;
  
  drawField('COST CENTER', 'N/A', margin, yPos, contentWidth * 0.6, fieldHeight, { labelWidth: contentWidth * 0.25 });
  drawField('COURSE FEE', val(request.cost, '$0.00'), margin + contentWidth * 0.6, yPos, contentWidth * 0.4, fieldHeight, { labelWidth: contentWidth * 0.2 });
  yPos += fieldHeight;

  const datesText = `${format(request.startDate, 'dd MMM yyyy')} - ${format(request.endDate, 'dd MMM yyyy')}`;
  drawField('DATES', datesText, margin, yPos, contentWidth * 0.6, fieldHeight, { labelWidth: contentWidth * 0.25 });
  drawField('ESTIMATED LOGISTIC COST', 'N/A', margin + contentWidth * 0.6, yPos, contentWidth * 0.4, fieldHeight, { labelWidth: contentWidth * 0.2});
  yPos += fieldHeight;

  drawField('TRAINING PROVIDER', val(request.organiser), margin, yPos, contentWidth * 0.6, fieldHeight, { labelWidth: contentWidth * 0.25 });
  drawField('DEP. APPROVED BUDGET', 'N/A', margin + contentWidth * 0.6, yPos, contentWidth * 0.4, fieldHeight, { labelWidth: contentWidth * 0.2 });
  yPos += fieldHeight;

  drawField('VENUE', val(request.venue), margin, yPos, contentWidth * 0.6, fieldHeight, { labelWidth: contentWidth * 0.25 });
  drawField('DEP. BUDGET BALANCE', 'N/A', margin + contentWidth * 0.6, yPos, contentWidth * 0.4, fieldHeight, { labelWidth: contentWidth * 0.2 });
  yPos += fieldHeight;

  // --- Section C: Justification for Nomination ---
  yPos = drawSectionTitle("C. JUSTIFICATION FOR NOMINATION", yPos, fieldHeight, "(To be completed by Immediate Superior)");
  
  // Staff Development Plan Y/N - Not in model
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('IS THIS PROGRAM IDENTIFIED IN STAFF DEVELOPMENT PLAN (eg. ACD ICP, OFA PDP)?', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  doc.rect(margin + contentWidth - 30, yPos, 15, fieldHeight);
  doc.text('YES', margin + contentWidth - 30 + 7.5, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3), {align: 'center'});
  doc.rect(margin + contentWidth - 15, yPos, 15, fieldHeight);
  doc.text('NO', margin + contentWidth - 15 + 7.5, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3), {align: 'center'});
  yPos += fieldHeight;
  
  // Job Relevancy / Career Development - Using general justification
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('A. JOB RELEVANCY', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  yPos += fieldHeight;
  doc.rect(margin, yPos, contentWidth, fieldHeight * 1.5); // Placeholder box
  yPos += fieldHeight * 1.5;

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('B. CAREER DEVELOPMENT', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  yPos += fieldHeight;
  doc.rect(margin, yPos, contentWidth, fieldHeight * 1.5); // Placeholder box
  yPos += fieldHeight * 1.5;

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('JUSTIFICATION:', margin + BOX_PADDING, yPos + LINE_HEIGHT -1);
  doc.setFontSize(FONT_SIZE_NORMAL);
  const justificationLines = doc.splitTextToSize(val(request.justification), contentWidth - 2 * BOX_PADDING);
  doc.rect(margin, yPos, contentWidth, fieldHeight * 3.5);
  doc.text(justificationLines, margin + BOX_PADDING, yPos + LINE_HEIGHT);
  yPos += fieldHeight * 3.5;

  const superiorAction = request.approvalChain.find(a => a.stepRole === 'supervisor');
  const superiorName = superiorAction?.userName || (employee?.managerId ? users.find(u => u.id === employee.managerId)?.name : 'N/A');
  const superiorPosition = superiorAction ? (users.find(u => u.id === superiorAction.userId)?.position || 'Supervisor') : (employee?.managerId ? users.find(u => u.id === employee.managerId)?.position : 'N/A');

  drawField('NAME:', val(superiorName), margin, yPos, contentWidth * 0.5, fieldHeight, {noBorder: true});
  drawField('POSITION:', val(superiorPosition), margin + contentWidth * 0.5, yPos, contentWidth * 0.3, fieldHeight, {noBorder: true});
  drawField('SIGNATURE:', '', margin + contentWidth * 0.8, yPos, contentWidth * 0.2, fieldHeight, {noBorder: true});
  doc.line(margin + contentWidth * 0.8 + 25 , yPos + fieldHeight -1, margin + contentWidth - BOX_PADDING, yPos + fieldHeight-1); // Signature line
  yPos += fieldHeight;

  // --- Section D: Endorsement by Department Head ---
  yPos = drawSectionTitle("D. ENDORSEMENT BY DEPARTMENT HEAD", yPos);
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('REMARKS:', margin + BOX_PADDING, yPos + LINE_HEIGHT -1);
  doc.rect(margin, yPos, contentWidth, fieldHeight * 3); // Placeholder for remarks
  yPos += fieldHeight * 3;

  drawField('NAME:', 'N/A', margin, yPos, contentWidth * 0.5, fieldHeight, {noBorder: true});
  drawField('POSITION:', 'N/A', margin + contentWidth * 0.5, yPos, contentWidth * 0.3, fieldHeight, {noBorder: true});
  drawField('SIGNATURE:', '', margin + contentWidth * 0.8, yPos, contentWidth * 0.2, fieldHeight, {noBorder: true});
  doc.line(margin + contentWidth * 0.8 + 25 , yPos + fieldHeight -1, margin + contentWidth - BOX_PADDING, yPos + fieldHeight-1);
  yPos += fieldHeight;

  // --- Footer Sections E, F, G ---
  const footerSectionHeight = 35;
  const footerColWidth = contentWidth / 3;

  doc.rect(margin, yPos, footerColWidth, footerSectionHeight);
  doc.rect(margin + footerColWidth, yPos, footerColWidth, footerSectionHeight);
  doc.rect(margin + 2 * footerColWidth, yPos, footerColWidth, footerSectionHeight);

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setFont('helvetica', 'bold');
  doc.text('E. VERIFICATION', margin + footerColWidth / 2, yPos + LINE_HEIGHT, { align: 'center' });
  doc.text('F. ENDORSEMENT', margin + footerColWidth + footerColWidth / 2, yPos + LINE_HEIGHT, { align: 'center' });
  doc.text('G. APPROVAL', margin + 2 * footerColWidth + footerColWidth / 2, yPos + LINE_HEIGHT, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  yPos += LINE_HEIGHT * 1.5;
  
  doc.setFontSize(FONT_SIZE_SMALL -1);
  doc.text('COMPULSORY / RECOMMENDED / NOT RECOMMENDED', margin + BOX_PADDING, yPos);
  yPos += LINE_HEIGHT * 1.5;
  doc.text('NOTE:', margin + BOX_PADDING, yPos);
  
  const cmAction = request.approvalChain.find(a => a.stepRole === 'cm');
  const cmName = cmAction?.userName || "Shohrat Otuzov"; // Default from form
  const cmPosition = "Manager, Capability Management"; // Default from form

  doc.text(cmName, margin + BOX_PADDING, yPos + footerSectionHeight * 0.6);
  doc.line(margin + BOX_PADDING, yPos + footerSectionHeight * 0.6 + 1, margin + footerColWidth - BOX_PADDING, yPos + footerSectionHeight * 0.6 + 1);
  doc.text(cmPosition, margin + BOX_PADDING, yPos + footerSectionHeight * 0.6 + LINE_HEIGHT);

  // Endorsement section
  const thrAction = request.approvalChain.find(a => a.stepRole === 'thr');
  const thrName = thrAction?.userName || 'HEAD THR, PC(T)SB';
  doc.text('ENDORSED BY:', margin + footerColWidth + BOX_PADDING, yPos - LINE_HEIGHT *0.5);
  doc.text(thrName, margin + footerColWidth + BOX_PADDING, yPos + footerSectionHeight * 0.6);
  doc.line(margin + footerColWidth + BOX_PADDING, yPos + footerSectionHeight * 0.6 + 1, margin + 2*footerColWidth - BOX_PADDING, yPos + footerSectionHeight * 0.6 + 1);
  // doc.text('HEAD THR, PC(T)SB', margin + footerColWidth + BOX_PADDING, yPos + footerSectionHeight * 0.6 + LINE_HEIGHT); // Role already in name

  // Approval section
  const ceoAction = request.approvalChain.find(a => a.stepRole === 'ceo');
  const ceoName = ceoAction?.userName || 'CEO, PC(T)SB';
  doc.text('APPROVED BY: (ONLY OVERSEAS)', margin + 2*footerColWidth + BOX_PADDING, yPos - LINE_HEIGHT*0.5);
  if (request.mode === 'overseas' || ceoAction) {
    doc.text(ceoName, margin + 2*footerColWidth + BOX_PADDING, yPos + footerSectionHeight * 0.6);
    doc.line(margin + 2*footerColWidth + BOX_PADDING, yPos + footerSectionHeight * 0.6 + 1, margin + 3*footerColWidth - BOX_PADDING, yPos + footerSectionHeight * 0.6 + 1);
    // doc.text('CEO, PC(T)SB', margin + 2*footerColWidth + BOX_PADDING, yPos + footerSectionHeight * 0.6 + LINE_HEIGHT); // Role in name
  } else {
     doc.text('N/A (Not Overseas)', margin + 2*footerColWidth + BOX_PADDING, yPos + footerSectionHeight * 0.6);
  }

  yPos += footerSectionHeight;
  yPos -= LINE_HEIGHT; // Adjust for revised date line

  // Revised Date
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('Revised: 02.10.2023', margin, yPos);

  // Trigger download
  doc.save(`L1A_Form_${employee?.name?.replace(/\s/g, '_') || 'Employee'}_${request.id}.pdf`);
};

