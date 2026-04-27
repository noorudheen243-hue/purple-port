import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    Table, 
    TableRow, 
    TableCell, 
    WidthType, 
    VerticalAlign, 
    HeadingLevel,
    AlignmentType,
    HeightRule,
    BorderStyle
} from 'docx';
import { saveAs } from 'file-saver';

// Extend jsPDF to include autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

const STRATEGY_STRUCTURE: any = {
    PRIMARY_DATA: {
        identity: ["industry", "business_age"],
        offerings: ["services_json", "usp", "revenue_model"],
        market_scope: ["location", "competitor_urls"]
    },
    DIGITAL_PRESENCE: {
        infrastructure: ["website_url", "hosting", "cms"],
        social_channels: ["facebook", "instagram", "linkedin", "twitter", "tiktok", "youtube"],
        advertising: ["fb_ad_account", "google_ad_account", "pixel_status"],
        analytics: ["ga4_status", "gtm_status"]
    },
    MARKET: {
        positioning: ["positioning_statement", "brand_voice", "tone"],
        competition: ["market_gap", "competitor_strengths", "competitor_weaknesses"],
        demand: ["market_trends", "search_volume"]
    },
    ICA: {
        demographics: ["primary_persona", "age_range", "gender", "income_level", "location"],
        psychographics: ["pain_points", "motivations", "goals"],
        behaviour: ["digital_habits", "search_intent"]
    },
    GOALS: {
        kpis: ["revenue_target", "lead_quantity", "conversion_goal", "roi_expectation"],
        operational: ["timeline", "monthly_budget", "launch_date"]
    }
};

const formatKey = (key: string) => key.replace(/_/g, ' ').toUpperCase();

