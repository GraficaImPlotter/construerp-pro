
import { Invoice, InvoiceType } from '../types';
import { APP_NAME } from '../constants';

export const printNFSe = (invoice: Invoice) => {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Permita popups para visualizar a nota fiscal.');
    return;
  }

  const totalServicos = invoice.items?.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) || 0;
  const issAliquota = 0.05; // 5% Exemplo
  const valorIss = totalServicos * issAliquota;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>NFS-e Nº ${invoice.number || 'PROVISORIA'}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; border: 1px solid #000; }
        .row { display: flex; border-bottom: 1px solid #000; }
        .col { padding: 8px; border-right: 1px solid #000; flex: 1; }
        .col:last-child { border-right: none; }
        .header { text-align: center; font-weight: bold; background-color: #f0f0f0; padding: 10px; border-bottom: 1px solid #000; }
        .section-title { font-weight: bold; background-color: #e0e0e0; padding: 5px; border-bottom: 1px solid #000; border-top: 1px solid #000; font-size: 11px; }
        .label { font-weight: bold; display: block; font-size: 10px; margin-bottom: 2px; }
        .value { display: block; font-size: 12px; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 0; }
        .items-table th { border: 1px solid #000; padding: 5px; background: #eee; font-size: 11px; }
        .items-table td { border: 1px solid #000; padding: 5px; font-size: 11px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .watermark { position: fixed; top: 40%; left: 20%; font-size: 100px; color: rgba(0,0,0,0.1); transform: rotate(-45deg); z-index: -1; }
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${invoice.status !== 'authorized' ? '<div class="watermark">SEM VALOR FISCAL</div>' : ''}
      
      <div class="no-print" style="margin-bottom: 20px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">🖨️ Imprimir / Salvar PDF</button>
      </div>

      <div class="container">
        <div class="header">
          PREFEITURA MUNICIPAL - SECRETARIA DE FAZENDA<br/>
          NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e
        </div>

        <div class="row">
          <div class="col">
            <span class="label">NÚMERO DA NOTA</span>
            <span class="value" style="font-size: 16px; font-weight: bold;">${invoice.number || '---'}</span>
          </div>
          <div class="col">
            <span class="label">DATA E HORA DE EMISSÃO</span>
            <span class="value">${invoice.issued_at || new Date().toLocaleString('pt-BR')}</span>
          </div>
          <div class="col">
            <span class="label">CÓDIGO DE VERIFICAÇÃO</span>
            <span class="value">${Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
          </div>
        </div>

        <div class="section-title">PRESTADOR DE SERVIÇOS</div>
        <div class="row">
          <div class="col" style="flex: 2;">
            <span class="label">RAZÃO SOCIAL</span>
            <span class="value">CONSTRUTORA MODELO LTDA (Sua Empresa)</span>
            <span class="label" style="margin-top: 5px;">ENDEREÇO</span>
            <span class="value">Av. das Construções, 1000 - Centro Industrial</span>
          </div>
          <div class="col">
            <span class="label">CNPJ</span>
            <span class="value">12.345.678/0001-90</span>
            <span class="label" style="margin-top: 5px;">INSCRIÇÃO MUNICIPAL</span>
            <span class="value">456789</span>
          </div>
        </div>

        <div class="section-title">TOMADOR DE SERVIÇOS</div>
        <div class="row">
          <div class="col" style="flex: 2;">
            <span class="label">NOME / RAZÃO SOCIAL</span>
            <span class="value">${invoice.customer_name}</span>
            <span class="label" style="margin-top: 5px;">ENDEREÇO</span>
            <span class="value">Verificar cadastro do cliente</span>
          </div>
          <div class="col">
            <span class="label">CPF / CNPJ</span>
            <span class="value">${invoice.customer_document}</span>
            <span class="label" style="margin-top: 5px;">EMAIL</span>
            <span class="value">cliente@email.com</span>
          </div>
        </div>

        <div class="section-title">DISCRIMINAÇÃO DOS SERVIÇOS</div>
        <div style="padding: 10px; min-height: 150px; border-bottom: 1px solid #000;">
          <table class="items-table">
            <thead>
              <tr>
                <th>DESCRIÇÃO</th>
                <th>CÓDIGO (LC 116)</th>
                <th>QTD</th>
                <th>VALOR UNIT.</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td class="text-center">${item.service_code || '-'}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">R$ ${item.unit_price.toFixed(2)}</td>
                  <td class="text-right">R$ ${(item.quantity * item.unit_price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <br/>
          <p style="font-size: 11px;">Observações: Documento emitido por ME ou EPP optante pelo Simples Nacional.</p>
        </div>

        <div class="section-title">VALORES E IMPOSTOS</div>
        <div class="row">
          <div class="col text-right"><span class="label">VALOR SERVIÇOS</span><span class="value">R$ ${totalServicos.toFixed(2)}</span></div>
          <div class="col text-right"><span class="label">DEDUÇÕES</span><span class="value">R$ 0,00</span></div>
          <div class="col text-right"><span class="label">BASE DE CÁLCULO</span><span class="value">R$ ${totalServicos.toFixed(2)}</span></div>
          <div class="col text-right"><span class="label">ALÍQUOTA</span><span class="value">${(issAliquota * 100)}%</span></div>
          <div class="col text-right"><span class="label">VALOR ISS</span><span class="value">R$ ${valorIss.toFixed(2)}</span></div>
        </div>
        <div class="row" style="background-color: #ddd;">
           <div class="col text-right" style="border:none;">
             <span class="label" style="font-size: 12px;">VALOR LÍQUIDO DA NOTA</span>
             <span class="value" style="font-size: 16px; font-weight: bold;">R$ ${totalServicos.toFixed(2)}</span>
           </div>
        </div>

        <div style="padding: 10px; text-align: center; font-size: 10px;">
          Sistema ERP: ${APP_NAME} - Tecnologia de Emissão
        </div>
      </div>
    </body>
    </html>
  `;

  w.document.write(html);
  w.document.close();
};
