const { XMLParser } = require('fast-xml-parser');
const { PDFParse } = require('pdf-parse');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const raw = String(value).trim();
  const normalized = raw.includes(',')
    ? raw.includes('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value, scale = 2) => {
  const factor = 10 ** scale;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const getNested = (source, paths) => {
  for (const path of paths) {
    let current = source;
    let found = true;
    for (const segment of path) {
      current = current?.[segment];
      if (current === undefined) {
        found = false;
        break;
      }
    }
    if (found && current !== undefined) return current;
  }
  return undefined;
};

const getInfNFe = (parsed) => getNested(parsed, [
  ['nfeProc', 'NFe', 'infNFe'],
  ['NFe', 'infNFe'],
  ['procNFe', 'NFe', 'infNFe'],
  ['enviNFe', 'NFe', 'infNFe'],
  ['enviNFe', 'lote', 'NFe', 'infNFe'],
]);

const distribuirDiferenca = (items, totalNota) => {
  const totalBase = round(items.reduce((acc, item) => acc + item.total_base, 0));
  const diferenca = round(totalNota - totalBase);
  if (Math.abs(diferenca) < 0.01 || items.length === 0) {
    return items.map((item) => ({
      ...item,
      valor_rateio: 0,
      valor_total_final: round(item.total_base),
      valor_unitario_final: item.quantidade > 0 ? round(item.total_base / item.quantidade, 6) : round(item.valor_unitario_original, 6),
    }));
  }

  const somaPesos = items.reduce((acc, item) => acc + (item.total_base > 0 ? item.total_base : 0), 0);
  let rateioAcumulado = 0;

  return items.map((item, index) => {
    const ultimo = index === items.length - 1;
    const peso = somaPesos > 0 ? item.total_base / somaPesos : 1 / items.length;
    const rateio = ultimo
      ? round(diferenca - rateioAcumulado)
      : round(diferenca * peso);

    rateioAcumulado = round(rateioAcumulado + rateio);
    const totalFinal = round(item.total_base + rateio);

    return {
      ...item,
      valor_rateio: rateio,
      valor_total_final: totalFinal,
      valor_unitario_final: item.quantidade > 0 ? round(totalFinal / item.quantidade, 6) : round(item.valor_unitario_original, 6),
    };
  });
};

const parseNfeXml = (xmlContent) => {
  const parsed = xmlParser.parse(xmlContent.replace(/^\uFEFF/, ''));
  const infNFe = getInfNFe(parsed);

  if (!infNFe) {
    throw new Error('Estrutura de XML de NF-e não reconhecida.');
  }

  const emit = infNFe.emit || {};
  const ide = infNFe.ide || {};
  const totals = infNFe.total?.ICMSTot || {};
  const det = ensureArray(infNFe.det);

  const itemsBase = det.map((item, index) => {
    const prod = item?.prod || {};
    const ipi = toNumber(item?.imposto?.IPI?.IPITrib?.vIPI || item?.imposto?.IPI?.IPINT?.vIPI);
    const frete = toNumber(prod.vFrete);
    const seguro = toNumber(prod.vSeg);
    const desconto = toNumber(prod.vDesc);
    const outros = toNumber(prod.vOutro);
    const subtotal = toNumber(prod.vProd);
    const totalBase = round(subtotal + frete + seguro + outros + ipi - desconto);
    const quantidade = toNumber(prod.qCom || prod.qTrib);

    return {
      numero_item: String(item?.nItem || index + 1),
      codigo_produto_fornecedor: String(prod.cProd || '').trim(),
      descricao: String(prod.xProd || '').trim(),
      unidade: String(prod.uCom || prod.uTrib || '').trim(),
      quantidade,
      valor_unitario_original: round(toNumber(prod.vUnCom || prod.vUnTrib), 6),
      total_base: totalBase,
      detalhes_financeiros: {
        subtotal: round(subtotal),
        frete: round(frete),
        seguro: round(seguro),
        desconto: round(desconto),
        outros: round(outros),
        ipi: round(ipi),
      },
    };
  });

  const valorTotalNota = round(toNumber(totals.vNF));
  const itemsCalculados = distribuirDiferenca(itemsBase, valorTotalNota || round(itemsBase.reduce((acc, item) => acc + item.total_base, 0)));

  return {
    documento: {
      chave_acesso: String(infNFe.Id || '').replace(/^NFe/, ''),
      numero_nf: String(ide.nNF || '').trim(),
      serie: String(ide.serie || '').trim(),
      data_emissao: String(ide.dhEmi || ide.dEmi || '').trim(),
      cnpj_emitente: onlyDigits(emit.CNPJ || emit.CPF),
      nome_emitente: String(emit.xNome || '').trim(),
      valor_total_itens: round(toNumber(totals.vProd) || itemsBase.reduce((acc, item) => acc + item.detalhes_financeiros.subtotal, 0)),
      valor_total_nota: valorTotalNota || round(itemsCalculados.reduce((acc, item) => acc + item.valor_total_final, 0)),
      possui_rateio_nota: Math.abs(round((valorTotalNota || 0) - round(itemsBase.reduce((acc, item) => acc + item.total_base, 0)))) >= 0.01,
    },
    itens: itemsCalculados,
  };
};

const extractFirst = (text, regex) => {
  const match = text.match(regex);
  return match?.[1]?.trim() || '';
};

const parseDanfeItems = (text, totalNota) => {
  const bloco = text.split('DADOS DO PRODUTO / SERVIÇOS')[1]?.split('DADOS ADICIONAIS')[0] || '';
  const lines = bloco
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !/^(NCM|DESCRIÇÃO DO PRODUTO|CÓDIGO DO PROD|DESCONTO|VALOR|ALÍQUOTAS|ICMS|IPI|\/ CST|\/ SERV\.)/i.test(line));

  const itemRegex = /^(?<descricao>.+?)\s+(?<codigo>\d{3,})\s+(?<cfop>\d{4})\s+(?<unidade>[A-Z]{1,6})\s+(?<quantidade>\d[\d.,]*)\s+(?<unitario>\d[\d.,]*)\s+(?<total>\d[\d.,]*)\s+/;

  const itemsBase = [];
  for (const line of lines) {
    const match = line.match(itemRegex);
    if (!match?.groups) continue;

    itemsBase.push({
      numero_item: String(itemsBase.length + 1),
      codigo_produto_fornecedor: match.groups.codigo.trim(),
      descricao: match.groups.descricao.trim(),
      unidade: match.groups.unidade.trim(),
      quantidade: toNumber(match.groups.quantidade),
      valor_unitario_original: round(toNumber(match.groups.unitario), 6),
      total_base: round(toNumber(match.groups.total)),
      detalhes_financeiros: {
        subtotal: round(toNumber(match.groups.total)),
        frete: 0,
        seguro: 0,
        desconto: 0,
        outros: 0,
        ipi: 0,
      },
    });
  }

  return distribuirDiferenca(itemsBase, totalNota || round(itemsBase.reduce((acc, item) => acc + item.total_base, 0)));
};

