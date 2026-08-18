'use client';

/** Captura a pré-visualização e produz arquivos PDF/PNG no navegador. */

async function safeImport(moduleName: string) {
  try {
    const importFn = new Function('m', 'return import(m)');
    return await importFn(moduleName);
  } catch {
    return null;
  }
}

export async function captureElement(elementId: string) {
  if (typeof window === "undefined") throw new Error("Window not available");
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Element not found");

  const html2canvasModule = await safeImport("html2canvas");
  if (!html2canvasModule) {
    throw new Error("html2canvas not installed");
  }
  const html2canvas = html2canvasModule.default || html2canvasModule;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: 800,
    backgroundColor: "#ffffff",
  });

  return canvas;
}

export async function generatePDF(elementId: string, filename: string) {
  try {
    const jsPDFModule = await safeImport("jspdf");
    const html2canvasModule = await safeImport("html2canvas");

    if (jsPDFModule && html2canvasModule) {
      const canvas = await captureElement(elementId);
      const imgData = canvas.toDataURL("image/png");
      const jsPDF = jsPDFModule.default || jsPDFModule;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pdfWidth) / canvas.width;
      let remainingHeight = imageHeight;
      let y = 0;

      pdf.addImage(imgData, "PNG", 0, y, pdfWidth, imageHeight);
      remainingHeight -= pageHeight;
      while (remainingHeight > 0) {
        y = remainingHeight - imageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, y, pdfWidth, imageHeight);
        remainingHeight -= pageHeight;
      }
      pdf.save(`${filename}.pdf`);
      return true;
    } else {
      // Impressão nativa do navegador para PDF
      window.print();
      return true;
    }
  } catch (error) {
    console.error("Error generating PDF, opening print dialog fallback", error);
    window.print();
    return true;
  }
}

export async function generatePDFBase64(elementId: string) {
  try {
    const canvas = await captureElement(elementId);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    const jsPDFModule = await safeImport("jspdf");
    if (jsPDFModule) {
      const jsPDF = jsPDFModule.default || jsPDFModule;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pdfWidth) / canvas.width;
      let remainingHeight = imageHeight;
      let y = 0;

      pdf.addImage(imageData, "JPEG", 0, y, pdfWidth, imageHeight);
      remainingHeight -= pageHeight;
      while (remainingHeight > 0) {
        y = remainingHeight - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, "JPEG", 0, y, pdfWidth, imageHeight);
        remainingHeight -= pageHeight;
      }
      return pdf.output("datauristring").split(",")[1];
    }
    return imageData.split(",")[1] || "";
  } catch (error) {
    console.error("generatePDFBase64 error", error);
    return "";
  }
}

export async function generatePNG(elementId: string, filename: string) {
  try {
    const canvas = await captureElement(elementId);
    const imgData = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = imgData;
    link.click();
  } catch (error) {
    console.error("Error generating PNG", error);
    alert("Para exportar em imagem, use a opção de Impressão ou Salvar.");
  }
}