export const exportDataSheetToPDF = (strategyName: string, data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFillColor(44, 24, 90);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('STRATEGY DATA SHEET', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Strategy: ${strategyName}`, 15, 30);
    doc.text(`Exported: ${new Date().toLocaleString()}`, pageWidth - 15, 30, { align: 'right' });

    let currentY = 50;

    const sections = [
        { key: 'PRIMARY_DATA', label: '01. PRIMARY BUSINESS DATA' },
        { key: 'DIGITAL_PRESENCE', label: '02. DIGITAL PRESENCE' },
        { key: 'MARKET', label: '03. MARKET INTELLIGENCE' },
        { key: 'ICA', label: '04. IDEAL CUSTOMER AVATAR' },
        { key: 'GOALS', label: '05. STRATEGIC GOALS' }
    ];

    sections.forEach(section => {
        const sectionData = data[section.key] || {};
        const structure = STRATEGY_STRUCTURE[section.key];

        // Main Section Title
        doc.setFillColor(240, 242, 255);
        doc.rect(15, currentY, pageWidth - 30, 10, 'F');
        doc.setTextColor(44, 24, 90);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(section.label, 20, currentY + 7);
        currentY += 15;

        Object.entries(structure).forEach(([subLabel, keys]: [string, any]) => {
            // Sub-section Header
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(10);
            doc.text(subLabel.replace(/_/g, ' ').toUpperCase(), 15, currentY);
            currentY += 5;

            const rows: any[][] = [];
            keys.forEach((key: string) => {
                let val = sectionData[key];
                if (val === undefined || val === null || val === '' || val === '[]' || val === '{}') {
                    val = '[NOT PROVIDED]';
                } else if (typeof val === 'object') {
                    val = JSON.stringify(val, null, 2);
                }
                rows.push([formatKey(key), val]);
            });

            doc.autoTable({
                startY: currentY,
                head: [['Field', 'Value']],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [44, 24, 90], fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', width: 50 } },
                margin: { left: 15, right: 15 }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
            if (currentY > 260) {
                doc.addPage();
                currentY = 20;
            }
        });

        currentY += 5;
    });

    doc.save(`${strategyName.replace(/\s+/g, '_')}_DataSheet.pdf`);
};

// DOCX Generation Helper
const createSectionTitle = (text: string, size = 28) => {
    return new Paragraph({
        children: [
            new TextRun({ text, bold: true, color: "2c185a", size, underline: {} }),
        ],
        spacing: { before: 400, after: 200 },
    });
};

const createDataTable = (headers: string[], rows: any[][]) => {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: headers.map(h => new TableCell({
                    shading: { fill: "f3f4f6" },
                    children: [new Paragraph({ 
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: h, bold: true, color: "2c185a", size: 18 })] 
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                })),
            }),
            ...rows.map(row => new TableRow({
                height: { value: 500, rule: HeightRule.ATLEAST },
                children: row.map(cell => new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({ text: String(cell), size: 16 })]
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    margins: { top: 80, bottom: 80, left: 80, right: 80 }
                })),
            }))
        ],
    });
};

export const exportDataSheetToDOCX = async (strategyName: string, data: any) => {
    const docChildren: any[] = [
        new Paragraph({
            text: "STRATEGY DATA SHEET - " + strategyName.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: `Generated on: ${new Date().toLocaleString()}`, italics: true, color: "666666" }),
            ],
            spacing: { after: 400 },
        }),
    ];

    const sections = [
        { key: 'PRIMARY_DATA', label: '1. PRIMARY BUSINESS DATA' },
        { key: 'DIGITAL_PRESENCE', label: '2. DIGITAL PRESENCE' },
        { key: 'MARKET', label: '3. MARKET INTELLIGENCE' },
        { key: 'ICA', label: '4. IDEAL CUSTOMER AVATAR' },
        { key: 'GOALS', label: '5. STRATEGIC GOALS' }
    ];

    sections.forEach(section => {
        const sectionData = data[section.key] || {};
        const structure = STRATEGY_STRUCTURE[section.key];

        docChildren.push(createSectionTitle(section.label, 32));

        Object.entries(structure).forEach(([subLabel, keys]: [string, any]) => {
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: subLabel.replace(/_/g, ' ').toUpperCase(), bold: true, color: "555555", size: 22 })],
                spacing: { before: 200, after: 100 }
            }));

            const rows: string[][] = keys.map((key: string) => {
                let val = sectionData[key];
                if (val === undefined || val === null || val === '' || val === '[]' || val === '{}') {
                    val = '[NOT PROVIDED]';
                } else if (typeof val === 'object') {
                    val = JSON.stringify(val, null, 2);
                }
                return [formatKey(key), String(val)];
            });

            docChildren.push(createDataTable(["Field", "Value"], rows));
        });
    });

    const doc = new Document({
        sections: [{ properties: {}, children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${strategyName.replace(/\s+/g, '_')}_DataSheet.docx`);
};

export const exportStrategyTemplateDOCX = async () => {
    const docChildren: any[] = [
        new Paragraph({
            text: "STRATEGY DATA COLLECTION SHEET (TEMPLATE)",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "Use this document to manually collect business data from the client.", italics: true, color: "666666" }),
            ],
            spacing: { after: 400 },
        }),
    ];

    const sections = [
        { key: 'PRIMARY_DATA', label: '1. PRIMARY BUSINESS DATA' },
        { key: 'DIGITAL_PRESENCE', label: '2. DIGITAL PRESENCE' },
        { key: 'MARKET', label: '3. MARKET INTELLIGENCE' },
        { key: 'ICA', label: '4. IDEAL CUSTOMER AVATAR' },
        { key: 'GOALS', label: '5. STRATEGIC GOALS' }
    ];

    sections.forEach(section => {
        const structure = STRATEGY_STRUCTURE[section.key];
        docChildren.push(createSectionTitle(section.label, 32));

        Object.entries(structure).forEach(([subLabel, keys]: [string, any]) => {
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: subLabel.replace(/_/g, ' ').toUpperCase(), bold: true, color: "555555", size: 22 })],
                spacing: { before: 200, after: 100 }
            }));

            const rows: string[][] = keys.map((key: string) => [formatKey(key), ""]);
            docChildren.push(createDataTable(["Field / Parameter", "Information / Values"], rows));
        });
    });

    const doc = new Document({
        sections: [{ properties: {}, children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Strategy_Manual_Collection_Template.docx");
};
