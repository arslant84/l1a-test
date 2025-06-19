
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TrainingRequest, Employee, ApprovalAction } from './types';
import { format } from 'date-fns';

// Helper function to safely get string value or N/A
const val = (data: any, defaultValue: string = 'N/A'): string => {
  if (data === undefined || data === null || data === '') return defaultValue;
  if (data instanceof Date) return format(data, 'dd MMM yyyy');
  if (typeof data === 'number') return data.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // Format numbers
  return String(data);
};

const currencyVal = (data: any, defaultValue: string = 'N/A'): string => {
  if (data === undefined || data === null) return defaultValue;
  if (typeof data === 'number') return `$${data.toFixed(2)}`;
  return String(data);
}

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
  // const subCol2Width1 = col2Width * 0.4; // Not used from original, but keeping for reference if needed
  // const subCol2Width2 = col2Width * 0.6; // Not used

  drawField('NAME', val(employee?.name), margin, yPos, col1Width, fieldHeight, {labelWidth: col1Width * 0.2});
  drawField('STAFF No.', val(employee?.staffNo), margin + col1Width, yPos, col2Width, fieldHeight, {labelWidth: col2Width * 0.4});
  yPos += fieldHeight;

  drawField('POSITION', val(employee?.position), margin, yPos, col1Width, fieldHeight, {labelWidth: col1Width * 0.2});
  drawField('DEPT/DIV', val(employee?.department), margin + col1Width, yPos, col2Width, fieldHeight, {labelWidth: col2Width * 0.4});
  yPos += fieldHeight;
  
  // These fields are on L1A but not in current Employee model:
  drawField('LOCATION', 'N/A (e.g. Office Ext)', margin, yPos, col1Width, fieldHeight, {labelWidth: col1Width * 0.2}); 
  drawField('H/P No.', 'N/A (e.g. +6012345678)', margin + col1Width, yPos, col2Width, fieldHeight, {labelWidth: col2Width * 0.4}); 
  yPos += fieldHeight;

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('BRIEF CURRENT JOB RESPONSIBILITY:', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  doc.rect(margin, yPos, contentWidth, fieldHeight * 2);
  // Add placeholder text or fetch from a job description if available for employee. For now, empty.
  yPos += fieldHeight * 2;
  
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

  let programLocationText = locationModeDisplayNames[request.mode] || val(request.mode);
  drawField('PROGRAM LOCATION', programLocationText, margin, yPos, contentWidth, fieldHeight, { labelWidth: contentWidth * 0.25 });
  yPos += fieldHeight;

  drawField('TYPE OF PROGRAM', programTypeDisplayNames[request.programType] || val(request.programType), margin, yPos, contentWidth, fieldHeight, { labelWidth: contentWidth * 0.25 });
  yPos += fieldHeight;

  drawField('COURSE CATEGORY', programTypeDisplayNames[request.programType] || val(request.programType) , margin, yPos, contentWidth, fieldHeight, { labelWidth: contentWidth * 0.25 }); // Using programType as proxy
  yPos += fieldHeight;
  
  drawField('COST CENTER', val(request.costCenter), margin, yPos, contentWidth * 0.6, fieldHeight, { labelWidth: contentWidth * 0.25 });
  drawField('COURSE FEE', currencyVal(request.cost), margin + contentWidth * 0.6, yPos, contentWidth * 0.4, fieldHeight, { labelWidth: contentWidth * 0.2});
  yPos += fieldHeight;

  const datesText = `${format(request.startDate, 'dd MMM yyyy')} - ${format(request.endDate, 'dd MMM yyyy')}`;
  drawField('DATES', datesText, margin, yPos, contentWidth * 0.6, fieldHeight, { labelWidth: contentWidth * 0.25 });
  drawField('ESTIMATED LOGISTIC COST', currencyVal(request.estimatedLogisticCost), margin + contentWidth * 0.6, yPos, contentWidth * 0.4, fieldHeight, { labelWidth: contentWidth * 0.2});
  yPos += fieldHeight;

  drawField('TRAINING PROVIDER', val(request.organiser), margin, yPos, contentWidth * 0.6, fieldHeight, { labelWidth: contentWidth * 0.25 });
  drawField('DEP. APPROVED BUDGET', currencyVal(request.departmentApprovedBudget), margin + contentWidth * 0.6, yPos, contentWidth * 0.4, fieldHeight, { labelWidth: contentWidth * 0.2 });
  yPos += fieldHeight;

  drawField('VENUE', val(request.venue), margin, yPos, contentWidth * 0.6, fieldHeight, { labelWidth: contentWidth * 0.25 });
  drawField('DEP. BUDGET BALANCE', currencyVal(request.departmentBudgetBalance), margin + contentWidth * 0.6, yPos, contentWidth * 0.4, fieldHeight, { labelWidth: contentWidth * 0.2 });
  yPos += fieldHeight;

  // --- Section C: Justification for Nomination ---
  yPos = drawSectionTitle("C. JUSTIFICATION FOR NOMINATION", yPos, fieldHeight, "(To be completed by Immediate Superior)");
  
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('IS THIS PROGRAM IDENTIFIED IN STAFF DEVELOPMENT PLAN (eg. ACD ICP, OFA PDP)?', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  doc.rect(margin + contentWidth - 30, yPos, 15, fieldHeight);
  doc.text('YES', margin + contentWidth - 30 + 7.5, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3), {align: 'center'});
  doc.rect(margin + contentWidth - 15, yPos, 15, fieldHeight);
  doc.text('NO', margin + contentWidth - 15 + 7.5, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3), {align: 'center'});
  // TODO: Add logic to check a box based on data if available
  yPos += fieldHeight;
  
  const superiorAction = request.approvalChain.find(a => a.stepRole === 'supervisor');
  const supervisorJustification = superiorAction?.notes || request.justification; // Use supervisor's notes if available for C

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('A. JOB RELEVANCY', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  yPos += fieldHeight;
  doc.rect(margin, yPos, contentWidth, fieldHeight * 1.5); 
  doc.setFontSize(FONT_SIZE_NORMAL);
  const jobRelevancyLines = doc.splitTextToSize("Relates to current role by: " + (superiorJustification || "N/A"), contentWidth - 2 * BOX_PADDING);
  doc.text(jobRelevancyLines, margin + BOX_PADDING, yPos + LINE_HEIGHT * 0.5);
  yPos += fieldHeight * 1.5;

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('B. CAREER DEVELOPMENT', margin + BOX_PADDING, yPos + fieldHeight/2 + (FONT_SIZE_SMALL/3));
  yPos += fieldHeight;
  doc.rect(margin, yPos, contentWidth, fieldHeight * 1.5); 
  doc.setFontSize(FONT_SIZE_NORMAL);
  const careerDevLines = doc.splitTextToSize("Contributes to career dev by: " + (superiorJustification || "N/A"), contentWidth - 2 * BOX_PADDING);
  doc.text(careerDevLines, margin + BOX_PADDING, yPos + LINE_HEIGHT * 0.5);
  yPos += fieldHeight * 1.5;
  
  const superiorName = superiorAction?.userName || (employee?.managerId ? users.find(u => u.id === employee.managerId)?.name : 'N/A');
  const superiorPosition = superiorAction ? (users.find(u => u.id === superiorAction.userId)?.position || 'Supervisor') : (employee?.managerId ? users.find(u => u.id === employee.managerId)?.position : 'N/A');
  const superiorSignDate = superiorAction ? format(superiorAction.date, 'dd MMM yyyy') : 'N/A';


  drawField('NAME:', val(superiorName), margin, yPos, contentWidth * 0.5, fieldHeight, {noBorder: true});
  drawField('POSITION:', val(superiorPosition), margin + contentWidth * 0.5, yPos, contentWidth * 0.3, fieldHeight, {noBorder: true});
  drawField('SIGNATURE:', '', margin + contentWidth * 0.8, yPos, contentWidth * 0.2, fieldHeight, {noBorder: true});
  doc.line(margin + contentWidth * 0.8 + 25 , yPos + fieldHeight -1.5, margin + contentWidth - BOX_PADDING, yPos + fieldHeight-1.5); // Signature line
  yPos += fieldHeight;
  drawField('DATE:', val(superiorSignDate), margin, yPos, contentWidth * 0.5, fieldHeight, {noBorder: true});
  yPos += fieldHeight;


  // --- Section D: Endorsement by Department Head ---
  // Assuming THR acts as Dept Head for endorsement purposes if no specific Dept Head step
  const thrAction = request.approvalChain.find(a => a.stepRole === 'thr');
  const deptHeadName = thrAction?.userName || 'N/A';
  const deptHeadPosition = thrAction ? (users.find(u => u.id === thrAction.userId)?.position || 'THR') : 'N/A';
  const deptHeadSignDate = thrAction ? format(thrAction.date, 'dd MMM yyyy') : 'N/A';
  const deptHeadRemarks = thrAction?.notes || 'N/A';

  yPos = drawSectionTitle("D. ENDORSEMENT BY DEPARTMENT HEAD", yPos);
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('REMARKS:', margin + BOX_PADDING, yPos + LINE_HEIGHT -1);
  doc.rect(margin, yPos, contentWidth, fieldHeight * 2); 
  doc.setFontSize(FONT_SIZE_NORMAL);
  const deptHeadRemarkLines = doc.splitTextToSize(val(deptHeadRemarks), contentWidth - 2 * BOX_PADDING);
  doc.text(deptHeadRemarkLines, margin + BOX_PADDING, yPos + LINE_HEIGHT * 0.5);
  yPos += fieldHeight * 2;

  drawField('NAME:', val(deptHeadName), margin, yPos, contentWidth * 0.5, fieldHeight, {noBorder: true});
  drawField('POSITION:', val(deptHeadPosition), margin + contentWidth * 0.5, yPos, contentWidth * 0.3, fieldHeight, {noBorder: true});
  drawField('SIGNATURE:', '', margin + contentWidth * 0.8, yPos, contentWidth * 0.2, fieldHeight, {noBorder: true});
  doc.line(margin + contentWidth * 0.8 + 25 , yPos + fieldHeight -1.5, margin + contentWidth - BOX_PADDING, yPos + fieldHeight-1.5);
  yPos += fieldHeight;
  drawField('DATE:', val(deptHeadSignDate), margin, yPos, contentWidth * 0.5, fieldHeight, {noBorder: true});
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
  
  const sigYPos = yPos + footerSectionHeight * 0.6;
  const sigLineYPos = sigYPos + 1;
  const posLineYPos = sigYPos + LINE_HEIGHT;
  
  // E. Verification (CM)
  const cmAction = request.approvalChain.find(a => a.stepRole === 'cm' && a.decision === 'processed');
  const cmName = cmAction?.userName || "Shohrat Otuzov"; // Default from form if not processed
  const cmPosition = users.find(u=>u.id === cmAction?.userId)?.position || "Manager, Capability Management";
  const cmDate = cmAction ? format(cmAction.date, 'dd MMM yyyy') : 'N/A';
  
  doc.setFontSize(FONT_SIZE_SMALL -1);
  doc.text('COMPULSORY / RECOMMENDED / NOT RECOMMENDED', margin + BOX_PADDING, yPos + LINE_HEIGHT * 2);
  doc.text('NOTE:', margin + BOX_PADDING, yPos + LINE_HEIGHT * 3);
  doc.text(val(cmAction?.notes), margin + BOX_PADDING + doc.getTextWidth('NOTE:') + 1, yPos + LINE_HEIGHT * 3, {maxWidth: footerColWidth - BOX_PADDING * 2 - doc.getTextWidth('NOTE:') -1});


  doc.text(val(cmName), margin + BOX_PADDING, sigYPos);
  doc.line(margin + BOX_PADDING, sigLineYPos, margin + footerColWidth - BOX_PADDING, sigLineYPos);
  doc.text(val(cmPosition), margin + BOX_PADDING, posLineYPos);
  doc.text(`Date: ${val(cmDate)}`, margin + BOX_PADDING, posLineYPos + LINE_HEIGHT);


  // F. Endorsement (THR)
  // Re-use thrAction from Section D if appropriate, or find the one marking approval
  const thrApprovalAction = request.approvalChain.find(a => a.stepRole === 'thr' && a.decision === 'approved');
  const thrEndorserName = thrApprovalAction?.userName || (thrAction?.decision === 'approved' ? thrAction.userName : 'HEAD THR, PC(T)SB');
  const thrEndorserPos = users.find(u=>u.id === thrApprovalAction?.userId)?.position || (thrAction?.decision === 'approved' ? users.find(u=>u.id === thrAction.userId)?.position || 'THR' : 'THR Manager');
  const thrEndorserDate = thrApprovalAction?.date ? format(thrApprovalAction.date, 'dd MMM yyyy') : (thrAction?.decision === 'approved' ? format(thrAction.date, 'dd MMM yyyy') : 'N/A');

  doc.text('ENDORSED BY:', margin + footerColWidth + BOX_PADDING, yPos + LINE_HEIGHT * 2);
  doc.text(val(thrEndorserName), margin + footerColWidth + BOX_PADDING, sigYPos);
  doc.line(margin + footerColWidth + BOX_PADDING, sigLineYPos, margin + 2*footerColWidth - BOX_PADDING, sigLineYPos);
  doc.text(val(thrEndorserPos), margin + footerColWidth + BOX_PADDING, posLineYPos);
  doc.text(`Date: ${val(thrEndorserDate)}`, margin + footerColWidth + BOX_PADDING, posLineYPos + LINE_HEIGHT);

  // G. Approval (CEO - only for overseas)
  const ceoAction = request.approvalChain.find(a => a.stepRole === 'ceo' && a.decision === 'approved');
  const ceoName = ceoAction?.userName || (request.mode === 'overseas' ? 'CEO, PC(T)SB' : 'N/A (Not Overseas)');
  const ceoPosition = users.find(u=>u.id === ceoAction?.userId)?.position || (request.mode === 'overseas' ? 'CEO' : '');
  const ceoDate = ceoAction ? format(ceoAction.date, 'dd MMM yyyy') : (request.mode === 'overseas' ? 'N/A' : '');

  doc.text('APPROVED BY: (ONLY OVERSEAS)', margin + 2*footerColWidth + BOX_PADDING, yPos + LINE_HEIGHT * 2);
  if (request.mode === 'overseas' || ceoAction) {
    doc.text(val(ceoName), margin + 2*footerColWidth + BOX_PADDING, sigYPos);
    doc.line(margin + 2*footerColWidth + BOX_PADDING, sigLineYPos, margin + 3*footerColWidth - BOX_PADDING, sigLineYPos);
    doc.text(val(ceoPosition), margin + 2*footerColWidth + BOX_PADDING, posLineYPos);
    doc.text(`Date: ${val(ceoDate)}`, margin + 2*footerColWidth + BOX_PADDING, posLineYPos + LINE_HEIGHT);
  } else {
     doc.text('N/A (Not Overseas)', margin + 2*footerColWidth + BOX_PADDING, sigYPos);
  }

  yPos += footerSectionHeight;
  yPos -= LINE_HEIGHT; 

  // Revised Date
  doc.setFontSize(FONT_SIZE_SMALL);
  doc.text('Revised: 02.10.2023', margin, pageHeight - margin + 5 > yPos ? pageHeight - margin + 5 : yPos + 5 );


  doc.save(`L1A_Form_${employee?.name?.replace(/\s/g, '_') || 'Employee'}_${request.id}.pdf`);
};