const parseDanfePdfText = (text) => {
  const normalized = text.replace(/\r/g, '');
  const chaveDigits = extractFirst(normalized, /(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/)
    .replace(/\D/g, '');
  const numeroNf = extractFirst(normalized, /N[ºo]\s*([\d.]+)/i).replace(/\D/g, '');
  const serie = extractFirst(normalized, /SÉRIE\s*([0-9]+)/i);
  const dataEmissao = extractFirst(normalized, /DATA DA EMISSÃO\s*\n?(\d{2}\/\d{2}\/\d{4})/i);
  const nomeEmitente = extractFirst(normalized, /CNPJ \/ CPF\s*\n([^\n]+)/i);
  const cnpjEmitente = extractFirst(normalized, /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/).replace(/\D/g, '');
  const valorTotalProdutos = toNumber(extractFirst(normalized, /VALOR TOTAL DOS PRODUTOS\s*\n?([\d.,]+)/i));
  const valorTotalNota = toNumber(extractFirst(normalized, /VALOR TOTAL DA NOTA\s*\n?([\d.,]+)/i));
  const itens = parseDanfeItems(normalized, valorTotalNota);

  const [dia, mes, ano] = dataEmissao ? dataEmissao.split('/') : [];
  const dataIso = dia && mes && ano ? `${ano}-${mes}-${dia}T00:00:00-03:00` : '';

  return {
    documento: {
      chave_acesso: chaveDigits,
      numero_nf: numeroNf,
      serie,
      data_emissao: dataIso,
      cnpj_emitente: cnpjEmitente || (chaveDigits ? chaveDigits.slice(6, 20) : ''),
      nome_emitente: nomeEmitente,
      valor_total_itens: round(valorTotalProdutos || itens.reduce((acc, item) => acc + item.total_base, 0)),
      valor_total_nota: round(valorTotalNota || itens.reduce((acc, item) => acc + item.valor_total_final, 0)),
      possui_rateio_nota: Math.abs(round((valorTotalNota || 0) - round(itens.reduce((acc, item) => acc + item.total_base, 0)))) >= 0.01,
    },
    itens,
  };
};

const parseDanfePdfBuffer = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      texto_extraido: result.text,
      ...parseDanfePdfText(result.text),
    };
  } finally {
    await parser.destroy();
  }
};

module.exports = {
  onlyDigits,
  parseDanfePdfBuffer,
  parseNfeXml,
  round,
};
