import { jsPDF } from 'jspdf';

export async function api<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Erro HTTP ${res.status}` }));
    throw new Error(err.error ?? `Erro HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function buildWhatsAppUrl(phoneRaw: string, message: string): string {
  const digits = phoneRaw.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export interface PdfAtendimentoData {
  paciente: string;
  dataHora: string;
  queixas?: string;
  iridologia?: string;
  lingua?: string;
  residuos?: string;
  tratamento?: string;
  procedimentos?: string;
  pontosSistemicos?: string[];
  pontosAuriculares?: string[];
  pontosCranio?: string[];
  pontosKoryo?: string[];
  pontosVentosa?: string[];
  financeiro?: {
    investimento?: number;
    pagamento?: number;
    saldoDia?: number;
    saldoGeral?: number;
  };
}

export function generateAtendimentoPdf(data: PdfAtendimentoData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 18;

  const addTitle = (text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(45, 106, 79);
    doc.text(text, 15, y);
    y += 7;
    doc.setTextColor(31, 42, 36);
  };

  const addSection = (label: string, value?: string) => {
    if (!value || !value.trim()) return;
    if (y > 268) {
      doc.addPage();
      y = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${label}:`, 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value.trim(), 180);
    doc.text(lines, 15, y);
    y += lines.length * 4.8 + 4;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(23, 42, 33);
  doc.text('Acupuntura & Iridologia — Ficha de Atendimento', 15, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Paciente: ${data.paciente}`, 15, y);
  doc.text(`Data: ${data.dataHora}`, 135, y);
  y += 8;
  doc.setDrawColor(210, 220, 212);
  doc.line(15, y, 195, y);
  y += 8;

  addTitle('Avaliação Clínica');
  addSection('Queixas Principais', data.queixas);
  addSection('Iridologia', data.iridologia);
  addSection('Língua', data.lingua);
  addSection('Resíduos', data.residuos);

  addTitle('Protocolo & Pontos Aplicados');
  addSection('Pontos Sistêmicos', data.pontosSistemicos?.join(', '));
  addSection('Pontos Auriculares', data.pontosAuriculares?.join(', '));
  addSection('Pontos YNSA (Crânio)', data.pontosCranio?.join(', '));
  addSection('Pontos Koryo', data.pontosKoryo?.join(', '));
  addSection('Ventosas', data.pontosVentosa?.join(', '));
  addSection('Tratamento / Conduta', data.tratamento);
  addSection('Procedimentos / Orientações', data.procedimentos);

  if (data.financeiro) {
    addTitle('Resumo Financeiro');
    addSection(
      'Valores',
      `Investimento: R$ ${(data.financeiro.investimento ?? 0).toFixed(2)} | Pagamento: R$ ${(data.financeiro.pagamento ?? 0).toFixed(2)} | Saldo Geral: R$ ${(data.financeiro.saldoGeral ?? 0).toFixed(2)}`
    );
  }

  const safeName = data.paciente.replace(/[^a-zA-Z0-9_-]/g, '_') || 'paciente';
  doc.save(`atendimento_${safeName}_${data.dataHora.slice(0, 10)}.pdf`);
}
