import { Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseHtmlToDocxBlocks = async (html: string): Promise<any[]> => {
    if (!html || !html.trim()) return [];

        // Check if we are in browser
    let doc: Document;
    let nodeClass: any;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        doc = document;
        nodeClass = Node;
    } else {
        return []; // Only supported on client side
    }

    const container = doc.createElement("div");
    container.innerHTML = html;

    const blocks: unknown[] = [];

    const detectFormat = (el: HTMLElement): { bold: boolean, italic: boolean, underline: boolean, strike: boolean } => {
        const style = el.getAttribute('style') || '';
        const bold = !!el.querySelector('b, strong') || style.includes('font-weight: bold') || style.includes('font-weight:bold') || el.tagName === 'B' || el.tagName === 'STRONG';
        const italic = !!el.querySelector('i, em') || style.includes('font-style: italic') || style.includes('font-style:italic') || el.tagName === 'I' || el.tagName === 'EM';
        const underline = !!el.querySelector('u') || style.includes('text-decoration: underline') || style.includes('text-decoration:underline') || el.tagName === 'U';
        const strike = !!el.querySelector('s, strike') || style.includes('text-decoration: line-through') || style.includes('text-decoration:line-through') || el.tagName === 'S' || el.tagName === 'STRIKE';
        return { bold, italic, underline, strike };
    };

    const extractTextRuns = (currNode: Node, currentFormat: { bold: boolean, italic: boolean, underline: boolean, strike: boolean }): TextRun[] => {
        const runs: TextRun[] = [];
        if (currNode.nodeType === nodeClass.TEXT_NODE) {
            const text = (currNode.textContent || "").replace(/\\n/g, " "); // Replace newlines with spaces to avoid weird formatting
            if (text.trim().length > 0) {
                runs.push(new TextRun({
                    text,
                    bold: currentFormat.bold,
                    italics: currentFormat.italic,
                    underline: currentFormat.underline ? {} : undefined,
                    strike: currentFormat.strike,
                }));
            } else if (text.length > 0) {
                 // Keep space
                 runs.push(new TextRun({ text: " " }));
            }
        } else if (currNode.nodeType === nodeClass.ELEMENT_NODE) {
            const childEl = currNode as HTMLElement;
            const cTag = childEl.tagName.toLowerCase();
            if (cTag === 'br') {
                runs.push(new TextRun({ break: 1 }));
            } else if (cTag === 'img') {
                // Ignore inline images for TextRuns
            } else {
                const childFormat = detectFormat(childEl);
                const mergedFormat = {
                    bold: currentFormat.bold || childFormat.bold,
                    italic: currentFormat.italic || childFormat.italic,
                    underline: currentFormat.underline || childFormat.underline,
                    strike: currentFormat.strike || childFormat.strike,
                };
                for (const child of Array.from(currNode.childNodes)) {
                    runs.push(...extractTextRuns(child, mergedFormat));
                }
            }
        }
        return runs;
    };

    const processNode = async (node: Node) => {
        if (node.nodeType === nodeClass.TEXT_NODE) {
            const text = (node.textContent || "").trim();
            if (text) {
                blocks.push(new Paragraph({
                    children: [new TextRun({ text })],
                }));
            }
            return;
        }

        if (node.nodeType !== nodeClass.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        // Images
        if (tagName === 'img') {
            const src = el.getAttribute('src');
            if (src) {
                try {
                    let imageBuffer: ArrayBuffer;
                    if (src.startsWith('data:')) {
                        const base64Data = src.split(',')[1];
                        imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
                    } else {
                        const response = await fetch(src);
                        imageBuffer = await response.arrayBuffer();
                    }

                    blocks.push(new Paragraph({
                        children: [
                            new ImageRun({
                                data: imageBuffer,
                                transformation: { width: 500, height: 300 },
                                type: "png" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                            }),
                        ],
                    }));
                } catch (e) {
                    console.error('Failed to load image for docx', e);
                }
            }
            return;
        }

        // Tables
        if (tagName === 'table') {
            const rows: TableRow[] = [];
            const trs = el.querySelectorAll('tr');
            trs.forEach(tr => {
                const cells: TableCell[] = [];
                const tds = tr.querySelectorAll('td, th');
                tds.forEach(td => {
                    const textRuns = extractTextRuns(td, detectFormat(td as HTMLElement));

                    cells.push(new TableCell({
                        children: [new Paragraph({ children: textRuns.length > 0 ? textRuns : [new TextRun("")] })],
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        }
                    }));
                });
                if (cells.length > 0) {
                    rows.push(new TableRow({ children: cells }));
                }
            });
            if (rows.length > 0) {
                blocks.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
            }
            return;
        }

        // Block-level text elements with inline formatting
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'li'].includes(tagName)) {
            // Check if it contains block elements inside. If so, just recurse.
            const hasBlocks = el.querySelector('p, div, h1, h2, h3, h4, h5, h6, table, ul, ol');
            if (hasBlocks && tagName === 'div') {
                for (const child of Array.from(el.childNodes)) {
                    await processNode(child);
                }
                return;
            }

            const children = extractTextRuns(el, detectFormat(el));

            if (children.length > 0) {
                let heading: any = undefined;
                if (tagName === 'h1') heading = HeadingLevel.HEADING_1;
                else if (tagName === 'h2') heading = HeadingLevel.HEADING_2;
                else if (tagName === 'h3') heading = HeadingLevel.HEADING_3;
                else if (tagName === 'h4') heading = HeadingLevel.HEADING_4;
                else if (tagName === 'h5') heading = HeadingLevel.HEADING_5;
                else if (tagName === 'h6') heading = HeadingLevel.HEADING_6;

                blocks.push(new Paragraph({
                    children,
                    heading,
                    bullet: tagName === 'li' ? { level: 0 } : undefined,
                }));
            }
            return;
        }

        // Lists
        if (tagName === 'ul' || tagName === 'ol') {
            for (const child of Array.from(el.childNodes)) {
                await processNode(child);
            }
            return;
        }

        // Other elements — recurse into children
        for (const child of Array.from(node.childNodes)) {
            await processNode(child);
        }
    };

    for (const child of Array.from(container.childNodes)) {
        await processNode(child);
    }

    return blocks;
};
